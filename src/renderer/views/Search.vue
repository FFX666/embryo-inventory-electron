<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";

const filter = ref({ name: "", category: "", handler: "", dateFrom: "", dateTo: "" });
const result = ref({ inbound: [], outbound: [] });
const categories = ref([]);
const activeTab = ref("inbound");

onMounted(async () => {
  const opts = await window.api.options.list();
  categories.value = opts.filter((o) => o.type === "分类").map((o) => o.value);
  await search();
});

async function search() {
  result.value = await window.api.query.records(filter.value);
}

function reset() {
  filter.value = { name: "", category: "", handler: "", dateFrom: "", dateTo: "" };
  search();
}

async function exportExcel() {
  const sheets = [
    {
      sheetName: "入库记录",
      columns: [
        { key: "date", title: "日期", width: 12 },
        { key: "material_name", title: "耗材名称", width: 22 },
        { key: "batch_no", title: "批号", width: 14 },
        { key: "expiry_date", title: "有效期", width: 12 },
        { key: "qty", title: "数量", width: 8 },
        { key: "unit", title: "单位", width: 8 },
        { key: "supplier", title: "供应商", width: 16 },
        { key: "handler", title: "经手人", width: 10 },
      ],
      rows: result.value.inbound || [],
    },
    {
      sheetName: "出库记录",
      columns: [
        { key: "date", title: "日期", width: 12 },
        { key: "material_name", title: "耗材名称", width: 22 },
        { key: "batch_no", title: "批号", width: 14 },
        { key: "qty", title: "数量", width: 8 },
        { key: "unit", title: "单位", width: 8 },
        { key: "handler", title: "经手人", width: 10 },
        { key: "checker", title: "核对人", width: 10 },
        { key: "reason", title: "领用原因", width: 16 },
      ],
      rows: result.value.outbound || [],
    },
  ];
  // 用 zip 形式一次导出两个 sheet 到一个 xlsx（通过 export:workbook 多次调用不合适，这里直接生成多 sheet 工作簿）
  const r = await window.api.export.workbook({ sheetName: "查询结果", columns: [], rows: [], sheets }, "查询结果.xlsx");
  if (r.ok) ElMessage.success("已导出：" + r.path);
  else if (r.msg !== "已取消") ElMessage.error(r.msg);
}
</script>

<template>
  <div>
    <div class="card">
      <div class="card-title">查询中心</div>
      <div class="toolbar">
        <el-input v-model="filter.name" placeholder="耗材名称/批号" clearable style="width:180px" />
        <el-select v-model="filter.category" placeholder="分类" clearable style="width:130px">
          <el-option v-for="c in categories" :key="c" :value="c" />
        </el-select>
        <el-input v-model="filter.handler" placeholder="经手人" clearable style="width:120px" />
        <el-date-picker v-model="filter.dateFrom" type="date" value-format="YYYY-MM-DD" placeholder="起始日期" style="width:140px" />
        <el-date-picker v-model="filter.dateTo" type="date" value-format="YYYY-MM-DD" placeholder="截止日期" style="width:140px" />
        <el-button class="green-btn" type="primary" @click="search">查询</el-button>
        <el-button @click="reset">重置</el-button>
        <el-button type="success" plain @click="exportExcel">导出Excel</el-button>
      </div>
    </div>

    <div class="card">
      <el-tabs v-model="activeTab">
        <el-tab-pane :label="`入库记录（${result.inbound.length}）`" name="inbound">
          <el-table :data="result.inbound" size="small" height="420">
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="material_name" label="耗材名称" min-width="160" />
            <el-table-column prop="batch_no" label="批号" width="110" />
            <el-table-column prop="qty" label="数量" width="80" />
            <el-table-column prop="unit" label="单位" width="70" />
            <el-table-column prop="supplier" label="供应商" width="140" />
            <el-table-column prop="handler" label="经手人" width="100" />
            <el-table-column prop="status" label="状态" width="80" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane :label="`出库记录（${result.outbound.length}）`" name="outbound">
          <el-table :data="result.outbound" size="small" height="420">
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="material_name" label="耗材名称" min-width="160" />
            <el-table-column prop="batch_no" label="批号" width="110" />
            <el-table-column prop="qty" label="数量" width="80" />
            <el-table-column prop="unit" label="单位" width="70" />
            <el-table-column prop="handler" label="经手人" width="100" />
            <el-table-column prop="checker" label="核对人" width="100" />
            <el-table-column prop="reason" label="原因" min-width="120" />
            <el-table-column prop="status" label="状态" width="80" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>
