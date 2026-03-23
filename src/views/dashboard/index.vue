<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card blue-card">
          <div class="stat-icon"><el-icon><DataLine /></el-icon></div>
          <div class="stat-content">
            <div class="stat-title">总解析书签元件</div>
            <div class="stat-value">
              <el-statistic :value="summary.total" />
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card green-card">
          <div class="stat-icon"><el-icon><Link /></el-icon></div>
          <div class="stat-content">
            <div class="stat-title">有效外跳锚点</div>
            <div class="stat-value">
              <el-statistic :value="summary.links" />
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card warning-card">
          <div class="stat-icon"><el-icon><FolderOpened /></el-icon></div>
          <div class="stat-content">
            <div class="stat-title">分类收藏夹目录</div>
            <div class="stat-value">
              <el-statistic :value="summary.folders" />
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card red-card">
          <div class="stat-icon"><el-icon><Warning /></el-icon></div>
          <div class="stat-content">
            <div class="stat-title">冗余重复 URL</div>
            <div class="stat-value error-color">
              <el-statistic :value="summary.duplicates" value-style="color: red; font-weight: bold" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span style="font-weight: bold;"><el-icon><DataAnalysis /></el-icon> 核心信息源供给分布 (Top 20 域名)</span>
            </div>
          </template>
          <div ref="barChartRef" style="height: 400px; width: 100%;"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span style="font-weight: bold;"><el-icon><PieChart /></el-icon> 资源库占比健康度</span>
            </div>
          </template>
          <div ref="pieChartRef" style="height: 250px; width: 100%;"></div>
          
          <el-descriptions :column="1" border size="small" style="margin-top: 25px;">
            <el-descriptions-item label="最远古书签建档">{{ formatTime(summary.earliestAddDate) }}</el-descriptions-item>
            <el-descriptions-item label="最新书签收录境">{{ formatTime(summary.latestAddDate) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span style="font-weight: bold; color: #F56C6C"><el-icon><Link /></el-icon> 发现 {{ summary.duplicates }} 条重复收录的冗余URL (建议整理规避空间浪费)</span>
            </div>
          </template>
          <el-table :data="paginatedDuplicates" border style="width: 100%" height="300">
            <el-table-column type="index" width="60" label="序号" align="center" />
            <el-table-column prop="url" label="重复锚定地址 (URL)">
              <template #default="{ row }">
                <a :href="row" target="_blank" style="color: #409EFF; text-decoration: none;">{{ row }}</a>
              </template>
            </el-table-column>
          </el-table>
          
          <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
             <el-pagination 
               v-model:current-page="currentPage" 
               :page-size="pageSize" 
               layout="total, prev, pager, next" 
               :total="summary.duplicateUrls ? summary.duplicateUrls.length : 0" 
             />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'
import { DataLine, Link, FolderOpened, Warning, DataAnalysis, PieChart } from '@element-plus/icons-vue'

const summary = ref({
  total: 0,
  links: 0,
  folders: 0,
  duplicates: 0,
  duplicateUrls: [] as string[],
  domainDistribution: {} as Record<string, number>,
  earliestAddDate: null as number | null,
  latestAddDate: null as number | null
})

const barChartRef = ref<HTMLElement | null>(null)
const pieChartRef = ref<HTMLElement | null>(null)

const currentPage = ref(1)
const pageSize = ref(10)

const paginatedDuplicates = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = currentPage.value * pageSize.value
  return summary.value.duplicateUrls.slice(start, end)
})

const fetchData = async () => {
  try {
    const res: any = await request.get('/BookMarks/analyze')
    if (res.code === 200 && res.data) {
       summary.value = res.data
    } else {
       summary.value = res.data || res
    }
    renderCharts()
  } catch (e) {
    console.error(e)
  }
}

const renderCharts = () => {
  if (barChartRef.value) {
    const barChart = echarts.init(barChartRef.value)
    const data = summary.value.domainDistribution || {}
    const sortedEntries = Object.entries(data).sort((a: any, b: any) => b[1] - a[1]).slice(0, 20)
    
    barChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', boundaryGap: [0, 0.01] },
      yAxis: { type: 'category', data: sortedEntries.map(e => e[0]).reverse(), axisLabel: { fontSize: 11, width: 100, overflow: 'truncate' } },
      series: [
        {
          name: '引用数量',
          type: 'bar',
          data: sortedEntries.map(e => e[1]).reverse(),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' }
            ])
          }
        }
      ]
    })
  }

  if (pieChartRef.value) {
    const pieChart = echarts.init(pieChartRef.value)
    pieChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: '0%', left: 'center' },
      series: [
        {
          name: '实体类型分布',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 16, fontWeight: 'bold' }
          },
          labelLine: { show: false },
          data: [
            { value: summary.value.links, name: '有效直达链接', itemStyle: { color: '#67C23A' } },
            { value: summary.value.folders, name: '多级收录文件夹', itemStyle: { color: '#E6A23C' } }
          ]
        }
      ]
    })
  }
}

function formatTime(timestamp: number | null) {
  if (!timestamp || timestamp === 0) return '无时间戳捕获'
  return new Date(timestamp * 1000).toLocaleString()
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard-container {
  padding: 15px;
  background-color: #f2f3f5;
  min-height: calc(100vh - 84px);
}
.stat-card {
  border: none;
  border-radius: 8px;
}
.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  padding: 24px;
}
.stat-icon {
  font-size: 48px;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
}
.stat-content {
  flex: 1;
}
.stat-title {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 8px;
}
.blue-card .stat-icon { background: #e6f1fc; color: #409EFF; }
.green-card .stat-icon { background: #f0f9eb; color: #67C23A; }
.warning-card .stat-icon { background: #fdf6ec; color: #E6A23C; }
.red-card .stat-icon { background: #fef0f0; color: #F56C6C; }

.error-color { color: #F56C6C; }
</style>
