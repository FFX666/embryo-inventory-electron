<script setup>
import { ref, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

const rows = ref([]);
const options = ref({ 分类: [], 储存条件: [], 货架: [] });
const isViewer = ref(false);
const current = ref(null);
const editingId = ref(null);
const form = ref(emptyForm());

function emptyForm() {
  return {
    code: "", name: "", spec: "", manufacturer: "", brand: "", batch_no: "", expiry_date: "",
    category: "", storage_condition: "", unit: "瓶", purchase_price: 0,
    warning_qty: 0, shelf_no: "", remark: "", sort_no: 0, enabled: true, init_qty: 0,
  };
}

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

// 新增下拉选项
async function addOption(type) {
  try {
    const { value } = await ElMessageBox.prompt(`请输入新的${type}选项`, "新增选项", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputPattern: /\S+/,
      inputErrorMessage: "内容不能为空",
    });
    if (!value) return;
    const list = options.value[type] || [];
    if (list.includes(value.trim())) {
      ElMessage.warning("该选项已存在");
      return;
    }
    await window.api.options.save(type, [...list, value.trim()]);
    options.value[type] = [...list, value.trim()];
    form.value[type === "货架" ? "shelf_no" : type === "储存条件" ? "storage_condition" : "category"] = value.trim();
    ElMessage.success("已添加");
  } catch (e) { /* 取消 */ }
}

function resetForm() {
  editingId.value = null;
  form.value = emptyForm();
}

function onClickAdd() {
  resetForm();
}

async function onSave() {
  if (!form.value.name) { ElMessage.warning("请填写耗材名称"); return; }
  const r = await window.api.materials.save({ ...form.value, id: editingId.value });
  if (r.ok) {
    ElMessage.success(editingId.value ? "已修改" : "已保存货品");
    resetForm();
    load();
  } else ElMessage.error(r.msg);
}

