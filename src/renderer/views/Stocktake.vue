<script setup>
import { ref, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";

const rows = ref([]);
const diffs = ref([]);
const materials = ref([]);
const isViewer = ref(false);
const current = ref(null);
const form = ref({});
const fixDialog = ref(false);
const formRef = ref();

const rules = {
  material_id: [{ required: true, message: "请选择耗材", trigger: "change" }],
  actual_qty: [{ required: true, message: "请填写实盘数量", trigger: "blur" }],
};

onMounted(async () => {
  current.value = await window.api.auth.current();
  isViewer.value = current.value?.role === "viewer";
  await load();
});

async function load() {
  rows.value = await window.api.stock.table();
  diffs.value = await window.api.stock.diffs();
  materials.value = (await window.api.materials.list()).filter((m) => m.enabled);
}

function openFix(row) {
  form.value = {
    material_id: row.material_id,
    batch_no: row.batch_no || "",
    book_qty: row.qty || 0,
    actual_qty: row.qty || 0,
    handler: current.value?.display_name || "",
    reason: "",
    date: "",
  };
  fixDialog.value = true;
}

async function submit() {
  await formRef.value.validate();
  const r = await window.api.stock.fix(form.value);
  if (r.ok) { ElMessage.success("盘点差异已记录并修正"); fixDialog.value = false; load(); }
  else ElMessage.error(r.msg);
}

const shown = computed(() => rows.value);
const shownDiffs = computed(() => diffs.value);
</script>

<template>
  <div>
    <div class="card">
      <div class="card-title">库存盘点（账面 vs 实盘）</div>
      <div class="table-wrap">
        <el-table :data="shown" size="small" height="380">
          <el-table-column prop="code" label="编号" width="90" />
          <el-table-column prop="name" label="耗材名称" min-width="160" />
          <el-table-column prop="batch_no" label="批号" width="110" />
          <el-table-column prop="expiry_date" label="有效期" width="110" />
          <el-table-column prop="qty" label="账面数量" width="100" />
          <el-table-column prop="unit" label="单位" width="70" />
          <el-table-column prop="shelf_no" label="货架" width="90" />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button v-if="!isViewer" size="small" text class="green-btn" @click="openFix(row)">盘点修正</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="card">
      <div class="card-title">盘点差异记录</div>
      <div class="table-wrap">
        <el-table :data="shownDiffs" size="small" height="260">
          <el-table-column prop="date" label="日期" width="110" />
          <el-table-column prop="material_name" label="耗材名称" min-width="160" />
          <el-table-column prop="batch_no" label="批号" width="110" />
          <el-table-column prop="book_qty" label="账面" width="80" />
          <el-table-column prop="actual_qty" label="实盘" width="80" />
          <el-table-column label="差异" width="100">
            <template #default="{ row }">
              <span :style="{ color: row.diff >= 0 ? '#1a7a48' : '#b91c1c', fontWeight: 600 }">{{ row.diff > 0 ? "+" : "" }}{{ row.diff }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="handler" label="经手人" width="100" />
          <el-table-column prop="reason" label="差异原因" min-width="140" />
        </el-table>
      </div>
    </div>

    <el-dialog v-model="fixDialog" title="盘点修正" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="耗材"><el-input :model-value="materials.find(m=>m.id===form.material_id)?.name" disabled /></el-form-item>
        <el-form-item label="批号"><el-input v-model="form.batch_no" /></el-form-item>
        <el-form-item label="账面数量"><el-input-number v-model="form.book_qty" :min="0" :precision="3" style="width:100%" /></el-form-item>
        <el-form-item label="实盘数量" prop="actual_qty"><el-input-number v-model="form.actual_qty" :min="0" :precision="3" style="width:100%" /></el-form-item>
        <el-form-item label="经手人"><el-input v-model="form.handler" /></el-form-item>
        <el-form-item label="差异原因"><el-input v-model="form.reason" /></el-form-item>
        <el-form-item label="日期"><el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fixDialog = false">取消</el-button>
        <el-button class="green-btn" type="primary" @click="submit">保存盘点修正</el-button>
      </template>
    </el-dialog>
  </div>
</template>
