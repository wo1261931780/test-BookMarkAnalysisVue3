import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '仪表盘统计' }
      },
      {
        path: 'import',
        name: 'Import',
        component: () => import('@/views/import/index.vue'),
        meta: { title: '导入书签数据' }
      },
      {
        path: 'manager',
        name: 'Manager',
        component: () => import('@/views/manager/index.vue'),
        meta: { title: '高级资源管理器' }
      },
      {
        path: 'toolbox',
        name: 'Toolbox',
        component: () => import('@/views/toolbox/index.vue'),
        meta: { title: '管家工具箱' }
      },
      {
        path: 'tree',
        name: 'Tree',
        component: () => import('@/views/tree/index.vue'),
        meta: { title: '树状文件夹浏览' }
      },
      {
        path: 'list',
        name: 'List',
        component: () => import('@/views/list/index.vue'),
        meta: { title: '全量数据检索' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
