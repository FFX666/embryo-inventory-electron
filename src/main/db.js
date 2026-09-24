"use strict";
/**
 * 数据层：SQLite3（better-sqlite3）
 * 负责建表、种子数据、全部业务 SQL 与日志留痕。
 */
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

let db = null;
let DATA_DIR = "";

/** 密码哈希（scrypt + salt） */
function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

function makeSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function verifyPassword(password, salt, hash) {
  const h = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(hash, "hex"));
}

/** 初始化数据库：路径、建表、种子 */
function initDatabase(dataDir) {
  DATA_DIR = dataDir;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, "backups"), { recursive: true });
  db = new Database(path.join(dataDir, "db.sqlite3"));
  db.pragma("journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON;");
  createTables();
  seedIfEmpty();
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      spec TEXT DEFAULT '',
      manufacturer TEXT DEFAULT '',
      category TEXT DEFAULT '',
      storage_condition TEXT DEFAULT '',
      unit TEXT DEFAULT '瓶',
      purchase_price REAL DEFAULT 0,
      warning_qty REAL DEFAULT 0,
      shelf_no TEXT DEFAULT '',
      sort_no INTEGER DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS stock_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      batch_no TEXT NOT NULL,
      expiry_date TEXT,
      qty REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT '瓶',
      location TEXT DEFAULT '',
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS inbound_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER,
      material_name TEXT DEFAULT '',
      batch_no TEXT,
      expiry_date TEXT,
      qty REAL DEFAULT 0,
      unit TEXT DEFAULT '瓶',
      supplier TEXT DEFAULT '',
      handler TEXT DEFAULT '',
      date TEXT,
      status TEXT DEFAULT '正常',
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS outbound_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER,
      material_name TEXT DEFAULT '',
      batch_id INTEGER,
      batch_no TEXT DEFAULT '',
      qty REAL DEFAULT 0,
      unit TEXT DEFAULT '瓶',
      handler TEXT DEFAULT '',
      checker TEXT DEFAULT '',
      date TEXT,
      reason TEXT DEFAULT '',
      status TEXT DEFAULT '正常',
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS stocktake_diffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER,
      material_name TEXT DEFAULT '',
      batch_no TEXT DEFAULT '',
      book_qty REAL DEFAULT 0,
      actual_qty REAL DEFAULT 0,
      diff REAL DEFAULT 0,
      handler TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      date TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT DEFAULT '',
      display_name TEXT DEFAULT '',
      module TEXT DEFAULT '',
      action TEXT DEFAULT '',
      target TEXT DEFAULT '',
      detail TEXT DEFAULT '',
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS dropdown_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      sort_no INTEGER DEFAULT 0
    );
  `);
}

/** 当前时间（本地） */
function now() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 今日日期字符串 */
function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 写操作日志 */
function log(user, module, action, target, detail) {
  const u = user || { username: "-", display_name: "系统" };
  db.prepare(
    "INSERT INTO operation_logs (username, display_name, module, action, target, detail, created_at) VALUES (?,?,?,?,?,?,?)"
  ).run(u.username, u.display_name, module, action, target || "", detail || "", now());
}

/** 权限校验 */
function canWrite(user) {
  return user && ["admin", "operator"].includes(user.role);
}
function isAdmin(user) {
  return user && user.role === "admin";
}

/** 种子数据（首次运行） */
function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (count > 0) return;

  const seedAccounts = [
    ["2001", "黎铁娥", "operator"],
    ["2002", "刘婕", "admin"],
    ["2003", "朱娜娜", "operator"],
    ["2004", "张乐华", "admin"],
    ["2005", "王静", "viewer"],
  ];
  const insUser = db.prepare(
    "INSERT INTO users (username, display_name, role, salt, password_hash, enabled) VALUES (?,?,?,?,?,1)"
  );
  for (const [u, n, r] of seedAccounts) {
    const salt = makeSalt();
    insUser.run(u, n, r, salt, hashPassword("123456", salt));
  }

  const seedDropdowns = [
    ["分类", "培养试剂", 0], ["分类", "冷冻复苏", 1], ["分类", "辅助试剂", 2],
    ["分类", "培养耗材", 3], ["分类", "常用耗材", 4], ["分类", "非常用耗材", 5],
    ["分类", "气体", 6], ["分类", "其他", 7],
    ["储存条件", "常温", 0], ["储存条件", "冷藏", 1], ["储存条件", "冷藏-20℃", 2],
    ["储存条件", "冷冻", 3], ["储存条件", "液氮", 4], ["储存条件", "冰箱", 5],
    ["货架", "冰箱", 0], ["货架", "耗材间", 1], ["货架", "液氮室", 2],
  ];
  const insOpt = db.prepare(
    "INSERT INTO dropdown_options (type, value, sort_no) VALUES (?,?,?)"
  );
  for (const [t, v, s] of seedDropdowns) insOpt.run(t, v, s);

  const seedMaterials = [
    ["G1-001", "卵裂胚培养液(G1 PLUS)", "10ml/瓶", "Vitrolife", "培养试剂", "冰箱", "瓶", 0, 2, "冰箱", 1],
    ["G2-001", "囊胚培养液(G2 PLUS)", "10ml/瓶", "Vitrolife", "培养试剂", "冰箱", "瓶", 0, 2, "冰箱", 2],
    ["G3-001", "胚胎培养油", "50ml/瓶", "Vitrolife", "培养试剂", "常温", "瓶", 0, 1, "耗材间", 3],
    ["T1-001", "玻璃化冷冻液套装", "1套", "Kitazato", "冷冻复苏", "液氮", "套", 0, 1, "液氮室", 4],
    ["T2-001", "玻璃化解冻液套装", "1套", "Kitazato", "冷冻复苏", "液氮", "套", 0, 1, "液氮室", 5],
    ["S1-001", "精子洗涤液", "30ml/瓶", "Irvine", "辅助试剂", "冰箱", "瓶", 0, 2, "冰箱", 6],
    ["S2-001", "精子梯度分离液", "50ml/瓶", "Irvine", "辅助试剂", "冰箱", "瓶", 0, 2, "冰箱", 7],
    ["D1-001", "ICSI操作皿", "60mm", "Corning", "培养耗材", "常温", "个", 0, 10, "耗材间", 8],
    ["D2-001", "四孔培养皿", "4孔", "Corning", "培养耗材", "常温", "个", 0, 10, "耗材间", 9],
    ["P1-001", "移液管 1ml", "1ml", "BD", "常用耗材", "常温", "支", 0, 20, "耗材间", 10],
    ["P2-001", "无菌手套", "M号", "国产", "常用耗材", "常温", "盒", 0, 5, "耗材间", 11],
    ["P3-001", "口罩", "医用", "国产", "常用耗材", "常温", "盒", 0, 5, "耗材间", 12],
    ["P4-001", "酒精棉片", "50片/盒", "国产", "常用耗材", "常温", "盒", 0, 5, "耗材间", 13],
    ["M1-001", "一次性试管", "15ml", "Corning", "非常用耗材", "常温", "支", 0, 10, "耗材间", 14],
    ["M2-001", "离心管", "5ml", "Corning", "非常用耗材", "常温", "支", 0, 10, "耗材间", 15],
    ["G4-001", "培养箱气体(CO2)", "40L", "气体供应商", "气体", "常温", "瓶", 0, 1, "耗材间", 16],
    ["G5-001", "液氮", "175L", "气体供应商", "气体", "液氮", "罐", 0, 1, "液氮室", 17],
    ["C1-001", "精子浓度计数板", "10片/盒", "国产", "辅助试剂", "常温", "盒", 0, 2, "耗材间", 18],
    ["C2-001", "pH试纸", "80条/盒", "国产", "常用耗材", "常温", "盒", 0, 2, "耗材间", 19],
    ["E1-001", "胚胎冷冻标签纸", "100张/卷", "国产", "常用耗材", "常温", "卷", 0, 3, "耗材间", 20],
    ["E2-001", "记号笔", "黑色", "国产", "常用耗材", "常温", "支", 0, 5, "耗材间", 21],
  ];
  const insMat = db.prepare(`
    INSERT INTO materials (code, name, spec, manufacturer, category, storage_condition, unit, purchase_price, warning_qty, shelf_no, sort_no, enabled)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,1)
  `);
  for (const m of seedMaterials) insMat.run(...m);

  // 演示入库（7 条）
  const admin = db.prepare("SELECT * FROM users WHERE username='2002'").get();
  const seedIn = [
    [1, "G1-2601", "2026-10-14", 2, "瓶", "Vitrolife", "刘婕"],
    [2, "G2-2602", "2026-11-20", 3, "瓶", "Vitrolife", "刘婕"],
    [3, "G3-2603", "2027-01-15", 4, "瓶", "Vitrolife", "刘婕"],
    [4, "T1-2604", "2026-12-31", 2, "套", "Kitazato", "刘婕"],
    [5, "T2-2605", "2026-12-31", 2, "套", "Kitazato", "刘婕"],
    [6, "S1-2606", "2026-09-30", 3, "瓶", "Irvine", "刘婕"],
    [7, "S2-2607", "2027-02-28", 3, "瓶", "Irvine", "刘婕"],
  ];
  for (const [mid, batch, exp, qty, unit, sup, handler] of seedIn) {
    const mat = db.prepare("SELECT * FROM materials WHERE id=?").get(mid);
    db.prepare(
      "INSERT INTO stock_batches (material_id, batch_no, expiry_date, qty, unit, location, created_at) VALUES (?,?,?,?,?,?,?)"
    ).run(mid, batch, exp, qty, unit, mat.shelf_no || "冰箱", now());
    db.prepare(
      "INSERT INTO inbound_records (material_id, material_name, batch_no, expiry_date, qty, unit, supplier, handler, date, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).run(mid, mat.name, batch, exp, qty, unit, sup, handler, today(), "正常", now());
  }
  log(admin, "入库管理", "种子数据", "系统初始化", "创建演示入库记录");

  // 演示出库（FEFO 推荐）
  const g1 = db.prepare("SELECT * FROM materials WHERE code='G1-001'").get();
  const rec = recommendBatches(g1.id);
  if (rec.length) {
    addOutbound(admin, {
      material_id: g1.id,
      batch_id: rec[0].id,
      qty: 1,
      unit: g1.unit,
      handler: "刘婕",
      checker: "张乐华",
      date: today(),
      reason: "取用",
    });
  }
}

/* ================= 用户与登录 ================= */

function login(username, password) {
  const u = db.prepare("SELECT * FROM users WHERE username=?").get(String(username).trim());
  if (!u || !u.enabled) return { ok: false, msg: "账号不存在或已停用" };
  if (!verifyPassword(password, u.salt, u.password_hash)) return { ok: false, msg: "密码错误" };
  log(u, "账号权限", "登录", "登录系统", `账号:${u.display_name},角色:${roleName(u.role)}`);
  return { ok: true, user: publicUser(u) };
}

function roleName(role) {
  return { admin: "管理员", operator: "普通入库员", viewer: "只读查看员" }[role] || role;
}

function publicUser(u) {
  return { id: u.id, username: u.username, display_name: u.display_name, role: u.role, role_name: roleName(u.role) };
}

function listUsers() {
  return db
    .prepare("SELECT id, username, display_name, role, enabled FROM users ORDER BY username")
    .all()
    .map((u) => ({ ...u, role_name: roleName(u.role) }));
}

function saveUser(user, payload) {
  if (!isAdmin(user)) return { ok: false, msg: "无权限：仅管理员可管理账号" };
  const { id, username, display_name, role, password, enabled } = payload;
  if (!username || !display_name || !role) return { ok: false, msg: "请填写完整信息" };
  if (id) {
    const existing = db.prepare("SELECT * FROM users WHERE id=?").get(id);
    if (!existing) return { ok: false, msg: "账号不存在" };
    if (password) {
      const salt = makeSalt();
      db.prepare("UPDATE users SET username=?, display_name=?, role=?, salt=?, password_hash=?, enabled=? WHERE id=?")
        .run(username, display_name, role, salt, hashPassword(password, salt), enabled ? 1 : 0, id);
    } else {
      db.prepare("UPDATE users SET username=?, display_name=?, role=?, enabled=? WHERE id=?")
        .run(username, display_name, role, enabled ? 1 : 0, id);
    }
    log(user, "账号权限", "修改账号", `User ${id}`, `账号:${display_name},角色:${roleName(role)}`);
  } else {
    if (db.prepare("SELECT 1 FROM users WHERE username=?").get(username)) return { ok: false, msg: "工号已存在" };
    const salt = makeSalt();
    const r = db.prepare(
      "INSERT INTO users (username, display_name, role, salt, password_hash, enabled) VALUES (?,?,?,?,?,?)"
    ).run(username, display_name, role, salt, hashPassword(password || "123456", salt), enabled ? 1 : 0);
    log(user, "账号权限", "新增账号", `User ${r.lastInsertRowid}`, `账号:${display_name},角色:${roleName(role)}`);
  }
  return { ok: true };
}

function changePassword(user, oldPwd, newPwd) {
  const u = db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
  if (!verifyPassword(oldPwd, u.salt, u.password_hash)) return { ok: false, msg: "原密码错误" };
  if (!newPwd || String(newPwd).length < 4) return { ok: false, msg: "新密码至少 4 位" };
  const salt = makeSalt();
  db.prepare("UPDATE users SET salt=?, password_hash=? WHERE id=?").run(salt, hashPassword(newPwd, salt), user.id);
  log(user, "账号权限", "修改密码", `User ${user.id}`, "修改登录密码");
  return { ok: true };
}

/* ================= 下拉选项 ================= */

function listOptions() {
  return db.prepare("SELECT type, value, sort_no FROM dropdown_options ORDER BY type, sort_no").all();
}
function getOptions(type) {
  return db.prepare("SELECT value FROM dropdown_options WHERE type=? ORDER BY sort_no").all().map((r) => r.value);
}
function saveOption(user, type, values) {
  if (!isAdmin(user)) return { ok: false, msg: "无权限：仅管理员可维护选项" };
  db.prepare("DELETE FROM dropdown_options WHERE type=?").run(type);
  const ins = db.prepare("INSERT INTO dropdown_options (type, value, sort_no) VALUES (?,?,?)");
  String(values || "")
    .split(/[\n,，]/)
    .map((v) => v.trim())
    .filter(Boolean)
    .forEach((v, i) => ins.run(type, v, i));
  log(user, "系统设置", "维护选项", type, `更新下拉选项 ${type}`);
  return { ok: true };
}

/* ================= 基础档案 ================= */

function listMaterials(onlyEnabled) {
  return db
    .prepare(
      `SELECT m.*,
        (SELECT COALESCE(SUM(qty),0) FROM stock_batches b WHERE b.material_id=m.id AND b.qty>0) AS stock_qty
       FROM materials m ${onlyEnabled ? "WHERE m.enabled=1" : ""} ORDER BY m.sort_no, m.id`
    )
    .all();
}

function saveMaterial(user, payload) {
  if (!canWrite(user)) return { ok: false, msg: "无权限：当前账号为只读" };
  const { id, code, name, spec, manufacturer, category, storage_condition, unit, purchase_price, warning_qty, shelf_no, sort_no } = payload;
  if (!name) return { ok: false, msg: "耗材名称必填" };
  if (id) {
    db.prepare(
      `UPDATE materials SET code=?, name=?, spec=?, manufacturer=?, category=?, storage_condition=?, unit=?, purchase_price=?, warning_qty=?, shelf_no=?, sort_no=? WHERE id=?`
    ).run(code || "", name, spec || "", manufacturer || "", category || "", storage_condition || "", unit || "瓶",
      Number(purchase_price) || 0, Number(warning_qty) || 0, shelf_no || "", Number(sort_no) || 0, id);
    log(user, "基础档案", "修改", `Material ${id}`, name);
  } else {
    const r = db.prepare(
      `INSERT INTO materials (code, name, spec, manufacturer, category, storage_condition, unit, purchase_price, warning_qty, shelf_no, sort_no, enabled) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`
    ).run(code || "", name, spec || "", manufacturer || "", category || "", storage_condition || "", unit || "瓶",
      Number(purchase_price) || 0, Number(warning_qty) || 0, shelf_no || "", Number(sort_no) || 0);
    log(user, "基础档案", "新增", `Material ${r.lastInsertRowid}`, name);
  }
  return { ok: true };
}

function toggleMaterial(user, id) {
  if (!canWrite(user)) return { ok: false, msg: "无权限：当前账号为只读" };
  const m = db.prepare("SELECT * FROM materials WHERE id=?").get(id);
  if (!m) return { ok: false, msg: "档案不存在" };
  const v = m.enabled ? 0 : 1;
  db.prepare("UPDATE materials SET enabled=? WHERE id=?").run(v, id);
  log(user, "基础档案", v ? "启用" : "停用", `Material ${id}`, m.name);
  return { ok: true };
}

/* ================= 入库 ================= */

function addInbound(user, p) {
  if (!canWrite(user)) return { ok: false, msg: "无权限：当前账号为只读" };
  const mat = db.prepare("SELECT * FROM materials WHERE id=?").get(Number(p.material_id));
  if (!mat) return { ok: false, msg: "请选择耗材" };
  if (!p.batch_no) return { ok: false, msg: "批号必填" };
  const qty = Number(p.qty);
  if (!(qty > 0)) return { ok: false, msg: "数量必须大于 0" };
  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO stock_batches (material_id, batch_no, expiry_date, qty, unit, location, created_at) VALUES (?,?,?,?,?,?,?)"
    ).run(mat.id, p.batch_no, p.expiry_date || "", qty, mat.unit, mat.shelf_no || "", now());
    const r = db.prepare(
      "INSERT INTO inbound_records (material_id, material_name, batch_no, expiry_date, qty, unit, supplier, handler, date, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).run(mat.id, mat.name, p.batch_no, p.expiry_date || "", qty, mat.unit, p.supplier || "", p.handler || user.display_name,
      p.date || today(), "正常", now());
    log(user, "入库管理", "新增", `InboundRecord ${r.lastInsertRowid}`, `${mat.name} 批号:${p.batch_no} 数量:${qty}`);
  });
  tx();
  return { ok: true };
}

function voidInbound(user, id) {
  if (!canWrite(user)) return { ok: false, msg: "无权限：当前账号为只读" };
  const rec = db.prepare("SELECT * FROM inbound_records WHERE id=?").get(id);
  if (!rec) return { ok: false, msg: "记录不存在" };
  db.prepare("UPDATE inbound_records SET status='作废' WHERE id=?").run(id);
  // 同时扣减对应批次库存（演示简化：按批号+材料匹配）
  db.prepare("UPDATE stock_batches SET qty = MAX(0, qty - ?) WHERE material_id=? AND batch_no=?").run(rec.qty, rec.material_id, rec.batch_no);
  log(user, "入库管理", "作废", `InboundRecord ${id}`, `${rec.material_name} 批号:${rec.batch_no}`);
  return { ok: true };
}

function listInbound() {
  return db.prepare("SELECT * FROM inbound_records ORDER BY date DESC, id DESC LIMIT 200").all();
}

/* ================= 出库（FEFO 推荐） ================= */

function recommendBatches(materialId) {
  const todayStr = today();
  return db
    .prepare(
      `SELECT b.*, m.name AS material_name, m.unit AS unit,
              CASE WHEN b.expiry_date < ? THEN 1 ELSE 0 END AS expired
       FROM stock_batches b JOIN materials m ON m.id=b.material_id
       WHERE b.material_id=? AND b.qty>0
       ORDER BY expired ASC, b.expiry_date ASC, b.id ASC`
    )
    .all(todayStr, Number(materialId));
}

function addOutbound(user, p) {
  if (!canWrite(user)) return { ok: false, msg: "无权限：当前账号为只读" };
  const mat = db.prepare("SELECT * FROM materials WHERE id=?").get(Number(p.material_id));
  if (!mat) return { ok: false, msg: "请选择耗材" };
  const batch = db.prepare("SELECT * FROM stock_batches WHERE id=?").get(Number(p.batch_id));
  if (!batch || batch.qty <= 0) return { ok: false, msg: "请选择有效批次" };
  const qty = Number(p.qty);
  if (!(qty > 0)) return { ok: false, msg: "数量必须大于 0" };
  if (qty > batch.qty) return { ok: false, msg: `库存不足，该批次仅剩 ${batch.qty}` };
  const tx = db.transaction(() => {
    db.prepare("UPDATE stock_batches SET qty = qty - ? WHERE id=?").run(qty, batch.id);
    const r = db.prepare(
      `INSERT INTO outbound_records (material_id, material_name, batch_id, batch_no, qty, unit, handler, checker, date, reason, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(mat.id, mat.name, batch.id, batch.batch_no, qty, mat.unit, p.handler || user.display_name,
      p.checker || "", p.date || today(), p.reason || "", "正常", now());
    log(user, "出库领用", "新增", `OutboundRecord ${r.lastInsertRowid}`, `${mat.name} 批号:${batch.batch_no} 数量:${qty}`);
  });
  tx();
  return { ok: true };
}

