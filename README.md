# 胚胎实验室库存管理（Electron 版）

使用 **Electron + Vue 3 + Element Plus + SQLite3** 实现的桌面端试剂耗材库存管理软件，
完整复刻视频演示的 10 大功能模块，绿色主题界面。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面框架 | Electron 33 |
| 前端 | Vue 3 + Vite + Element Plus + vue-router |
| 数据库 | SQLite3（better-sqlite3，同步 API，事务） |
| 报表导出 | SheetJS (xlsx) + JSZip |
| 条码打印 | JsBarcode（Code128） |
| 打包 | electron-builder（NSIS 安装包 / 单文件 exe） |

## 功能模块（与原软件对应）

1. **登录**：工号 + 密码，输入工号自动显示姓名；角色分级（管理员 / 普通入库员 / 只读查看员）
2. **工作台**：库存概况统计（档案 / 低库存 / 临期 / 过期 / 今日操作）+ 实时库存总表（状态筛选）
3. **基础档案**：耗材档案录入（编号 / 名称 / 规格 / 厂家 / 分类 / 储存条件 / 单位 / 预警数量 / 货架等）+ 修改 / 停用 / **条码打印**
4. **入库管理**：新增入库（批号 / 效期 / 数量 / 供应商 / 经手人，支持扫码枪录入）+ 记录作废（自动扣回批次库存）
5. **出库领用**：**系统自动推荐优先批次（FEFO 效期优先）**、切换批号、经手人 + 核对人双人确认、领用追溯批号、作废回补
6. **库存盘点**：账面 vs 实盘核对、差异记录与修正
7. **查询中心**：组合模糊搜索（名称 / 分类 / 经手人 / 日期区间），入库 / 出库双结果
8. **报表导出**：6 张报表（基础档案 / 入库表 / 出库表 / 库存总表 / 盘点差异表 / 操作日志）+ **一键导出全部 zip**，出库表可追溯批号
9. **备份恢复**：一键备份数据库到 `data/backups/`，恢复前自动再备份当前库
10. **操作日志**：登录 / 新增 / 修改 / 作废全程留痕，不可删除，多维筛选
11. **系统设置**：修改密码、账号权限管理（新增 / 重置密码 / 调整角色 / 启停）、下拉选项维护

## 角色权限矩阵

| 模块 | 管理员 | 普通入库员 | 只读查看员 |
| --- | :-: | :-: | :-: |
| 工作台 / 档案(查看) / 查询 / 报表 / 日志 / 条码 | ✔ | ✔ | ✔ |
| 入库 / 出库 / 盘点 | ✔ | ✔ | ✘（菜单隐藏） |
| 档案新增 / 修改 / 停用 | ✔ | ✔ | ✘（服务端拦截） |
| 备份恢复 / 系统设置 | ✔ | ✘ | ✘ |

## 本地运行（开发）

```bash
npm install
npm run dev          # 启动 Vite 开发服务器
npm run start        # 另开终端启动 Electron（加载 dev server）
```

首次运行自动初始化数据库（5 个演示账号、21 个耗材档案、出入库样例）。

演示账号：2002 刘婕(管理员) / 2005 王静(只读查看员) / 2001 黎铁娥(入库员)，密码 `123456`。

## 构建 Windows EXE（GitHub Actions）

仓库内置 `.github/workflows/build-exe.yml`：推送到 GitHub 后自动在
Windows runner 上执行 `npm install` → `npm run build:vite` →
`npm run dist`（electron-builder 编译，自动 rebuild better-sqlite3 原生模块），
产物为 NSIS 安装包（`dist/*.exe`）。

三步获取：

1. **上传**：GitHub 新建仓库 → 推送本工程
   ```bash
   git init && git add . && git commit -m "胚胎实验室库存管理"
   git branch -M main && git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   ```
2. **触发**：推送后 Actions 自动构建；也可在 Actions 页手动 "Run workflow"
3. **下载**：构建成功后进入该次运行页面 → Artifacts 下载 `胚胎实验室库存管理-exe`

> 打 tag 可自动发布到 Releases：`git tag v1.0 && git push --tags`

## 本地构建（需 Windows）

```bash
npm install
npm run build:vite
npm run dist        # 产物在 dist/ 目录
```

## 数据位置

- 开发模式：项目根 `data/`
- 打包后：Windows `%APPDATA%\胚胎实验室库存管理\data\`（备份在 `data/backups/`）

## 目录结构

```
src/
├── main/
│   ├── index.js      # Electron 主进程（窗口 / IPC）
│   ├── db.js         # SQLite 数据层（建表 / 种子 / 业务 SQL / 日志）
│   └── exporter.js   # Excel 导出 / 一键 zip
├── preload.js        # contextBridge 安全桥
└── renderer/         # Vue 3 前端
    ├── main.js       # 入口 + 路由 + 登录守卫
    ├── App.vue       # 绿色主题布局 / 权限菜单
    └── views/        # 11 个功能页面
```
