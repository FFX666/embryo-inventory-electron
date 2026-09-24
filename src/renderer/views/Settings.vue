<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";

const router = useRouter();
const activeTab = ref("password");

// 修改密码
const pwd = ref({ old: "", nw: "", nw2: "" });
async function changePwd() {
  if (!pwd.value.old || !pwd.value.nw) { ElMessage.warning("请填写原密码和新密码"); return; }
  if (pwd.value.nw !== pwd.value.nw2) { ElMessage.warning("两次新密码不一致"); return; }
  const r = await window.api.auth.changePassword(pwd.value.old, pwd.value.nw);
  if (r.ok) { ElMessage.success("密码已修改，请重新登录"); router.push("/login"); }
  else ElMessage.error(r.msg);
}

// 账号管理
const users = ref([]);
const userDialog = ref(false);
const editingUser = ref(null);
const userForm = ref({});
async function loadUsers() {
  users.value = await window.api.users.list();
}
function openUser(u) {
  editingUser.value = u ? u.id : null;
  userForm.value = u
    ? { id: u.id, username: u.username, display_name: u.display_name, role: u.role, enabled: u.enabled === 1, password: "" }
    : { id: null, username: "", display_name: "", role: "operator", enabled: true, password: "" };
  userDialog.value = true;
}
async function saveUser() {
  if (!userForm.value.username || !userForm.value.display_name) { ElMessage.warning("请填写完整"); return; }
  const r = await window.api.users.save(userForm.value);
  if (r.ok) { ElMessage.success("已保存"); userDialog.value = false; loadUsers(); }
  else ElMessage.error(r.msg);
}

// 下拉选项
const optionTypes = ["分类", "储存条件", "货架"];
const optionMap = ref({});
async function loadOptions() {
  const all = await window.api.options.list();
  optionMap.value = {};
  for (const t of optionTypes) optionMap.value[t] = all.filter((o) => o.type === t).map((o) => o.value).join("\n");
}
async function saveOption(type) {
  const r = await window.api.options.save(type, optionMap.value[type]);
  if (r.ok) ElMessage.success("选项已保存");
  else ElMessage.error(r.msg);
}

onMounted(async () => {
  await loadUsers();
  await loadOptions();
});
</script>

<template>
  <div>
    <div class="card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="修改密码" name="password">
          <el-form :model="pwd" label-width="100px" style="max-width:420px">
            <el-form-item label="原密码"><el-input v-model="pwd.old" type="password" show-password /></el-form-item>
            <el-form-item label="新密码"><el-input v-model="pwd.nw" type="password" show-password /></el-form-item>
            <el-form-item label="确认新密码"><el-input v-model="pwd.nw2" type="password" show-password /></el-form-item>
            <el-form-item>
              <el-button class="green-btn" type="primary" @click="changePwd">确认修改</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="账号权限管理" name="users">
          <div class="toolbar">
            <el-button class="green-btn" type="primary" @click="openUser(null)">新增账号</el-button>
          </div>
          <div class="table-wrap">
            <el-table :data="users" size="small" height="380">
              <el-table-column prop="username" label="工号" width="100" />
              <el-table-column prop="display_name" label="姓名" width="130" />
              <el-table-column prop="role_name" label="角色" width="120" />
              <el-table-column label="状态" width="90">
                <template #default="{ row }">
                  <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? "启用" : "停用" }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="160">
                <template #default="{ row }">
                  <el-button size="small" text @click="openUser(row)">编辑/重置密码</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="下拉选项维护" name="options">
          <div v-for="t in optionTypes" :key="t" style="margin-bottom:16px">
            <div style="font-weight:600;color:#14532d;margin-bottom:6px">{{ t }}</div>
            <el-input v-model="optionMap[t]" type="textarea" :rows="3" placeholder="每行一个选项" style="max-width:520px" />
            <el-button size="small" class="green-btn" type="primary" style="margin-top:6px" @click="saveOption(t)">保存{{ t }}</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="userDialog" :title="editingUser ? '编辑账号' : '新增账号'" width="460px">
      <el-form :model="userForm" label-width="90px">
        <el-form-item label="工号"><el-input v-model="userForm.username" :disabled="!!editingUser" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="userForm.display_name" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" style="width:100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通入库员" value="operator" />
            <el-option label="只读查看员" value="viewer" />
          </el-select>
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="userForm.password" :placeholder="editingUser ? '留空则不修改' : '默认 123456'" show-password />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="userForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialog = false">取消</el-button>
        <el-button class="green-btn" type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
