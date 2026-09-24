<script setup>
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

const backups = ref([]);
const loading = ref(false);

onMounted(load);

async function load() {
  backups.value = await window.api.backup.list();
}

async function doBackup() {
  loading.value = true;
  const r = await window.api.backup.create();
  loading.value = false;
  if (r.ok) { ElMessage.success(`备份成功：${r.file}`); load(); }
  else ElMessage.error(r.msg);
}

async function doRestore(row) {
  await ElMessageBox.confirm(
    `恢复 ${row.file} 将覆盖当前数据（恢复前会自动备份当前库），确认继续？`,
    "恢复确认",
    { type: "warning" }
  );
  const r = await window.api.backup.restore(row.file);
  if (r.ok) { ElMessage.success(r.msg); load(); }
  else ElMessage.error(r.msg);
}

function fmtSize(b) {
  return b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + " MB" : (b / 1024).toFixed(1) + " KB";
}
</script>

<template>
  <div>
    <div class="card">
      <div class="card-title">备份与恢复</div>
      <el-alert type="info" :closable="false" style="margin-bottom:12px"
        title="数据库文件保存在本机数据目录（data/db.sqlite3），备份文件保存在 data/backups/。定期备份可防止数据丢失。" />
      <div class="toolbar">
        <el-button class="green-btn" type="primary" :loading="loading" @click="doBackup">立即备份数据库</el-button>
      </div>
      <div class="table-wrap">
        <el-table :data="backups" size="small" height="420">
          <el-table-column prop="file" label="备份文件" min-width="260" />
          <el-table-column label="大小" width="100">
            <template #default="{ row }">{{ fmtSize(row.size) }}</template>
          </el-table-column>
          <el-table-column prop="mtime" label="备份时间" width="180" />
          <el-table-column label="操作" width="110">
            <template #default="{ row }">
              <el-button size="small" text type="danger" @click="doRestore(row)">恢复</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>
