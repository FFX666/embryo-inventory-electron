<script setup>
import { ref, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";

const rows = ref([]);
const dialog = ref(false);
const editingId = ref(null);
const form = ref({});
const options = ref({ 分类: [], 储存条件: [], 货架: [] });
const isViewer = ref(false);
const current = ref(null);

const formRef = ref();
const rules = { name: [{ required: true, message: "请填写名称", trigger: "blur" }] };

onMounted(async () => {
  current.value = await window.api.auth.current();
  isViewer.value = current.value?.role === "viewer";
  await load();
});

async function load() {
  rows.value = await window.api.materials.list();
  const opts = await window.api.options.list();
  options.value = { 分类: [], 储存条件: [], 货架: [] };
  for (const o of opts) (options.value[o.type] || (options.value[o.type] = [])).push(o.value);
}

function openAdd() {
  editingId.value = null;
  form.value = { name: "", code: "", spec: "", manufacturer: "", category: "", storage_condition: "", unit: "瓶", purchase_price: 0, warning_qty: 0, shelf_no: "", sort_no: 0 };
  dialog.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  form.value = { ...row };
  dialog.value = true;
}

async function save() {
  await formRef.value.validate();
  const r = await window.api.materials.save({ ...form.value, id: editingId.value });
  if (r.ok) { ElMessage.success("已保存"); dialog.value = false; load(); }
  else ElMessage.error(r.msg);
}

async function toggle(row) {
  const r = await window.api.materials.toggle(row.id);
  if (r.ok) load();
  else ElMessage.error(r.msg);
}

function openBarcode(row) {
  const w = window.open("", "_blank", "width=640,height=760");
  w.document.write(`
    <html><head><meta charset="utf-8"><title>条码打印</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
    <style>body{font-family:"Microsoft YaHei",sans-serif;text-align:center;padding:20px}
    .l{display:inline-block;border:1px dashed #999;padding:12px 16px;margin:8px;text-align:center;page-break-inside:avoid}
    .n{font-weight:700;font-size:13px;margin:6px 0 2px}.m{font-size:12px;color:#666}
    .code{font-size:11px;letter-spacing:2px;margin-top:2px}
    @media print{.t{display:none}}<\/style></head><body>
    <div class="t"><button onclick="window.print()">打印条码</button></div>
    ${Array.from({length:5}).map(() => `<div class="l">
      <div class="n">${row.name}</div>
      <div class="m">${row.spec||""}｜${row.category||""}｜货架 ${row.shelf_no||""}</div>
      <svg id="bc" width="260" height="60"></svg>
      <div class="code">${row.code||row.id}</div></div>`).join("")}
    <script>document.querySelectorAll("#bc").forEach(el=>JsBarcode(el, "${(row.code||String(row.id)).replace(/"/g,"")}", {format:"CODE128",displayValue:false,height:48,width:1.5}));<\/script>
    </body></html>`);
  w.document.close();
}

const shown = computed(() => rows.value);
</script>

<template>
  <div>
    <div class="card">
      <div class="card-title">耗材档案</div>
      <div class="toolbar">
        <el-button v-if="!isViewer" class="green-btn" type="primary" @click="openAdd">新增档案</el-button>
      </div>
      <div class="table-wrap">
        <el-table :data="shown" size="small" height="500">
          <el-table-column prop="code" label="编号" width="100" />
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="spec" label="规格型号" width="110" />
          <el-table-column prop="manufacturer" label="厂家" width="120" />
          <el-table-column prop="category" label="分类" width="90" />
          <el-table-column prop="storage_condition" label="储存条件" width="90" />
          <el-table-column prop="unit" label="单位" width="70" />
          <el-table-column prop="stock_qty" label="当前库存" width="90" />
          <el-table-column prop="shelf_no" label="货架" width="90" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? "启用" : "停用" }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text @click="openEdit(row)">修改</el-button>
              <el-button size="small" text @click="openBarcode(row)">条码</el-button>
              <el-button v-if="!isViewer" size="small" text type="danger" @click="toggle(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="dialog" :title="editingId ? '修改档案' : '新增档案'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="编号"><el-input v-model="form.code" placeholder="条码/编号" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="名称" prop="name"><el-input v-model="form.name" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="规格型号"><el-input v-model="form.spec" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="生产厂家"><el-input v-model="form.manufacturer" /></el-form-item></el-col>
          <el-col :span="12">
            <el-form-item label="分类">
              <el-select v-model="form.category" filterable allow-create clearable style="width:100%">
                <el-option v-for="v in options['分类']" :key="v" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="储存条件">
              <el-select v-model="form.storage_condition" filterable allow-create clearable style="width:100%">
                <el-option v-for="v in options['储存条件']" :key="v" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12"><el-form-item label="单位"><el-input v-model="form.unit" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="单价"><el-input-number v-model="form.purchase_price" :min="0" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="预警数量"><el-input-number v-model="form.warning_qty" :min="0" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12">
            <el-form-item label="货架位置">
              <el-select v-model="form.shelf_no" filterable allow-create clearable style="width:100%">
                <el-option v-for="v in options['货架']" :key="v" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12"><el-form-item label="排序号"><el-input-number v-model="form.sort_no" style="width:100%" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button class="green-btn" type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
