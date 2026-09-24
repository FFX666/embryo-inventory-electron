<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const user = ref(null);

const menus = computed(() => {
  if (!user.value) return [];
  const role = user.value.role;
  const base = [
    { path: "/", title: "工作台" },
    { path: "/materials", title: "基础档案" },
  ];
  if (role !== "viewer") {
    base.push(
      { path: "/inbound", title: "入库管理" },
      { path: "/outbound", title: "出库领用" },
      { path: "/stocktake", title: "库存盘点" }
    );
  }
  base.push(
    { path: "/search", title: "查询中心" },
    { path: "/reports", title: "报表导出" }
  );
  if (role === "admin") base.push({ path: "/backup", title: "备份恢复" });
  base.push({ path: "/logs", title: "操作日志" });
  if (role === "admin") base.push({ path: "/settings", title: "系统设置" });
  return base;
});

onMounted(async () => {
  user.value = await window.api.auth.current();
});

async function logout() {
  await window.api.auth.logout();
  router.push("/login");
}
</script>

<template>
  <div v-if="!user" class="login-wrap">
    <router-view />
  </div>
  <el-container v-else class="layout">
    <el-aside width="210px" class="sidebar">
      <div class="brand">
        <div class="brand-title">胚胎实验室库存管理</div>
        <div class="brand-sub">试剂耗材出入库</div>
      </div>
      <el-menu
        :default-active="route.path"
        router
        background-color="#f0f7f2"
        text-color="#2d6a45"
        active-text-color="#ffffff"
        class="menu"
      >
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          {{ m.title }}
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="topbar">
        <div class="page-title">{{ menus.find((m) => m.path === route.path)?.title || "" }}</div>
        <div class="user-box">
          <span class="user-info">{{ user.username }}·{{ user.display_name }}·{{ user.role_name }}</span>
          <el-button v-if="user.role === 'admin'" size="small" text @click="router.push('/settings')">系统设置</el-button>
          <el-button size="small" text @click="logout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app { height: 100%; }
body { font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif; background: #f0f7f2; }
.layout { height: 100%; }
.sidebar { background: #f0f7f2; border-right: 1px solid #cfe3d4; display: flex; flex-direction: column; }
.brand { padding: 20px 16px 14px; text-align: center; }
.brand-title { font-size: 17px; font-weight: 700; color: #14532d; }
.brand-sub { font-size: 12px; color: #4d8f66; margin-top: 2px; }
.menu { border-right: none; flex: 1; }
.menu .el-menu-item { height: 46px; line-height: 46px; border-radius: 8px; margin: 2px 10px; }
.menu .el-menu-item.is-active { background: #1a7a48; }
.topbar { display: flex; align-items: center; justify-content: space-between; background: #ffffff; border-bottom: 1px solid #cfe3d4; height: 56px; padding: 0 20px; }
.page-title { font-size: 16px; font-weight: 600; color: #14532d; }
.user-box { display: flex; align-items: center; gap: 10px; }
.user-info { font-size: 13px; color: #3f6b52; }
.content { padding: 18px 22px; overflow: auto; }
.card { background: #fff; border: 1px solid #cfe3d4; border-radius: 10px; padding: 16px 18px; margin-bottom: 14px; }
.card-title { font-size: 15px; font-weight: 600; color: #14532d; margin-bottom: 12px; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 14px; }
.stat-card { background: #fff; border: 1px solid #cfe3d4; border-left: 5px solid #1a7a48; border-radius: 10px; padding: 14px 16px; }
.stat-card .num { font-size: 26px; font-weight: 700; color: #14532d; }
.stat-card .label { font-size: 13px; color: #3f6b52; }
.toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.table-wrap { background: #fff; border: 1px solid #cfe3d4; border-radius: 10px; overflow: hidden; }
.el-table { --el-table-header-bg-color: #eef6f0; --el-table-header-text-color: #14532d; }
.login-wrap { height: 100%; }
.green-btn { background: #1a7a48 !important; border-color: #1a7a48 !important; }
.green-btn:hover { background: #14532d !important; border-color: #14532d !important; }
</style>
