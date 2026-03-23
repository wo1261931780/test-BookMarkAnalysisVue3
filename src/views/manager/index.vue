<template>
  <div class="manager-container">
    <!-- 左侧目录树 -->
    <div class="sidebar-tree">
      <div class="tree-header">
        <span>书签资源管理器</span>
      </div>
      <div class="tree-content">
        <el-input v-model="filterText" placeholder="搜索目录..." clearable class="tree-search" />
        <el-tree
          ref="treeRef"
          :data="folderTree"
          :props="defaultProps"
          :filter-node-method="filterNode"
          node-key="id"
          highlight-current
          @node-click="handleNodeClick"
          empty-text="无文件夹数据"
        >
          <template #default="{ node, data }">
            <span class="custom-tree-node">
              <el-icon style="color: #E6A23C; margin-right: 5px;"><Folder /></el-icon>
              <span>{{ node.label }}</span>
            </span>
          </template>
        </el-tree>
      </div>
    </div>

    <!-- 右侧内容穿梭区 -->
    <div class="main-content">
      <div class="content-header">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item v-for="nav in breadcrumbs" :key="nav.id" @click="handleBreadcrumbClick(nav)">
            <a v-if="nav.id !== currentFolderId" style="cursor: pointer; font-weight: bold">{{ nav.title }}</a>
            <span v-else>{{ nav.title }}</span>
          </el-breadcrumb-item>
        </el-breadcrumb>
        <div class="actions">
          <!-- 预留操作按钮 -->
        </div>
      </div>
      
      <div class="content-body">
        <el-table
          :data="currentChildren"
          style="width: 100%"
          height="calc(100vh - 120px)"
          v-loading="loading"
          @row-dblclick="handleRowDblClick"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column label="名称" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <el-icon v-if="row.type === 'h3'" style="color: #E6A23C; margin-right: 8px; font-size: 16px;"><Folder /></el-icon>
              <el-icon v-else style="color: #409EFF; margin-right: 8px; font-size: 16px;"><Link /></el-icon>
              {{ row.title || '未命名' }}
            </template>
          </el-table-column>
          <el-table-column prop="href" label="链接地址" min-width="300" show-overflow-tooltip>
            <template #default="{ row }">
               <a v-if="row.href" :href="row.href" target="_blank" @click.stop class="link-text">{{ row.href }}</a>
               <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="addDate" label="添加时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.addDate) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Folder, Link } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { ElTree } from 'element-plus'

interface BookmarkNode {
  id: number | string | 'root'
  title: string
  type: string
  href?: string
  parentId: number | string | null
  sortOrder: number
  children?: BookmarkNode[]
}

const filterText = ref('')
const treeRef = ref<InstanceType<typeof ElTree>>()
const loading = ref(false)

const allData = ref<BookmarkNode[]>([])
const folderTree = ref<BookmarkNode[]>([])

const currentFolderId = ref<number | string | 'root' | null>(null)

const breadcrumbs = computed(() => {
  const path: BookmarkNode[] = []
  let currId = currentFolderId.value
  while (currId && currId !== 'root') {
    const node = allData.value.find(n => String(n.id) === String(currId))
    if (node) {
      path.unshift(node)
      currId = node.parentId
    } else {
      break
    }
  }
  path.unshift({ id: 'root', title: '根目录', type: 'h3', parentId: null, sortOrder: 0 })
  return path
})

const defaultProps = {
  children: 'children',
  label: 'title',
}

watch(filterText, (val) => {
  treeRef.value!.filter(val)
})

const filterNode = (value: string, data: any) => {
  if (!value) return true
  return data.title?.includes(value)
}

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await request.get('/BookMarks/all')
    let list = res.data?.records || res.data || res || []
    if (!Array.isArray(list)) list = []
    
    allData.value = list
    
    // Build tree using ONLY folders
    const foldersOnly = list.filter(item => item.type === 'h3')
    folderTree.value = buildTree(foldersOnly, null)
    
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const buildTree = (list: BookmarkNode[], parentId: number | string | null): BookmarkNode[] => {
  const currentLevelNodes = list
      .filter((node) => String(node.parentId) === String(parentId) || (!node.parentId && (!parentId || parentId === 'root' || parentId === 0)))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      
  return currentLevelNodes.map((node) => {
    const children = buildTree(list, node.id)
    return {
      ...node,
      children: children.length > 0 ? children : undefined
    }
  })
}

const currentChildren = computed(() => {
  const pid = currentFolderId.value === 'root' ? null : currentFolderId.value
  return allData.value
    .filter(node => String(node.parentId) === String(pid) || (!node.parentId && (!pid || pid === 0)))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'h3' ? -1 : 1
      return (a.sortOrder || 0) - (b.sortOrder || 0)
    })
})

const handleNodeClick = (data: BookmarkNode) => {
  currentFolderId.value = data.id
}

const handleBreadcrumbClick = (nav: BookmarkNode) => {
  currentFolderId.value = nav.id
  if (nav.id !== 'root') {
    treeRef.value?.setCurrentKey(nav.id as any)
  } else {
    treeRef.value?.setCurrentKey(null as any)
  }
}

const handleRowDblClick = (row: BookmarkNode) => {
  if (row.type === 'h3') {
    currentFolderId.value = row.id
    treeRef.value?.setCurrentKey(row.id as any)
    // optionally expand the tree node visually if it helps
  } else if (row.href) {
    window.open(row.href, '_blank')
  }
}

function formatTime(timestamp: number | null) {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleString()
}

onMounted(() => {
  fetchData()
  currentFolderId.value = 'root'
})
</script>

<style scoped>
.manager-container {
  display: flex;
  height: calc(100vh - 100px);
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
}
.sidebar-tree {
  width: 300px;
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
}
.tree-header {
  height: 40px;
  line-height: 40px;
  padding: 0 15px;
  background-color: #f5f7fa;
  font-weight: bold;
  font-size: 14px;
  border-bottom: 1px solid #e6e6e6;
}
.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}
.tree-search {
  margin-bottom: 10px;
}
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.content-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e6e6e6;
}
.content-body {
  flex: 1;
  overflow: hidden;
}
.custom-tree-node {
  font-size: 14px;
  display: flex;
  align-items: center;
}
.link-text {
  color: #409EFF;
  text-decoration: none;
}
.link-text:hover {
  text-decoration: underline;
}
</style>
