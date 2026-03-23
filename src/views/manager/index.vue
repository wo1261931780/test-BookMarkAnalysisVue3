<template>
  <div class="manager-container" @click="closeContextMenu">
    <!-- 左侧目录树 -->
    <div class="sidebar-tree">
      <div class="tree-header">
        <span>书签资源管理器</span>
        <el-button type="primary" link @click="openCreateFolderDialog('root')" style="float: right; margin-top: 5px;">+ 新建根侧目录</el-button>
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
          draggable
          :allow-drop="allowDrop"
          @node-click="handleNodeClick"
          @node-drop="handleDrop"
          @node-contextmenu="handleContextMenu"
          empty-text="无文件夹数据"
        >
          <template #default="{ node }">
            <span class="custom-tree-node">
              <el-icon style="color: #E6A23C; margin-right: 5px;"><Folder /></el-icon>
              <span style="user-select: none;">{{ node.label }}</span>
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
          <el-button type="success" size="small" @click="aiDialogVisible = true">🤖 智能AI归类(全局/选中)</el-button>
          <el-button type="primary" size="small" @click="openCreateFolderDialog(currentFolderId === 'root' ? null : currentFolderId)" v-if="currentFolderId">新建目录</el-button>
          <el-button type="danger" size="small" :disabled="selectedRows.length === 0" @click="handleBatchDelete">批量删除</el-button>
        </div>
      </div>
      
      <div class="content-body">
        <el-table
          :data="currentChildren"
          style="width: 100%"
          height="calc(100vh - 120px)"
          v-loading="loading"
          @row-dblclick="handleRowDblClick"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column label="名称 / 标题" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <el-icon v-if="row.type === 'h3'" style="color: #E6A23C; margin-right: 8px; font-size: 16px;"><Folder /></el-icon>
              <el-icon v-else style="color: #409EFF; margin-right: 8px; font-size: 16px;"><Link /></el-icon>
              {{ row.title || '未命名' }}
            </template>
          </el-table-column>
          <el-table-column prop="href" label="超链接解析地址" min-width="300" show-overflow-tooltip>
            <template #default="{ row }">
               <a v-if="row.href" :href="row.href" target="_blank" @click.stop class="link-text">{{ row.href }}</a>
               <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
               <el-button link type="primary" size="small" @click="openRenameDialog(row)">改名</el-button>
               <el-button link type="danger" size="small" @click="handleSingleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 右键菜单 -->
    <ul v-show="contextMenuVisible" :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }" class="context-menu">
      <li @click="openCreateFolderDialog(currentContextNode?.id)"><el-icon><FolderAdd /></el-icon> 新建子目录</li>
      <li @click="openRenameDialog(currentContextNode)"><el-icon><EditPen /></el-icon> 重命名</li>
      <li class="separator"></li>
      <li style="color: red" @click="handleSingleDelete(currentContextNode)"><el-icon><Delete /></el-icon> 删除</li>
    </ul>

    <!-- 通用弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="30%">
      <el-input v-model="dialogInput" @keyup.enter="submitDialog" placeholder="请输入..." />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitDialog" :loading="apiLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- AI 智能洗牌弹窗 -->
    <AiCategorizeDialog 
      v-model="aiDialogVisible" 
      :selected-bookmarks="aiBookmarksToProcess" 
      :is-global-mode="selectedRows.length === 0"
      @applied="fetchData" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { Folder, Link, FolderAdd, EditPen, Delete } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { ElTree, ElMessage, ElMessageBox } from 'element-plus'
import AiCategorizeDialog from './ai-categorize-dialog.vue'

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
const apiLoading = ref(false)

const allData = ref<BookmarkNode[]>([])
const folderTree = ref<BookmarkNode[]>([])

const currentFolderId = ref<number | string | 'root' | null>(null)
const selectedRows = ref<BookmarkNode[]>([])

// Context Menu State
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const currentContextNode = ref<BookmarkNode | null>(null)

// Dialog State
const dialogVisible = ref(false)
const aiDialogVisible = ref(false)
const dialogTitle = ref('')
const dialogInput = ref('')
let dialogAction: 'create' | 'rename' | null = null
let dialogTargetNode: BookmarkNode | null = null
let dialogParentId: any = null

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
  path.unshift({ id: 'root', title: '根书签库', type: 'h3', parentId: null, sortOrder: 0 })
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
    const foldersOnly = list.filter(item => item.type === 'h3')
    folderTree.value = buildTreeFast(foldersOnly)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const buildTreeFast = (list: BookmarkNode[]): BookmarkNode[] => {
  const map: Record<string, any> = {}
  const roots: any[] = []

  for (const node of list) {
    map[node.id] = { ...node, children: [] }
  }

  for (const node of list) {
    const parentId = node.parentId
    if (parentId && parentId !== '0' && parentId !== 0 && map[parentId]) {
      map[parentId].children.push(map[node.id])
    } else {
      roots.push(map[node.id])
    }
  }

  const sortTree = (nodes: any[]) => {
    nodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    for (const n of nodes) {
      if (n.children.length > 0) sortTree(n.children)
      else delete n.children
    }
  }
  
  sortTree(roots)
  return roots
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

const aiBookmarksToProcess = computed(() => {
  if (selectedRows.value.length > 0) return selectedRows.value
  return allData.value.filter(n => n.type === 'a')
})

const handleSelectionChange = (val: BookmarkNode[]) => {
  selectedRows.value = val
}

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
  } else if (row.href) {
    window.open(row.href, '_blank')
  }
}

