<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>全量数据检索</span>
      </div>
    </template>

    <div class="filter-container" style="margin-bottom: 20px;">
      <el-form :inline="true" :model="listQuery">
        <el-form-item label="关键字">
          <el-input v-model="listQuery.keyword" placeholder="书签名称 / 网址" clearable />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="listQuery.type" placeholder="全部类型" clearable style="width: 120px">
            <el-option label="文件夹" value="h3" />
            <el-option label="链接" value="a" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleFilter">搜索过滤</el-button>
          <el-button :icon="Download" @click="handleExport" type="success">导出标准 HTML书签</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="paginatedList" style="width: 100%" v-loading="loading" border stripe height="500">
      <el-table-column prop="id" label="内建ID" width="180" />
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <el-icon v-if="row.type === 'h3'" style="color: #E6A23C; margin-right: 5px;"><Folder /></el-icon>
          <el-icon v-if="row.type === 'a'" style="color: #409EFF; margin-right: 5px;"><Link /></el-icon>
          {{ row.title || '未命名' }}
        </template>
      </el-table-column>
      <el-table-column prop="href" label="超链接地址" min-width="300" show-overflow-tooltip>
        <template #default="{ row }">
          <a v-if="row.href" :href="row.href" target="_blank" style="color: #409EFF; text-decoration: none;">
            {{ row.href }}
          </a>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="addDate" label="存入时间戳" width="180">
        <template #default="{ row }">
          {{ formatTime(row.addDate) }}
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container" style="margin-top: 20px; text-align: right;">
      <el-pagination
        v-model:current-page="listQuery.page"
        v-model:page-size="listQuery.limit"
        :page-sizes="[10, 20, 50, 100, 500]"
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Search, Download, Folder, Link } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const listQuery = ref({
  page: 1,
  limit: 50,
  keyword: '',
  type: ''
})

const loading = ref(false)
const fullList = ref<any[]>([])
const filteredList = ref<any[]>([])

const total = computed(() => filteredList.value.length)
const paginatedList = computed(() => {
  const start = (listQuery.value.page - 1) * listQuery.value.limit
  const end = start + listQuery.value.limit
  return filteredList.value.slice(start, end)
})

const getList = async () => {
  loading.value = true
  try {
    const res: any = await request.get('/bookMarks/list')
    fullList.value = res.data?.records || res.data || res || []
    handleFilter()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleFilter = () => {
  listQuery.value.page = 1
  filteredList.value = fullList.value.filter(item => {
    let matchKw = true
    let matchType = true
    if (listQuery.value.keyword) {
      const kw = listQuery.value.keyword.toLowerCase()
      matchKw = (item.title && item.title.toLowerCase().includes(kw)) ||
                (item.href && item.href.toLowerCase().includes(kw))
    }
    if (listQuery.value.type) {
      matchType = item.type === listQuery.value.type
    }
    return matchKw && matchType
  })
}

const handleSizeChange = (val: number) => {
  listQuery.value.limit = val
}

const handleCurrentChange = (val: number) => {
  listQuery.value.page = val
}

const handleExport = async () => {
  try {
    ElMessage.info('准备导出书签，请稍后...')
    const res: any = await request.get('/bookmarks/export/html', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data || res]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'exported_bookmarks.html')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('成功触发下载')
  } catch (error) {
    console.error('导出书签失败', error)
    ElMessage.error('触发下载失败')
  }
}

function formatTime(timestamp: number | null) {
  if (!timestamp) return '无记录'
  return new Date(timestamp * 1000).toLocaleString()
}

onMounted(() => {
  getList()
})
</script>
