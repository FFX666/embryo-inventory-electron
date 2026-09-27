<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";

const router = useRouter();
const username = ref("");
const password = ref("");
const loading = ref(false);
// status: "unknown" | "found" | "notfound"
const nameStatus = ref("unknown");
const displayName = ref("");

onMounted(async () => {
  await window.api.users.list();
  window._users = await window.api.users.list();
});

function onUsernameInput() {
  const v = username.value.trim();
  if (!v) {
    nameStatus.value = "unknown";
    displayName.value = "";
    return;
  }
  const u = (window._users || []).find((x) => x.username === v);
  if (u) {
    nameStatus.value = "found";
    displayName.value = u.display_name;
  } else {
    nameStatus.value = "notfound";
    displayName.value = "";
  }
}

async function submit() {
  if (!username.value || !password.value) {
    ElMessage.warning("请输入工号和密码");
    return;
  }
  if (nameStatus.value === "notfound") {
    ElMessage.error("未找到该工号");
    return;
  }
  loading.value = true;
  const r = await window.api.auth.login(username.value, password.value);
  loading.value = false;
  if (r.ok) {
    router.push("/");
  } else {
    ElMessage.error(r.msg);
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-title">账号登录</div>
      <div class="login-sub">请输入工号，系统将自动显示对应姓名</div>

      <div class="form-item">
        <label class="field-label">工号</label>
        <el-input v-model="username" size="large" @input="onUsernameInput" autofocus />
      </div>

      <!-- 姓名显示区：浅绿底矩形框 -->
      <div class="name-box" :class="{ empty: nameStatus === 'unknown' }">
        <span v-if="nameStatus === 'found'" class="name-found">{{ displayName }}</span>
        <span v-else-if="nameStatus === 'notfound'" class="name-notfound">未找到该工号</span>
      </div>

      <div class="form-item">
        <label class="field-label">密码</label>
        <el-input v-model="password" type="password" size="large" show-password @keyup.enter="submit" />
      </div>

      <el-button class="green-btn" type="primary" size="large" style="width:100%;margin-top:8px" :loading="loading" @click="submit">
        登 录
      </el-button>
      <div class="login-tip">演示账号：2002 管理员 · 2005 只读查看员（密码 123456）</div>
    </div>
  </div>
</template>

<style scoped>
.login-page { height: 100%; display: flex; align-items: center; justify-content: center; background: #f0f7f2; }
.login-card { width: 420px; background: #fff; border: 1px solid #cfe3d4; border-radius: 8px; padding: 32px 32px 24px; }
.login-title { font-size: 22px; font-weight: 700; color: #14532d; text-align: left; }
.login-sub { font-size: 13px; color: #5d7f6a; text-align: left; margin: 4px 0 22px; }
.form-item { margin-bottom: 14px; }
.field-label { display: block; font-size: 13px; color: #333; margin-bottom: 6px; }
/* 姓名显示框：浅绿底矩形 */
.name-box { min-height: 44px; display: flex; align-items: center; padding: 0 12px; background: #e8f5ee; border: 1px solid #cfe3d4; border-radius: 4px; margin-bottom: 14px; font-size: 15px; }
.name-box.empty { background: #f4f9f6; }
.name-found { color: #1f2d27; font-weight: 500; }
.name-notfound { color: #c0392b; }
.login-tip { margin-top: 14px; font-size: 12px; color: #8aa698; text-align: center; }
</style>
