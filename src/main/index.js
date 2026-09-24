"use strict";
/**
 * Electron 主进程：创建窗口、注册 IPC、数据库生命周期。
 */
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const db = require("./db");

let mainWindow = null;
let currentUser = null; // 登录会话（主进程持有）

const isDev = !app.isPackaged;

/** 数据目录：生产 → userData；开发 → 项目根 data */
function dataDir() {
  if (isDev) {
    return path.join(__dirname, "..", "..", "data");
  }
  return path.join(app.getPath("userData"), "data");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: "胚胎实验室库存管理",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    // 开发模式：连 Vite dev server
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "..", "dist", "renderer", "index.html"));
  }

  mainWindow.on("closed", () => { mainWindow = null; });
}

/* ================= IPC 注册 ================= */

function registerIpc() {
  // 登录 / 会话
  ipcMain.handle("auth:login", (e, payload) => {
    const r = db.login(payload.username, payload.password);
    if (r.ok) currentUser = r.user;
    return r;
  });
  ipcMain.handle("auth:current", () => currentUser);
  ipcMain.handle("auth:logout", () => {
    if (currentUser) db.log(currentUser, "账号权限", "退出", "退出系统", `账号:${currentUser.display_name}`);
    currentUser = null;
    return { ok: true };
  });

  // 账号与密码
  ipcMain.handle("users:list", () => db.listUsers());
  ipcMain.handle("users:save", (e, p) => db.saveUser(currentUser, p));
  ipcMain.handle("auth:changePassword", (e, p) => {
    const r = db.changePassword(currentUser, p.old, p.nw);
    if (r.ok) currentUser = null; // 改密后需重新登录
    return r;
  });

  // 下拉选项
  ipcMain.handle("options:list", () => db.listOptions());
  ipcMain.handle("options:get", (e, type) => db.getOptions(type));
  ipcMain.handle("options:save", (e, p) => db.saveOption(currentUser, p.type, p.values));

  // 基础档案
  ipcMain.handle("materials:list", () => db.listMaterials(false));
  ipcMain.handle("materials:save", (e, p) => db.saveMaterial(currentUser, p));
  ipcMain.handle("materials:toggle", (e, id) => db.toggleMaterial(currentUser, id));

  // 入库
  ipcMain.handle("inbound:list", () => db.listInbound());
  ipcMain.handle("inbound:add", (e, p) => db.addInbound(currentUser, p));
  ipcMain.handle("inbound:void", (e, id) => db.voidInbound(currentUser, id));

  // 出库
  ipcMain.handle("outbound:list", () => db.listOutbound());
  ipcMain.handle("outbound:batches", (e, materialId) => db.recommendBatches(materialId));
  ipcMain.handle("outbound:add", (e, p) => db.addOutbound(currentUser, p));
  ipcMain.handle("outbound:void", (e, id) => db.voidOutbound(currentUser, id));

  // 盘点
  ipcMain.handle("stock:table", () => db.stockTable());
  ipcMain.handle("stock:fix", (e, p) => db.doStocktakeFix(currentUser, p));
  ipcMain.handle("stock:diffs", () => db.listDiffs());

  // 查询
  ipcMain.handle("query:records", (e, f) => db.queryRecords(f || {}));

  // 工作台
  ipcMain.handle("dashboard:stats", () => db.dashboardStats());
  ipcMain.handle("dashboard:stock", () => db.stockTable());

  // 日志
  ipcMain.handle("logs:list", (e, f) => db.listLogs(f || {}));

  // 备份恢复
  ipcMain.handle("backup:create", () => db.backup(currentUser));
  ipcMain.handle("backup:list", () => db.listBackups());
  ipcMain.handle("backup:restore", (e, file) => db.restore(currentUser, file));

  // 报表导出（弹保存对话框后写文件）
  ipcMain.handle("export:workbook", async (e, payload) => {
    const { sheetData, defaultName } = payload;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "导出报表",
      defaultPath: defaultName || "报表.xlsx",
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    if (canceled || !filePath) return { ok: false, msg: "已取消" };
    try {
      require("./exporter").writeWorkbook(filePath, sheetData);
      return { ok: true, path: filePath };
    } catch (err) {
      return { ok: false, msg: "导出失败：" + err.message };
    }
  });
  ipcMain.handle("export:zip", async (e, payload) => {
    const { files, defaultName } = payload;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "一键导出全部",
      defaultPath: defaultName || "全部报表.zip",
      filters: [{ name: "Zip", extensions: ["zip"] }],
    });
    if (canceled || !filePath) return { ok: false, msg: "已取消" };
    try {
      require("./exporter").writeZip(filePath, files);
      return { ok: true, path: filePath };
    } catch (err) {
      return { ok: false, msg: "导出失败：" + err.message };
    }
  });
}

/* ================= 生命周期 ================= */

app.whenReady().then(() => {
  db.initDatabase(dataDir());
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("quit", () => {
  try { db.getDb() && db.getDb().close(); } catch (_) { /* 忽略 */ }
});

module.exports = { createWindow };
