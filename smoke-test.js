// 数据层冒烟测试：不依赖 Electron，直接验证 db.js 全部业务逻辑
const path = require("path");
const fs = require("fs");
const os = require("os");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "embryo-test-"));
const db = require(path.join(__dirname, "src", "main", "db.js"));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log("  ✔", name); }
  else { fail++; console.log("  ✘ FAIL:", name); }
}

(async () => {
  console.log("== 初始化 ==");
  db.initDatabase(tmp);

  const admin = db.login("2002", "123456");
  ok(admin.ok && admin.user.role === "admin", "管理员登录 2002/123456");
  ok(db.login("2005", "123456").ok && db.login("2005", "123456").user.role === "viewer", "viewer 登录");
  ok(!db.login("2002", "bad").ok, "错误密码拒绝");

  const operator = db.login("2001", "123456").user;

  console.log("== 基础档案 ==");
  const mats = db.listMaterials(false);
  ok(mats.length >= 20, "种子档案 ≥20 条，实际 " + mats.length);
  const m0 = mats[0];

  console.log("== 入库 ==");
  const inR = db.addInbound(operator, { material_id: m0.id, batch_no: "TEST-001", expiry_date: "2027-06-30", qty: 10, unit: m0.unit, supplier: "测试供应商", handler: "黎铁娥", date: "2026-09-24" });
  ok(inR.ok, "新增入库成功");
  const testBatch = db.stockTable().find(r => r.batch_no === "TEST-001");
  ok(testBatch && testBatch.qty === 10, "入库后 TEST-001 批次库存 10，实际 " + (testBatch && testBatch.qty));

  console.log("== 出库 FEFO ==");
  db.addInbound(operator, { material_id: m0.id, batch_no: "TEST-002", expiry_date: "2027-01-15", qty: 10, unit: m0.unit, supplier: "T", handler: "黎铁娥", date: "2026-09-24" });
  const rec = db.recommendBatches(m0.id);
  ok(rec.length >= 3, "推荐批次返回多个，实际 " + rec.length);
  const expiries = rec.map(r => r.expiry_date);
  ok(expiries.every((d, i) => i === 0 || expiries[i - 1] <= d), "FEFO：推荐批次按效期升序排列");
  // 种子 G1-2601 效期 2026-10-14 最近 → 应排第一
  ok(rec[0].expiry_date === "2026-10-14", "FEFO 首选效期最近批次，实际 " + rec[0].expiry_date);
  const outR = db.addOutbound(operator, { material_id: m0.id, batch_id: rec[0].id, qty: 1, unit: m0.unit, handler: "黎铁娥", checker: "刘婕", reason: "实验领用", date: "2026-09-24" });
  ok(outR.ok, "出库成功");
  // 种子初始化已对 G1-2601 演示出库 1（剩 1），本次再出 1 → 清零，库存表不再显示该批次
  const st = db.stockTable().find(r => r.batch_id === rec[0].id);
  ok(!st, "G1-2601 出库 1 后批次清零（qty=0 从库存表消失）");

  console.log("== 作废回补 ==");
  const outId = db.listOutbound().find(r => r.status === "正常").id;
  ok(db.voidOutbound(operator, outId).ok, "出库作废成功");
  const st2 = db.stockTable().find(r => r.batch_id === rec[0].id);
  ok(st2 && st2.qty === 1, "作废后批次库存回补 1，实际 " + (st2 && st2.qty));

  console.log("== 盘点 ==");
  const bookRow = db.stockTable().find(r => r.batch_id === rec[0].id);
  const fixR = db.doStocktakeFix(operator, { material_id: m0.id, batch_no: "G1-2601", book_qty: bookRow.qty, actual_qty: bookRow.qty - 1, handler: "黎铁娥", reason: "盘点测试", date: "2026-09-24" });
  ok(fixR.ok, "盘点修正成功");
  const diffRows = db.listDiffs();
  ok(diffRows.length >= 1 && diffRows[0].diff === -1, "差异记录 -1");

  console.log("== 权限 ==");
  const viewer = db.login("2005", "123456").user;
  ok(!db.addInbound(viewer, {}).ok, "viewer 入库被拒");
  ok(!db.addOutbound(viewer, {}).ok, "viewer 出库被拒");
  ok(!db.doStocktakeFix(viewer, {}).ok, "viewer 盘点被拒");
  ok(!db.saveUser(operator, { username: "NEW1", display_name: "新人", role: "operator", password: "123456" }).ok, "operator 建账号被拒（仅 admin）");

  console.log("== 日志 ==");
  const logs = db.listLogs({});
  ok(logs.length >= 8, "日志留痕 ≥8 条，实际 " + logs.length);

  console.log("== 备份恢复 ==");
  const adminUser = admin.user;
  const bk = db.backup(adminUser);
  ok(bk.ok && fs.existsSync(path.join(tmp, "backups", bk.file)), "备份文件已生成");
  const bk2 = db.backup(adminUser);
  ok(bk.file !== bk2.file, "备份文件名不重复（含毫秒）");
  ok(db.restore(adminUser, bk2.file).ok, "恢复成功（自动先备份）");
  ok(db.login("2002", "123456").ok, "恢复后数据库可正常登录");

  console.log("== 导出数据 ==");
  const sheets = {
    materials: db.listMaterials(false),
    inbound: db.listInbound(),
    outbound: db.listOutbound(),
    stock: db.stockTable(),
    diffs: db.listDiffs(),
    logs: db.listLogs({}),
  };
  ok(Object.keys(sheets).every(k => Array.isArray(sheets[k]) && sheets[k].length > 0), "6 张报表数据齐备");
  const exporter = require(path.join(__dirname, "src", "main", "exporter.js"));
  const xlsxBuf = exporter.buildSheetBuffer(
    [{ key: "name", title: "耗材名称", width: 20 }],
    [{ name: "G-1" }],
    "测试"
  );
  ok(xlsxBuf.length > 0, "xlsx 报表 Buffer 生成成功");

  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("异常:", e); process.exit(1); });
