<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";

const router = useRouter();
const username = ref("");
const password = ref("");
const loading = ref(false);
const displayName = ref("");
const options = ref({ 分类: [], 储存条件: [], 货架: [] });

onMounted(async () => {
  // 工号输入即时显示姓名（与原软件一致）
  const users = await window.api.users.list();
  window._users = users;
  options.value = await window.api.options.list();
});

function onUsernameInput() {
  const u = (window._users || []).find((x) => x.username === username.value);
  displayName.value = u ? u.display_name : "";
}

async function submit() {
  if (!username.value || !password.value) {
    ElMessage.warning("请输入工号和密码");
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
      <div class="login-title">胚胎实验室库存管理</div>
      <div class="login-sub">试剂耗材出入库 · 权限分级 · 全程留痕</div>
      <el-form @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="username" placeholder="工号" size="large" @input="onUsernameInput" autofocus />
        </el-form-item>
        <el-form-item v-if="displayName" class="name-hint">账号：{{ displayName }}</el-form-item>
        <el-form-item>
          <el-input v-model="password" placeholder="密码" type="password" size="large" show-password @keyup.enter="submit" />
        </el-form-item>
        <el-button class="green-btn" type="primary" size="large" style="width:100%" :loading="loading" @click="submit">
          登 录
        </el-button>
      </el-form>
      <div class="login-tip">演示账号：2002 管理员 · 2005 只读查看员（密码 123456）</div>
    </div>
  </div>
</template>

<style scoped>
.login-page { height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #14532d 0%, #1a7a48 55%, #4d8f66 100%); }
.login-card { width: 380px; background: #fff; border-radius: 14px; padding: 38px 36px 26px; box-shadow: 0 10px 40px rgba(0,0,0,.18); }
.login-title { font-size: 22px; font-weight: 700; color: #14532d; text-align: center; }
.login-sub { font-size: 13px; color: #5d7f6a; text-align: center; margin: 6px 0 24px; }
.name-hint { margin: -6px 0 0; font-size: 13px; color: #1a7a48; }
.login-tip { margin-top: 14px; font-size: 12px; color: #8aa698; text-align: center; }
</style>
