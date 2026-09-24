<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";

const data = ref({});
const loading = ref(false);

onMounted(async () => {
  await Promise.all([
    window.api.materials.list().then((v) => (data.value.materials = v)),
    window.api.inbound.list().then((v) => (data.value.inbound = v)),
    window.api.outbound.list().then((v) => (data.value.outbound = v)),
    window.api.stock.table().then((v) => (data.value.stock = v)),
    window.api.stock.diffs().then((v) => (data.value.diffs = v)),
    window.api.logs.list().then((v) => (data.value.logs = v)),
  ]);
});

const colDefs = {
  materials: { title: "基础档案", cols: [
    { key: "code", title: "编号", width: 14 }, { key: "name", title: "耗材名称", width: 22 },
    { key: "spec", title: "规格型号", width: 14 }, { key: "manufacturer", title: "生产厂家", width: 18 },
    { key: "category", title: "分类", width: 12 }, { key: "storage_condition", title: "储存条件", width: 12 },
    { key: "unit", title: "单位", width: 8 }, { key: "shelf_no", title: "货架位置", width: 12 },
    { key: "warning_qty", title: "预警数量", width: 10 }, { key: "enabled", title: "状态", width: 8 },
  ] },
  inbound: { title: "入库表", cols: [
    { key: "date", title: "日期", width: 12 }, { key: "material_name", title: "耗材名称", width: 20 },
    { key: "batch_no", title: "批号", width: 14 }, { key: "expiry_date", title: "有效期", width: 12 },
    { key: "qty", title: "数量", width: 8 }, { key: "unit", title: "单位", width: 8 },
    { key: "supplier", title: "供应商", width: 16 }, { key: "handler", title: "经手人", width: 10 },
    { key: "status", title: "状态", width: 8 },
  ] },
  outbound: { title: "出库表", cols: [
    { key: "date", title: "日期", width: 12 }, { key: "material_name", title: "耗材名称", width: 20 },
    { key: "batch_no", title: "批号", width: 14 }, { key: "qty", title: "数量", width: 8 },
    { key: "unit", title: "单位", width: 8 }, { key: "handler", title: "经手人", width: 10 },
    { key: "checker", title: "核对人", width: 10 }, { key: "reason", title: "领用原因", width: 16 },
    { key: "status", title: "状态", width: 8 },
  ] },
  stock: { title: "库存总表", cols: [
    { key: "code", title: "编号", width: 12 }, { key: "name", title: "耗材名称", width: 20 },
    { key: "spec", title: "规格型号", width: 14 }, { key: "batch_no", title: "批号", width: 14 },
    { key: "expiry_date", title: "有效期", width: 12 }, { key: "qty", title: "库存数量", width: 10 },
    { key: "unit", title: "单位", width: 8 }, { key: "shelf_no", title: "货架位置", width: 12 },
    { key: "warning_qty", title: "预警数量", width: 10 },
  ] },
  diffs: { title: "盘点差异表", cols: [
    { key: "date", title: "日期", width: 12 }, { key: "material_name", title: "耗材名称", width: 20 },
    { key: "batch_no", title: "批号", width: 14 }, { key: "book_qty", title: "账面数量", width: 10 },
    { key: "actual_qty", title: "实盘数量", width: 10 }, { key: "diff", title: "差异", width: 10 },
    { key: "handler", title: "经手人", width: 10 }, { key: "reason", title: "差异原因", width: 18 },
  ] },
  logs: { title: "操作日志", cols: [
    { key: "created_at", title: "时间", width: 18 }, { key: "username", title: "工号", width: 10 },
    { key: "display_name", title: "姓名", width: 10 }, { key: "module", title: "模块", width: 12 },
    { key: "action", title: "操作", width: 10 }, { key: "target", title: "对象", width: 16 },
    { key: "detail", title: "详情", width: 36 },
  ] },
};

const exportItems = [
  { key: "materials", label: "基础档案", desc: "全部耗材档案" },
  { key: "inbound", label: "入库表", desc: "入库记录" },
  { key: "outbound", label: "出库表", desc: "出库领用记录（可追溯批号）" },
  { key: "stock", label: "库存总表", desc: "批次实时库存" },
  { key: "diffs", label: "盘点差异表", desc: "盘点差异记录" },
  { key: "logs", label: "操作日志", desc: "全部操作留痕" },
];

async function exportOne(item) {
  const d = colDefs[item.key];
  const r = await window.api.export.workbook(
    { sheetName: d.title, columns: d.cols, rows: data.value[item.key] || [] },
    `${d.title}.xlsx`
  );
  if (r.ok) ElMessage.success(`已导出：${r.path}`);
  else if (r.msg !== "已取消") ElMessage.error(r.msg);
}

async function exportAll() {
  loading.value = true;
  const files = exportItems.map((it) => ({
    name: colDefs[it.key].title,
    columns: colDefs[it.key].cols,
    rows: data.value[it.key] || [],
  }));
  const r = await window.api.export.zip(files, "全部报表.zip");
  loading.value = false;
  if (r.ok) ElMessage.success(`已导出：${r.path}`);
  else if (r.msg !== "已取消") ElMessage.error(r.msg);
}
</script>

<template>
  <div>
    <div class="card">
      <div class="card-title">报表导出</div>
      <div class="toolbar">
        <el-button class="green-btn" type="primary" size="large" :loading="loading" @click="exportAll">
          一键导出全部（zip）
        </el-button>
      </div>
      <el-table :data="exportItems" size="small">
        <el-table-column prop="label" label="报表名称" width="140" />
        <el-table-column prop="desc" label="内容说明" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" text class="green-btn" @click="exportOne(row)">导出 Excel</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:10px;font-size:12px;color:#5d7f6a">
        共 {{ exportItems.length }} 张报表：基础档案、入库表、出库表（含批号明细，可追溯领用批次）、库存总表、盘点差异表、操作日志
      </div>
    </div>
  </div>
</template>
