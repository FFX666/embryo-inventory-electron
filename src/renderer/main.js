import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import "element-plus/dist/index.css";

import App from "./App.vue";
import Login from "./views/Login.vue";
import Dashboard from "./views/Dashboard.vue";
import Materials from "./views/Materials.vue";
import Inbound from "./views/Inbound.vue";
import Outbound from "./views/Outbound.vue";
import Stocktake from "./views/Stocktake.vue";
import Search from "./views/Search.vue";
import Reports from "./views/Reports.vue";
import Backup from "./views/Backup.vue";
import Logs from "./views/Logs.vue";
import Settings from "./views/Settings.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/login", component: Login },
    { path: "/", component: Dashboard },
    { path: "/materials", component: Materials },
    { path: "/inbound", component: Inbound },
    { path: "/outbound", component: Outbound },
    { path: "/stocktake", component: Stocktake },
    { path: "/search", component: Search },
    { path: "/reports", component: Reports },
    { path: "/backup", component: Backup },
    { path: "/logs", component: Logs },
    { path: "/settings", component: Settings },
  ],
});

// 未登录跳转登录页
router.beforeEach(async (to) => {
  if (to.path === "/login") return true;
  const user = await window.api.auth.current();
  if (!user) return "/login";
  return true;
});

const app = createApp(App);
app.use(router);
app.use(ElementPlus, { locale: zhCn });
app.mount("#app");
