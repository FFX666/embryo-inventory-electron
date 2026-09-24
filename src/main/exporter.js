"use strict";
/**
 * 报表导出：xlsx 写 Excel 文件；jszip 一键打包全部报表。
 */
const XLSX = require("xlsx");
const JSZip = require("jszip");
const fs = require("fs");

/** 生成单个 xlsx 的 Buffer（带表头样式） */
function buildSheetBuffer(columns, rows, sheetName) {
  const aoa = [columns.map((c) => c.title)];
  for (const row of rows) {
    aoa.push(columns.map((c) => row[c.key] ?? ""));
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // 简单列宽
  ws["!cols"] = columns.map((c) => ({ wch: c.width || 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/** 写一个工作簿到文件 */
function writeWorkbook(filePath, sheetData) {
  const buf = buildSheetBuffer(sheetData.columns, sheetData.rows, sheetData.sheetName || "Sheet1");
  fs.writeFileSync(filePath, buf);
}

/** 打包多个报表为一个 zip 文件 */
function writeZip(filePath, files) {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name + ".xlsx", buildSheetBuffer(f.columns, f.rows, f.name.slice(0, 31)));
  }
  return new Promise((resolve, reject) => {
    zip.generateAsync({ type: "nodebuffer" }).then((buf) => {
      fs.writeFileSync(filePath, buf);
      resolve(filePath);
    }).catch(reject);
  });
}

module.exports = { buildSheetBuffer, writeWorkbook, writeZip };
