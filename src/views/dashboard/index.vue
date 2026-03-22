<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-title">总解析元素数</div>
          <div class="stat-value">{{ summary.totalCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-title">书签链接总数</div>
          <div class="stat-value link-color">{{ summary.linkCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-title">文件夹总数</div>
          <div class="stat-value folder-color">{{ summary.folderCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-title">重复 URL 数</div>
          <div class="stat-value error-color">{{ summary.duplicateCount }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>域名分发排行 (Top 20)</span>
            </div>
          </template>
          <div ref="chartRef" style="height: 400px; width: 100%;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" header="时间跨度">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="最旧书签收录时间">
              {{ formatTime(summary.oldestDate) }}
            </el-descriptions-item>
            <el-descriptions-item label="最新书签收录时间">
              {{ formatTime(summary.newestDate) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'

const summary = ref({
  totalCount: 0,
  linkCount: 0,
  folderCount: 0,
  duplicateCount: 0,
  duplicateUrls: [],
  domainDistribution: {},
  oldestDate: null,
  newestDate: null
})

const chartRef = ref<HTMLElement | null>(null)

const fetchData = async () => {
  try {
    const res: any = await request.get('/bookmarks/analyze')
    // Ensure the response is handled depending on how Spring wrapper responds.
    if (res.code === 200 && res.data) {
       summary.value = res.data
    } else {
       summary.value = res // Raw returned if no wrapper
    }
    renderChart()
  } catch (e) {
    console.error(e)
  }
}

const renderChart = () => {
  if (!chartRef.value) return
  const myChart = echarts.init(chartRef.value)
  const data = summary.value.domainDistribution || {}
  
  // Sort and pick top 20
  const sortedEntries = Object.entries(data).sort((a: any, b: any) => b[1] - a[1]).slice(0, 20)
  
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', boundaryGap: [0, 0.01] },
    yAxis: { type: 'category', data: sortedEntries.map(e => e[0]).reverse() },
    series: [
      {
        name: '数量',
        type: 'bar',
        data: sortedEntries.map(e => e[1]).reverse(),
        itemStyle: { color: '#409EFF' }
      }
    ]
  }
  myChart.setOption(option)
}

function formatTime(timestamp: number | null) {
  if (!timestamp) return '无记录'
  return new Date(timestamp * 1000).toLocaleString()
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard-container {
  padding: 10px;
}
.stat-title {
  font-size: 14px;
  color: #909399;
}
.stat-value {
  margin-top: 10px;
  font-size: 28px;
  font-weight: bold;
}
.link-color { color: #67C23A; }
.folder-color { color: #E6A23C; }
.error-color { color: #F56C6C; }
</style>
