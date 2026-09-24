<script setup>
import { ref, onMounted, computed } from "vue";

const rows = ref([]);
const filter = ref({ module: "", keyword: "" });
const modules = ["登录", "退出", "基础档案", "入库管理", "出库领用", "库存盘点", "备份恢复", "账号权限", "系统设置"];

onMounted(load);

async function load() {
  rows.value = await window.api.logs.list(filter.value);
}
</script>

<template>
  <div>
    <div class="card">
      <div class="card-title">操作日志（全程留痕，不可删除）</div>
      <div class="toolbar">
        <el-select v-model="filter.module" placeholder="模块" clearable style="width:140px">
          <el-option v-for="m in modules" :key="m" :value="m" />
        </el-select>
        <el-input v-model="filter.keyword" placeholder="工号/姓名/详情关键词" clearable style="width:220px" />
        <el-button class="green-btn" type="primary" @click="load">查询</el-button>
      </div>
      <div class="table-wrap">
        <el-table :data="rows" size="small" height="500">
          <el-table-column prop="created_at" label="时间" width="160" />
          <el-table-column prop="username" label="工号" width="80" />
          <el-table-column prop="display_name" label="姓名" width="100" />
          <el-table-column prop="module" label="模块" width="110" />
          <el-table-column prop="action" label="操作" width="100" />
          <el-table-column prop="target" label="对象" width="160" />
          <el-table-column prop="detail" label="详情" min-width="220" />
        </el-table>
      </div>
    </div>
  </div>
</template>