function voidOutbound(user, id) {
  if (!canWrite(user)) return { ok: false, msg: "无权限：当前账号为只读" };
  const rec = db.prepare("SELECT * FROM outbound_records WHERE id=?").get(id);
  if (!rec) return { ok: false, msg: "记录不存在" };
  db.prepare("UPDATE outbound_records SET status='作废' WHERE id=?").run(id);
  db.prepare("UPDATE stock_batches SET qty = qty + ? WHERE id=?").run(rec.qty, rec.batch_id);
  log(user, "出库领用", "作废", `OutboundRecord ${id}`, `${rec.material_name} 批号:${rec.batch_no}`);
  return { ok: true };
}

function listOutbound() {
  return db.prepare("SELECT * FROM outbound_records ORDER BY date DESC, id DESC LIMIT 200").all();
}

/* ================= 盘点 ================= */

function stockTable() {
  return db
    .prepare(
      `SELECT m.id AS material_id, m.code, m.name, m.spec, m.unit, m.shelf_no, m.warning_qty,
              b.id AS batch_id, b.batch_no, b.expiry_date, b.qty,
              (b.expiry_date IS NOT NULL AND b.expiry_date < ?) AS expired,
              (b.expiry_date IS NOT NULL AND b.expiry_date >= ? AND b.expiry_date <= date(?, '+30 day')) AS near
       FROM materials m LEFT JOIN stock_batches b ON b.material_id=m.id AND b.qty>0
       WHERE m.enabled=1
       ORDER BY m.sort_no, m.id, b.expiry_date`
    )
    .all(today(), today(), today());
}