// ---------------- Drag and Drop API ----------------
const allowDrop = (draggingNode: any, dropNode: any, type: string) => {
  // Only allow dropping "into" a folder, not "before" or "after" if it breaks structural pureness, 
  // but let's allow "inner", "prev", "next" generally on tree since tree is all folders
  return true
}

const handleDrop = async (draggingNode: any, dropNode: any, dropType: string, ev: any) => {
  const draggedId = draggingNode.data.id
  let targetParentId = null
  let sortOrder = draggingNode.data.sortOrder || 0

  if (dropType === 'inner') {
    targetParentId = dropNode.data.id
  } else {
    targetParentId = dropNode.data.parentId || 0
  }

  try {
    const formData = new FormData()
    formData.append('nodeId', draggedId)
    formData.append('targetParentId', targetParentId === 'root' ? '0' : targetParentId == null ? '0' : String(targetParentId))
    formData.append('sortOrder', String(sortOrder))
    
    await request.post('/BookMarks/move', formData)
    ElMessage.success('移动成功')
    fetchData() // Simple brutal full refresh for data consistency
  } catch (error) {
    ElMessage.error('节点移动失败')
    fetchData() // Restore visual state
  }
}

const handleContextMenu = (e: Event, data: BookmarkNode, node: any, nodeInstance: any) => {
  e.preventDefault()
  const mouseEvent = e as MouseEvent
  contextMenuX.value = mouseEvent.clientX
  contextMenuY.value = mouseEvent.clientY
  contextMenuVisible.value = true
  currentContextNode.value = data
}

const closeContextMenu = () => {
  contextMenuVisible.value = false
}

// ---------------- Edit / Create Nodes API ----------------
const openCreateFolderDialog = (parentId: any) => {
  dialogAction = 'create'
  dialogParentId = parentId === 'root' ? null : parentId
  dialogTitle.value = '新建目录'
  dialogInput.value = ''
  dialogVisible.value = true
}

const openRenameDialog = (node: any) => {
  dialogAction = 'rename'
  dialogTargetNode = node
  dialogTitle.value = '重命名 [' + node.title + ']'
  dialogInput.value = node.title
  dialogVisible.value = true
}

const submitDialog = async () => {
  if (!dialogInput.value.trim()) {
    ElMessage.warning('请输入名称')
    return
  }
  apiLoading.value = true
  try {
    const formData = new FormData()
    if (dialogAction === 'create') {
        formData.append('parentId', dialogParentId == null ? '0' : String(dialogParentId))
        formData.append('folderName', dialogInput.value)
        await request.post('/BookMarks/createFolder', formData)
        ElMessage.success('创建成功')
    } else if (dialogAction === 'rename') {
        formData.append('nodeId', String(dialogTargetNode!.id))
        formData.append('newTitle', dialogInput.value)
        await request.post('/BookMarks/rename', formData)
        ElMessage.success('重命名成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    apiLoading.value = false
  }
}

// ---------------- Delete Nodes API ----------------
const handleSingleDelete = (node: any) => {
  ElMessageBox.confirm(`确定要删除 ${node.title} 吗？相关子节点也会被解绑关联！`, '危险', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await request.post('/BookMarks/deleteNodes', [node.id])
      ElMessage.success('已删除')
      fetchData()
    } catch {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const handleBatchDelete = () => {
  ElMessageBox.confirm(`确定要移除选中的 ${selectedRows.value.length} 个节点吗？`, '高危操作', {
    confirmButtonText: '强制删除',
    cancelButtonText: '取消稍后再说',
    type: 'error',
  }).then(async () => {
    try {
      const ids = selectedRows.value.map(r => r.id)
      await request.post('/BookMarks/deleteNodes', ids)
      ElMessage.success('已成功清洗对象')
      fetchData()
    } catch {
      ElMessage.error('删除中断')
    }
  }).catch(() => {})
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
  position: relative;
}
.sidebar-tree {
  width: 330px;
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

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  z-index: 3000;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  padding: 4px 0;
  margin: 0;
  list-style: none;
  min-width: 140px;
}
.context-menu li {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: center;
}
.context-menu li .el-icon {
  margin-right: 8px;
}
.context-menu li:hover {
  background-color: #f5f7fa;
  color: #409EFF;
}
.context-menu .separator {
  height: 1px;
  background-color: #e4e7ed;
  margin: 4px 0;
  padding: 0;
}
.context-menu .separator:hover {
  background-color: #e4e7ed;
}
</style>
