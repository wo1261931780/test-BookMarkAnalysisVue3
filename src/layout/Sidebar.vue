<template>
  <div class="sidebar">
    <div class="logo-container">
      <el-icon class="logo-icon"><Platform /></el-icon>
      <span class="logo-title">书签分析与管理</span>
    </div>
    <el-menu
      :default-active="activeMenu"
      background-color="#2b2f3a"
      text-color="#bfcbd9"
      active-text-color="#409EFF"
      router
      style="border-right: none"
    >
      <el-menu-item index="/dashboard">
        <el-icon><DataBoard /></el-icon>
        <template #title>仪表盘统计</template>
      </el-menu-item>
      
      <el-menu-item index="/import">
        <el-icon><Upload /></el-icon>
        <template #title>导入书签数据</template>
      </el-menu-item>

      <el-menu-item index="/tree">
        <el-icon><Guide /></el-icon>
        <template #title>树状文件夹浏览</template>
      </el-menu-item>

      <el-menu-item index="/list">
        <el-icon><List /></el-icon>
        <template #title>全量数据检索</template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Platform,
  DataBoard,
  Upload,
  Guide,
  List
} from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
}
.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 1px;
  background: #23262e;
}
.logo-icon {
  margin-right: 8px;
  font-size: 24px;
  color: #409EFF;
}
</style>
