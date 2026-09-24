"use strict";
/**
 * 预加载脚本：通过 contextBridge 向渲染进程暴露安全的 window.api。
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  auth: {
    login: (u, p) => ipcRenderer.invoke("auth:login", { username: u, password: p }),
    current: () => ipcRenderer.invoke("auth:current"),
    logout: () => ipcRenderer.invoke("auth:logout"),
    changePassword: (oldPwd, nwPwd) => ipcRenderer.invoke("auth:changePassword", { old: oldPwd, nw: nwPwd }),
  },
  users: {
    list: () => ipcRenderer.invoke("users:list"),
    save: (p) => ipcRenderer.invoke("users:save", p),
  },
  options: {
    list: () => ipcRenderer.invoke("options:list"),
    get: (type) => ipcRenderer.invoke("options:get", type),
    save: (type, values) => ipcRenderer.invoke("options:save", { type, values }),
  },
  materials: {
    list: () => ipcRenderer.invoke("materials:list"),
    save: (p) => ipcRenderer.invoke("materials:save", p),
    toggle: (id) => ipcRenderer.invoke("materials:toggle", id),
  },
  inbound: {
    list: () => ipcRenderer.invoke("inbound:list"),
    add: (p) => ipcRenderer.invoke("inbound:add", p),
    void: (id) => ipcRenderer.invoke("inbound:void", id),
  },
  outbound: {
    list: () => ipcRenderer.invoke("outbound:list"),
    batches: (materialId) => ipcRenderer.invoke("outbound:batches", materialId),
    add: (p) => ipcRenderer.invoke("outbound:add", p),
    void: (id) => ipcRenderer.invoke("outbound:void", id),
  },
  stock: {
    table: () => ipcRenderer.invoke("stock:table"),
    fix: (p) => ipcRenderer.invoke("stock:fix", p),
    diffs: () => ipcRenderer.invoke("stock:diffs"),
  },
  query: {
    records: (f) => ipcRenderer.invoke("query:records", f),
  },
  dashboard: {
    stats: () => ipcRenderer.invoke("dashboard:stats"),
    stock: () => ipcRenderer.invoke("dashboard:stock"),
  },
  logs: {
    list: (f) => ipcRenderer.invoke("logs:list", f),
  },
  backup: {
    create: () => ipcRenderer.invoke("backup:create"),
    list: () => ipcRenderer.invoke("backup:list"),
    restore: (file) => ipcRenderer.invoke("backup:restore", file),
  },
  export: {
    workbook: (sheetData, defaultName) => ipcRenderer.invoke("export:workbook", { sheetData, defaultName }),
    zip: (files, defaultName) => ipcRenderer.invoke("export:zip", { files, defaultName }),
  },
});
