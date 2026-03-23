<template>
  <el-card shadow="never" class="tree-container">
    <template #header>
      <div class="card-header">
        <span>层级书签树</span>
      </div>
    </template>
    
    <div class="filter-container">
      <el-input v-model="filterText" style="width: 300px" placeholder="输入关键字过滤" clearable />
    </div>

    <el-tree
      ref="treeRef"
      class="filter-tree"
      :data="treeData"
      :props="defaultProps"
      :filter-node-method="filterNode"
      node-key="id"
      style="margin-top: 20px;"
      empty-text="暂无数据，请尝试通过后端接口加载"
    >
      <template #default="{ node, data }">
        <span class="custom-tree-node">
          <el-icon style="margin-right: 5px; color: #E6A23C;" v-if="data.type === 'h3'"><Folder /></el-icon>
          <el-icon style="margin-right: 5px; color: #409EFF;" v-if="data.type === 'a'"><Link /></el-icon>
          
          <span>{{ node.label }}</span>
          <span v-if="data.type === 'a'" style="margin-left: 10px; color: #909399; font-size: 12px">
            <a :href="data.href" target="_blank" @click.stop class="tree-link">访问</a>
          </span>
        </span>
      </template>
    </el-tree>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Folder, Link } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { ElTree } from 'element-plus'

interface Tree {
  id: number
  title: string
  type: string
  href?: string
  parentId: number | null
  sortOrder: number
  children?: Tree[]
}

const filterText = ref('')
const treeRef = ref<InstanceType<typeof ElTree>>()
const treeData = ref<Tree[]>([])

const defaultProps = {
  children: 'children',
  label: 'title',
}

watch(filterText, (val) => {
  treeRef.value!.filter(val)
})

const filterNode = (value: string, data: any) => {
  if (!value) return true
  return data.title?.includes(value) || data.href?.includes(value)
}

const fetchTreeData = async () => {
  try {
    const res: any = await request.get('/BookMarks/all')
    let list = res.data?.records || res.data || res || []
    if (!Array.isArray(list)) list = []
    treeData.value = buildTreeFast(list)
  } catch (error) {
    console.error('获取树状数据失败', error)
  }
}

// Convert flat list to tree (O(N) Fast Algorithm)
const buildTreeFast = (list: any[]): Tree[] => {
  const map: Record<string, any> = {}
  const roots: any[] = []

  for (const node of list) {
    map[node.id] = { ...node, children: [] }
  }

  for (const node of list) {
    const parentId = node.parentId
    // In database, parentId could be null or 0 for root
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

onMounted(() => {
  fetchTreeData()
})
</script>

<style scoped>
.tree-container {
  min-height: 500px;
}
.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 14px;
}
.tree-link {
  color: #409EFF;
  text-decoration: none;
}
.tree-link:hover {
  text-decoration: underline;
}
</style>
