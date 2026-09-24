<script setup>
import { ref, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

const rows = ref([]);
const materials = ref([]);
const batches = ref([]);
const isViewer = ref(false);
const current = ref(null);
const form = ref({});
const addDialog = ref(false);
const formRef = ref();

const rules = {
  material_id: [{ required: true, message: "请选择耗材", trigger: "change" }],
  qty: [{ required: true, message: "请填写数量", trigger: "blur" }],
};

onMounted(async () => {
  current.value = await window.api.auth.current();
  isViewer.value = current.value?.role === "viewer";
  await load();
});

async function load() {
  rows.value = await window.api.outbound.list();
  materials.value = (await window.api.materials.list()).filter((m) => m.enabled);
}

function openAdd() {
  form.value = { material_id: "", batch_id: "", qty: 1, unit: "瓶", handler: current.value?.display_name || "", checker: "", date: "", reason: "" };
  addDialog.value = true;
}

async function onMaterialChange(id) {
  const m = materials.value.find((x) => x.id === id);
  if (m) form.value.unit = m.unit;
  form.value.batch_id = "";
  batches.value = await window.api.outbound.batches(id);
  if (batches.value.length) {
    form.value.batch_id = batches.value[0].id; // 自动选中推荐批号（FEFO 效期优先）
    ElMessage.info(`已推荐批号：${batches.value[0].batch_no}`);
  } else {
    ElMessage.warning("该耗材无可用库存批次");
  }
}

async function submit() {
  await formRef.value.validate();
  if (!form.value.batch_id) { ElMessage.warning("请选择出库批次"); return; }
  const r = await window.api.outbound.add(form.value);
  if (r.ok) { ElMessage.success("出库成功"); addDialog.value = false; load(); }
  else ElMessage.error(r.msg);
}

async function doVoid(row) {
  await ElMessageBox.confirm("作废后将回补对应批次库存，确认作废？", "作废确认", { type: "warning" });
  const r = await window.api.outbound.void(row.id);
  if (r.ok) { ElMessage.success("已作废"); load(); } else ElMessage.error(r.msg);
}

const shown = computed(() => rows.value);
</script>

<template>
  <div>
    <div class="card">
      <div class="card-title">出库领用</div>
      <div class="toolbar">
        <el-button v-if="!isViewer" class="green-btn" type="primary" @click="openAdd">新增出库</el-button>
      </div>
      <div class="table-wrap">
        <el-table :data="shown" size="small" height="520">
          <el-table-column prop="date" label="日期" width="110" />
          <el-table-column prop="material_name" label="耗材名称" min-width="160" />
          <el-table-column prop="batch_no" label="批号" width="110" />
          <el-table-column prop="qty" label="数量" width="80" />
          <el-table-column prop="unit" label="单位" width="70" />
          <el-table-column prop="handler" label="经手人" width="100" />
          <el-table-column prop="checker" label="核对人" width="100" />
          <el-table-column prop="reason" label="原因" min-width="120" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === '正常' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button v-if="!isViewer && row.status === '正常'" size="small" text type="danger" @click="doVoid(row)">作废</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="addDialog" title="新增出库（自动推荐优先批号）" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="耗材" prop="material_id">
              <el-select v-model="form.material_id" filterable style="width:100%" @change="onMaterialChange">
                <el-option v-for="m in materials" :key="m.id" :value="m.id" :label="`${m.name}（${m.code||''}）`" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="出库批次" prop="batch_id">
              <el-select v-model="form.batch_id" style="width:100%" placeholder="系统已按效期优先推荐">
                <el-option v-for="b in batches" :key="b.id" :value="b.id" :label="`${b.batch_no}（有效期 ${b.expiry_date||'长期'} · 剩余 ${b.qty}${b.unit}）${b.expired ? '【已过期】' : ''}`" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12"><el-form-item label="数量" prop="qty"><el-input-number v-model="form.qty" :min="0" :precision="3" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="单位"><el-input v-model="form.unit" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="经手人"><el-input v-model="form.handler" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="核对人"><el-input v-model="form.checker" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="日期"><el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="领用原因"><el-input v-model="form.reason" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="addDialog = false">取消</el-button>
        <el-button class="green-btn" type="primary" @click="submit">确认出库</el-button>
      </template>
    </el-dialog>
  </div>
</template>
