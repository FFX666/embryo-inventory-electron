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
      <div class="login-title">胚胎实验室库存管理</div>
      <div class="login-sub">试剂耗材出入库 · 权限分级 · 全程留痕</div>
      <el-form @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="username" placeholder="工号" size="large" @input="onUsernameInput" autofocus />
        </el-form-item>

        <!-- 姓名占位区：上下两段空白，找到工号时名字居中显示 -->
        <div class="name-zone">
          <div v-if="nameStatus === 'found'" class="name-found">{{ displayName }}</div>
          <div v-else-if="nameStatus === 'notfound'" class="name-notfound">未找到该工号</div>
        </div>

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
.login-sub { font-size: 13px; color: #5d7f6a; text-align: center; margin: 6px 0 10px; }
/* 姓名显示区：固定高度，上下两段空白把名字夹在中间 */
.name-zone { height: 80px; display: flex; align-items: center; justify-content: center; margin: 8px 0 8px; border-top: 1px dashed #d4e6db; border-bottom: 1px dashed #d4e6db; }
.name-found { font-size: 18px; color: #1a7a48; font-weight: 600; letter-spacing: 2px; }
.name-notfound { font-size: 14px; color: #b91c1c; }
.login-tip { margin-top: 14px; font-size: 12px; color: #8aa698; text-align: center; }
</style>
