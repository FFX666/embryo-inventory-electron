<script setup>
import { ref, onMounted, computed } from "vue";

const stats = ref({ materials: 0, low: 0, near: 0, expired: 0, todayOps: 0 });
const rows = ref([]);
const filterName = ref("");
const filterStatus = ref("");

onMounted(load);

async function load() {
  stats.value = await window.api.dashboard.stats();
  rows.value = await window.api.dashboard.stock();
}

const shown = computed(() => rows.value.filter((r) => {
  const nameOk = !filterName.value || (r.name || "").includes(filterName.value);
  let status = "正常";
  if (r.expired) status = "已过期";
  else if (r.near) status = "临期";
  else if (r.qty === 0 || r.qty == null) status = "无库存";
  else if (r.warning_qty > 0 && (r.qty || 0) < r.warning_qty) status = "低库存";
  const statusOk = !filterStatus.value || status === filterStatus.value;
  return nameOk && statusOk;
}));

function statusTag(row) {
  if (row.expired) return { text: "已过期", type: "danger" };
  if (row.near) return { text: "临期", type: "warning" };
  if (row.qty === 0 || row.qty == null) return { text: "无库存", type: "info" };
  if (row.warning_qty > 0 && (row.qty || 0) < row.warning_qty) return { text: "低库存", type: "warning" };
  return { text: "正常", type: "success" };
}
</script>

<template>
  <div>
    <div class="stat-grid">
      <div class="stat-card"><div class="num">{{ stats.materials }}</div><div class="label">基础档案</div></div>
      <div class="stat-card"><div class="num" style="color:#b45309">{{ stats.low }}</div><div class="label">低库存提醒</div></div>
      <div class="stat-card"><div class="num" style="color:#a16207">{{ stats.near }}</div><div class="label">临期批次</div></div>
      <div class="stat-card"><div class="num" style="color:#b91c1c">{{ stats.expired }}</div><div class="label">已过期</div></div>
      <div class="stat-card"><div class="num">{{ stats.todayOps }}</div><div class="label">今日操作</div></div>
    </div>
    <div class="card">
      <div class="card-title">实时库存总表</div>
      <div class="toolbar">
        <el-input v-model="filterName" placeholder="耗材名称/批号" clearable style="width:220px" />
        <el-select v-model="filterStatus" placeholder="库存状态" clearable style="width:140px">
          <el-option label="正常" value="正常" />
          <el-option label="低库存" value="低库存" />
          <el-option label="临期" value="临期" />
          <el-option label="已过期" value="已过期" />
          <el-option label="无库存" value="无库存" />
        </el-select>
        <el-button class="green-btn" type="primary" @click="load">重置</el-button>
      </div>
      <div class="table-wrap">
        <el-table :data="shown" size="small" height="440">
          <el-table-column prop="code" label="编号" width="90" />
          <el-table-column prop="name" label="耗材名称" min-width="160" />
          <el-table-column prop="spec" label="规格型号" width="110" />
          <el-table-column prop="batch_no" label="批号" width="110" />
          <el-table-column prop="expiry_date" label="有效期" width="110" />
          <el-table-column prop="qty" label="库存数量" width="90" />
          <el-table-column prop="unit" label="单位" width="70" />
          <el-table-column prop="shelf_no" label="货架位置" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTag(row).type" size="small">{{ statusTag(row).text }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>