function onEdit(row) {
  editingId.value = row.id;
  form.value = {
    code: row.code || "", name: row.name, spec: row.spec || "", manufacturer: row.manufacturer || "",
    brand: row.brand || "", batch_no: "", expiry_date: "", category: row.category || "",
    storage_condition: row.storage_condition || "", unit: row.unit || "瓶", purchase_price: row.purchase_price || 0,
    warning_qty: row.warning_qty || 0, shelf_no: row.shelf_no || "", remark: "", sort_no: row.sort_no || 0,
    enabled: !!row.enabled, init_qty: 0,
  };
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onView(row) {
  ElMessageBox.alert(
    `<div style="line-height:2;font-size:13px">
      <b>${row.name}</b><br/>
      编号：${row.code || "-"}<br/>
      规格：${row.spec || "-"}　厂家：${row.manufacturer || "-"}<br/>
      分类：${row.category || "-"}　单位：${row.unit || "-"}<br/>
      货架：${row.shelf_no || "-"}　预警：${row.warning_qty}<br/>
      单价：${row.purchase_price}　状态：${row.enabled ? "启用" : "停用"}
    </div>`,
    "耗材详情",
    { dangerouslyUseHTMLString: true, confirmButtonText: "关闭" }
  );
}

async function onToggle(row) {
  await ElMessageBox.confirm(`确定要${row.enabled ? "停用" : "启用"}「${row.name}」吗？`, "确认", { type: "warning" });
  const r = await window.api.materials.toggle(row.id);
  if (r.ok) load(); else ElMessage.error(r.msg);
}

const selected = ref([]);
async function onToggleSelected() {
  if (!selected.value.length) { ElMessage.warning("请先在表格里勾选要停用的行"); return; }
  await ElMessageBox.confirm(`将停用选中的 ${selected.value.length} 个耗材，确认？`, "确认", { type: "warning" });
  for (const row of selected.value) {
    if (row.enabled) await window.api.materials.toggle(row.id);
  }
  ElMessage.success("已停用选中项");
  load();
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
      <div class="card-title">基础档案</div>
      <div class="sub-title">耗材基础档案录入</div>

      <div class="form-grid">
        <div class="field">
          <label>条形码/材料编号</label>
          <el-input v-model="form.code" />
        </div>
        <div class="field">
          <label>耗材名称 <span class="req">*</span></label>
          <el-input v-model="form.name" />
        </div>
        <div class="field">
          <label>规格型号</label>
          <el-input v-model="form.spec" />
        </div>
        <div class="field">
          <label>生产厂家</label>
          <el-input v-model="form.manufacturer" />
        </div>
        <div class="field">
          <label>批号</label>
          <el-input v-model="form.batch_no" />
        </div>
        <div class="field">
          <label>有效期</label>
          <el-date-picker v-model="form.expiry_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </div>
        <div class="field">
          <label>分类</label>
          <el-select v-model="form.category" filterable allow-create style="width:100%">
            <el-option v-for="v in options['分类']" :key="v" :value="v" />
          </el-select>
        </div>

        <div class="field">
          <label>储存条件</label>
          <div class="input-with-add">
            <el-select v-model="form.storage_condition" filterable allow-create style="width:100%">
              <el-option v-for="v in options['储存条件']" :key="v" :value="v" />
            </el-select>
            <el-button size="small" class="add-btn" @click="addOption('储存条件')">新增</el-button>
          </div>
        </div>
        <div class="field">
          <label>单位</label>
          <div class="input-with-add">
            <el-input v-model="form.unit" />
            <el-button size="small" class="add-btn" @click="ElMessage.info('可直接输入新单位')">新增</el-button>
          </div>
        </div>
        <div class="field">
          <label>采购单价</label>
          <el-input-number v-model="form.purchase_price" :min="0" :precision="2" style="width:100%" />
        </div>
        <div class="field">
          <label>库存预警最低数量</label>
          <el-input-number v-model="form.warning_qty" :min="0" style="width:100%" />
        </div>
        <div class="field">
          <label>存放货架编号</label>
          <el-select v-model="form.shelf_no" filterable allow-create style="width:100%">
            <el-option v-for="v in options['货架']" :key="v" :value="v" />
          </el-select>
        </div>
        <div class="field">
          <label>备注</label>
          <el-input v-model="form.remark" />
        </div>
        <div class="field">
          <label>排序号</label>
          <el-input-number v-model="form.sort_no" :min="0" style="width:100%" />
        </div>
      </div>

      <div class="form-bottom">
        <el-checkbox v-model="form.enabled">启用</el-checkbox>
        <div class="btn-group">
          <el-button v-if="!isViewer" class="green-btn" @click="onClickAdd">新增</el-button>
          <el-button v-if="!isViewer" class="green-btn" type="primary" @click="onSave">
            {{ editingId ? "保存修改" : "保存货品" }}
          </el-button>
          <el-button @click="resetForm">清空</el-button>
          <el-button v-if="!isViewer" type="warning" @click="onToggleSelected">停用选中</el-button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">档案列表</div>
      <div class="table-wrap">
        <el-table :data="shown" size="small" height="460" @selection-change="(v) => selected = v">
          <el-table-column type="selection" width="40" />
          <el-table-column prop="name" label="耗材名称" min-width="180" />
          <el-table-column prop="spec" label="规格型号" width="110" />
          <el-table-column prop="manufacturer" label="生产厂家" width="120" />
          <el-table-column prop="category" label="分类" width="100" />
          <el-table-column prop="unit" label="单位" width="70" />
          <el-table-column prop="purchase_price" label="采购单价" width="90" />
          <el-table-column prop="warning_qty" label="预警数量" width="90" />
          <el-table-column prop="shelf_no" label="货架号" width="90" />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text @click="onView(row)">查看</el-button>
              <el-button size="small" text type="primary" @click="onEdit(row)">修改</el-button>
              <el-button v-if="!isViewer" size="small" text :type="row.enabled ? 'danger' : 'success'" @click="onToggle(row)">
                {{ row.enabled ? "停用" : "启用" }}
              </el-button>
              <el-button size="small" text @click="openBarcode(row)">条码</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sub-title { font-size: 13px; color: #5d7f6a; margin: -6px 0 14px; }
.form-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px 12px; margin-bottom: 14px; }
.field label { display: block; font-size: 12px; color: #3f6b52; margin-bottom: 4px; }
.field .req { color: #c0392b; }
.form-bottom { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2efe7; padding-top: 12px; }
.btn-group { display: flex; gap: 8px; }
.input-with-add { display: flex; gap: 6px; align-items: center; }
.input-with-add .el-select { flex: 1; }
.add-btn { flex-shrink: 0; background: #fff; border: 1px solid #c0c4cc; color: #333; }
.add-btn:hover { background: #f5f7fa; border-color: #909399; color: #333; }
</style>
