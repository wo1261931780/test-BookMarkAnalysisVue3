<template>
  <div class="header">
    <div class="breadcrumb">
      <!-- Simple manual breadcrumb -->
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ currentRouteName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="user-info">
      <el-dropdown>
        <span class="el-dropdown-link">
          <el-avatar size="small" icon="UserFilled" style="margin-right: 8px;" />
          开发者 Admin
          <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item>后端 API: http://localhost:8000</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowDown } from '@element-plus/icons-vue'

const route = useRoute()
const currentRouteName = computed(() => route.meta.title || '当前页面')
</script>

<style scoped>
.header {
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
}
.breadcrumb {
  font-size: 14px;
}
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.el-dropdown-link {
  display: flex;
  align-items: center;
  color: #606266;
  outline: none;
}
</style>