function doStocktakeFix(user, p) {
  if (!canWrite(user)) return { ok: false, msg: "无权限：当前账号为只读" };
  const mat = db.prepare("SELECT * FROM materials WHERE id=?").get(Number(p.material_id));
  if (!mat) return { ok: false, msg: "请选择耗材" };
  const book = Number(p.book_qty) || 0;
  const actual = Number(p.actual_qty) || 0;
  const diff = Number((actual - book).toFixed(3));
  if (diff === 0) return { ok: false, msg: "账面与实盘一致，无需记录" };
  const tx = db.transaction(() => {
    if (p.batch_no) {
      const b = db.prepare("SELECT * FROM stock_batches WHERE material_id=? AND batch_no=?").get(mat.id, p.batch_no);
      if (b) {
        db.prepare("UPDATE stock_batches SET qty = MAX(0, ?) WHERE id=?").run(actual, b.id);
      }
    }
    const r = db.prepare(
      `INSERT INTO stocktake_diffs (material_id, material_name, batch_no, book_qty, actual_qty, diff, handler, reason, date, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(mat.id, mat.name, p.batch_no || "", book, actual, diff, p.handler || user.display_name, p.reason || "", p.date || today(), now());
    log(user, "库存盘点", "盘点修正", `StocktakeDiff ${r.lastInsertRowid}`, `${mat.name} 差异:${diff > 0 ? "+" : ""}${diff}`);
  });
  tx();
  return { ok: true };
}

function listDiffs() {
  return db.prepare("SELECT * FROM stocktake_diffs ORDER BY date DESC, id DESC LIMIT 100").all();
}

/* ================= 查询中心 ================= */

function queryRecords(f) {
  const where = [];
  const args = [];
  if (f.name) { where.push("(material_name LIKE ? OR batch_no LIKE ?)"); args.push(`%${f.name}%`, `%${f.name}%`); }
  if (f.category) { where.push("material_id IN (SELECT id FROM materials WHERE category=?)"); args.push(f.category); }
  if (f.handler) { where.push("handler LIKE ?"); args.push(`%${f.handler}%`); }
  if (f.dateFrom) { where.push("date >= ?"); args.push(f.dateFrom); }
  if (f.dateTo) { where.push("date <= ?"); args.push(f.dateTo); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const inbound = db.prepare(`SELECT * FROM inbound_records ${w} ORDER BY date DESC, id DESC LIMIT 200`).all(...args);
  const outbound = db.prepare(`SELECT * FROM outbound_records ${w} ORDER BY date DESC, id DESC LIMIT 200`).all(...args);
  return { inbound, outbound };
}

/* ================= 报表导出数据 ================= */

function reportMaterials() { return listMaterials(false); }
function reportInbound() { return listInbound(); }
function reportOutbound() { return listOutbound(); }
function reportStock() {
  return db
    .prepare(
      `SELECT m.code, m.name, m.spec, m.unit, b.batch_no, b.expiry_date, b.qty, b.location, m.warning_qty
       FROM materials m LEFT JOIN stock_batches b ON b.material_id=m.id AND b.qty>0
       WHERE m.enabled=1 ORDER BY m.sort_no, m.id, b.expiry_date`
    )
    .all();
}
function reportDiffs() { return listDiffs(); }
function reportLogs() { return db.prepare("SELECT * FROM operation_logs ORDER BY id DESC LIMIT 1000").all(); }

/* ================= 操作日志 ================= */

function listLogs(f) {
  const where = [];
  const args = [];
  if (f && f.module) { where.push("module=?"); args.push(f.module); }
  if (f && f.keyword) { where.push("(username LIKE ? OR display_name LIKE ? OR detail LIKE ?)"); args.push(`%${f.keyword}%`, `%${f.keyword}%`, `%${f.keyword}%`); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  return db.prepare(`SELECT * FROM operation_logs ${w} ORDER BY id DESC LIMIT 500`).all(...args);
}

/* ================= 工作台统计 ================= */

function dashboardStats() {
  const t = today();
  const materials = db.prepare("SELECT COUNT(*) AS c FROM materials WHERE enabled=1").get().c;
  const low = db.prepare(
    `SELECT COUNT(*) AS c FROM (
       SELECT m.id, COALESCE(SUM(b.qty),0) AS total FROM materials m
       LEFT JOIN stock_batches b ON b.material_id=m.id AND b.qty>0
       WHERE m.enabled=1 GROUP BY m.id HAVING total < m.warning_qty AND m.warning_qty > 0)`
  ).get().c;
  const near = db.prepare(
    "SELECT COUNT(*) AS c FROM stock_batches WHERE qty>0 AND expiry_date >= ? AND expiry_date <= date(?, '+30 day')"
  ).get(t, t).c;
  const expired = db.prepare("SELECT COUNT(*) AS c FROM stock_batches WHERE qty>0 AND expiry_date < ?").get(t).c;
  const todayOps = db.prepare("SELECT COUNT(*) AS c FROM operation_logs WHERE date(created_at)=?").get(t).c;
  return { materials, low, near, expired, todayOps };
}

/* ================= 备份恢复 ================= */

function backup(user) {
  if (!isAdmin(user)) return { ok: false, msg: "无权限：仅管理员可备份" };
  const dbPath = path.join(DATA_DIR, "db.sqlite3");
  // WAL 模式下先把 WAL 合并进主库文件，否则备份会缺失最新数据
  db.pragma("wal_checkpoint(TRUNCATE)");
  const stamp =
    today().replace(/-/g, "") + "_" + now().slice(11, 19).replace(/:/g, "") + "_" + String(Date.now()).slice(-3);
  const dest = path.join(DATA_DIR, "backups", `db_backup_${stamp}.sqlite3`);
  fs.copyFileSync(dbPath, dest);
  log(user, "备份恢复", "备份", "数据库", `已备份至 ${path.basename(dest)}`);
  return { ok: true, file: path.basename(dest) };
}

function listBackups() {
  const dir = path.join(DATA_DIR, "backups");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".sqlite3")).map((f) => {
    const st = fs.statSync(path.join(dir, f));
    return { file: f, size: st.size, mtime: new Date(st.mtime).toLocaleString("zh-CN") };
  }).sort((a, b) => b.file.localeCompare(a.file));
}

function restore(user, file) {
  if (!isAdmin(user)) return { ok: false, msg: "无权限：仅管理员可恢复" };
  const src = path.join(DATA_DIR, "backups", file);
  if (!fs.existsSync(src)) return { ok: false, msg: "备份文件不存在" };
  const dbPath = path.join(DATA_DIR, "db.sqlite3");
  const stamp =
    today().replace(/-/g, "") + "_" + now().slice(11, 19).replace(/:/g, "") + "_" + String(Date.now()).slice(-3);
  // 恢复前自动备份当前库
  db.pragma("wal_checkpoint(TRUNCATE)");
  fs.copyFileSync(dbPath, path.join(DATA_DIR, "backups", `db_before_restore_${stamp}.sqlite3`));
  // 安全恢复：关闭旧连接（含删除 WAL）后替换文件再重开
  db.close();
  for (const suffix of ["-wal", "-shm"]) {
    try { fs.rmSync(dbPath + suffix, { force: true }); } catch (_) { /* 忽略 */ }
  }
  fs.copyFileSync(src, dbPath);
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON;");
  return { ok: true, msg: `已恢复 ${file}` };
}

function getDb() {
  return db;
}

module.exports = {
  initDatabase, getDb,
  login, listUsers, saveUser, changePassword,
  listOptions, getOptions, saveOption,
  listMaterials, saveMaterial, toggleMaterial,
  addInbound, voidInbound, listInbound,
  recommendBatches, addOutbound, voidOutbound, listOutbound,
  stockTable, doStocktakeFix, listDiffs,
  queryRecords,
  reportMaterials, reportInbound, reportOutbound, reportStock, reportDiffs, reportLogs,
  listLogs, dashboardStats,
  backup, listBackups, restore,
  canWrite, isAdmin, now, today,
};
