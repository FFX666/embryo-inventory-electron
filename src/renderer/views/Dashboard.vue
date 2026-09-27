<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const stats = ref({ materials: 0, low: 0, near: 0, expired: 0, todayOps: 0 });
const rows = ref([]);

// 筛选条件（点“筛选”才应用）
const f = ref({ name: "", category: "", expiry: "", unit: "", shelf: "", status: "" });
const applied = ref({ name: "", category: "", expiry: "", unit: "", shelf: "", status: "" });

onMounted(load);

async function load() {
  stats.value = await window.api.dashboard.stats();
  rows.value = await window.api.dashboard.stock();
}

// 各列下拉选项（从数据里提取去重）
const nameOptions = computed(() => [...new Set(rows.value.map((r) => r.name).filter(Boolean))]);
const categoryOptions = computed(() => [...new Set(rows.value.map((r) => r.category).filter(Boolean))]);
const unitOptions = computed(() => [...new Set(rows.value.map((r) => r.unit).filter(Boolean))]);
const shelfOptions = computed(() => [...new Set(rows.value.map((r) => r.shelf_no).filter(Boolean))]);
const statusOptions = ["正常", "低库存", "临期", "已过期", "无库存"];
const expiryOptions = [
  { label: "全部", value: "" },
  { label: "已过期", value: "expired" },
  { label: "30天内到期", value: "near30" },
  { label: "90天内到期", value: "near90" },
  { label: "90天以上", value: "far" },
];

function daysToExpiry(row) {
  if (!row.expiry_date) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(row.expiry_date);
  return Math.ceil((d - today) / 86400000);
}

function expiryBucket(row) {
  const days = daysToExpiry(row);
  if (days == null) return "far";
  if (days < 0) return "expired";
  if (days <= 30) return "near30";
  if (days <= 90) return "near90";
  return "far";
}

function statusOf(row) {
  if (row.expired) return "已过期";
  if (row.near) return "临期";
  if (row.qty === 0 || row.qty == null) return "无库存";
  if (row.warning_qty > 0 && (row.qty || 0) < row.warning_qty) return "低库存";
  return "正常";
}
function statusTagType(s) {
  return { 正常: "success", 低库存: "warning", 临期: "warning", 已过期: "danger", 无库存: "info" }[s] || "info";
}

const shown = computed(() => rows.value.filter((r) => {
  const s = statusOf(r);
  if (applied.value.name && r.name !== applied.value.name) return false;
  if (applied.value.category && r.category !== applied.value.category) return false;
  if (applied.value.unit && r.unit !== applied.value.unit) return false;
  if (applied.value.shelf && r.shelf_no !== applied.value.shelf) return false;
  if (applied.value.status && s !== applied.value.status) return false;
  if (applied.value.expiry && expiryBucket(r) !== applied.value.expiry) return false;
  return true;
}));

function applyFilter() { applied.value = { ...f.value }; }
function resetFilter() {
  f.value = { name: "", category: "", expiry: "", unit: "", shelf: "", status: "" };
  applied.value = { name: "", category: "", expiry: "", unit: "", shelf: "", status: "" };
}

// 统计卡点击跳转
function goDashboard(kind) {
  if (kind === "materials") { router.push("/materials"); return; }
  if (kind === "todayOps") { router.push("/logs"); return; }
  // 低库存/临期/已过期：在本表按状态预筛选
  const map = { low: "低库存", near: "临期", expired: "已过期" };
  f.value.status = map[kind] || "";
  applyFilter();
}
</script>

<template>
  <div>
    <div class="stat-grid">
      <div class="stat-card clickable" @click="goDashboard('materials')"><div class="num">{{ stats.materials }}</div><div class="label">基础档案</div></div>
      <div class="stat-card clickable" style="border-left-color:#b45309" @click="goDashboard('low')"><div class="num" style="color:#b45309">{{ stats.low }}</div><div class="label">低库存提醒</div></div>
      <div class="stat-card clickable" style="border-left-color:#a16207" @click="goDashboard('near')"><div class="num" style="color:#a16207">{{ stats.near }}</div><div class="label">临期批次</div></div>
      <div class="stat-card clickable" style="border-left-color:#b91c1c" @click="goDashboard('expired')"><div class="num" style="color:#b91c1c">{{ stats.expired }}</div><div class="label">已过期</div></div>
      <div class="stat-card clickable" @click="goDashboard('todayOps')"><div class="num">{{ stats.todayOps }}</div><div class="label">今日操作</div></div>
    </div>

    <div class="card">
      <div class="card-title">实时库存总表</div>

      <!-- 列下拉筛选：每列上方 label，下面下拉框默认"全部"；末尾筛选+重置 -->
      <div class="filter-row">
        <div class="filter-col">
          <label class="filter-label">耗材名称</label>
          <el-select v-model="f.name" style="width:100%">
            <el-option label="全部" value="" />
            <el-option v-for="n in nameOptions" :key="n" :label="n" :value="n" />
          </el-select>
        </div>
        <div class="filter-col">
          <label class="filter-label">分类</label>
          <el-select v-model="f.category" style="width:100%">
            <el-option label="全部" value="" />
            <el-option v-for="c in categoryOptions" :key="c" :label="c" :value="c" />
          </el-select>
        </div>
        <div class="filter-col">
          <label class="filter-label">有效期</label>
          <el-select v-model="f.expiry" style="width:100%">
            <el-option v-for="o in expiryOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>
        <div class="filter-col">
          <label class="filter-label">单位</label>
          <el-select v-model="f.unit" style="width:100%">
            <el-option label="全部" value="" />
            <el-option v-for="u in unitOptions" :key="u" :label="u" :value="u" />
          </el-select>
        </div>
        <div class="filter-col">
          <label class="filter-label">货架号</label>
          <el-select v-model="f.shelf" style="width:100%">
            <el-option label="全部" value="" />
            <el-option v-for="s in shelfOptions" :key="s" :label="s" :value="s" />
          </el-select>
        </div>
        <div class="filter-col">
          <label class="filter-label">状态</label>
          <el-select v-model="f.status" style="width:100%">
            <el-option label="全部" value="" />
            <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
          </el-select>
        </div>
        <div class="filter-actions">
          <el-button class="green-btn" type="primary" @click="applyFilter">筛选</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </div>
      </div>

      <div class="table-wrap">
        <el-table :data="shown" size="small" height="440">
          <el-table-column prop="name" label="耗材名称" min-width="180" />
          <el-table-column prop="category" label="分类" width="100" />
          <el-table-column prop="batch_no" label="批号" width="110" />
          <el-table-column prop="expiry_date" label="有效期" width="110" />
          <el-table-column prop="qty" label="库存数量" width="90" />
          <el-table-column prop="unit" label="单位" width="70" />
          <el-table-column prop="shelf_no" label="货架号" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(statusOf(row))" size="small">{{ statusOf(row) }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clickable { cursor: pointer; transition: transform .1s, box-shadow .1s; }
.clickable:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(20,83,45,.12); }
.filter-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 12px; }
.filter-col { display: flex; flex-direction: column; flex: 1; min-width: 120px; }
.filter-label { font-size: 12px; color: #5d7f6a; margin-bottom: 4px; }
.filter-actions { display: flex; gap: 8px; padding-bottom: 2px; }
</style>
