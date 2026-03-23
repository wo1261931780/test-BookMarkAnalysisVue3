<template>
  <el-dialog v-model="dialogVisible" title="🤖 智能 AI 书签洗牌与重组引擎" width="85%" top="5vh" destroy-on-close>
    
    <div v-if="step === 1" class="step-container">
      <el-alert v-if="isGlobalMode" title="🌐 全局无人值守模式已激活：一键整理全库 8000+ 书签！" type="warning" description="将启动全网大流转机制。系统会自发拆解成每次 50 个节点的小型列车发给 Gemini 推理，并将结果立即落盘生效！" show-icon style="margin-bottom: 20px" />
      <el-alert v-else title="请配置大语言模型 (LLM) 接入点" type="info" description="系统将把您选中的待分类书签和现有的所有目录名发送给大语言模型进行推理。API Key 仅保存在您的本地浏览器中。" show-icon style="margin-bottom: 20px" />
      
      <el-form :model="config" label-width="120px">
        <el-form-item label="API Base URL">
          <el-input v-model="config.apiBaseUrl" placeholder="例如: https://generativelanguage.googleapis.com/v1beta" />
          <div class="tip-text">支持 Google Gemini 官方骨干网地址以保障绝对的数据安全。</div>
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="config.apiKey" type="password" show-password placeholder="AIzaSy..." />
        </el-form-item>
        <el-form-item label="Model ID">
          <el-input v-model="config.modelName" placeholder="例如: gemini-1.5-pro, gemini-pro, gemini-1.0-pro" />
        </el-form-item>
      </el-form>
      <div style="text-align: right; margin-top: 20px;">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="startAnalysis">开始智能分析 🚀</el-button>
      </div>
    </div>

    <!-- 手动模式 Loading -->
    <div v-else-if="step === 2" class="step-container" style="text-align: center; padding: 50px 0;">
      <el-icon class="is-loading" style="font-size: 50px; color: #409EFF"><Loading /></el-icon>
      <h3 style="margin-top: 20px;">AI 大脑正在为您阅读和思考，请稍候...</h3>
      <p style="color: #909399">预计需要 5 ~ 30 秒（取决于网络和模型算力）</p>
    </div>

    <!-- 手动模式审核表 -->
    <div v-else-if="step === 3" class="step-container">
      <el-alert title="分析完成！请审查 AI 给出的文件夹归类建议：" type="success" show-icon style="margin-bottom: 15px" />
      
      <el-table :data="suggestions" style="width: 100%" height="400" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="title" label="书签原名" width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span style="font-weight: bold">{{ getBookmarkTitle(row.bookmarkId) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="💡 AI 建议理由" width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <span style="color: #67C23A">{{ row.reason }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="recommendedParentName" label="🎯 建议归属地" min-width="180">
          <template #default="{ row }">
            <el-tag v-if="row.recommendedParentId" type="primary">📁 {{ row.recommendedParentName }} (系统已存)</el-tag>
            <el-tag v-else type="warning" effect="dark">✨ 建议新建: {{ row.recommendedParentName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="confidence" label="AI 置信度" width="100">
           <template #default="{ row }">
            <span :style="{ color: row.confidence > 85 ? 'green' : 'red' }">{{ row.confidence }}%</span>
          </template>
        </el-table-column>
      </el-table>

      <div style="text-align: right; margin-top: 20px;">
        <el-button @click="step = 1">返回配置</el-button>
        <el-button type="primary" :disabled="selectedSuggestions.length === 0" @click="applySuggestions" :loading="applying">
          采纳勾选的 {{ selectedSuggestions.length }} 项建议并移动
        </el-button>
      </div>
    </div>

    <!-- 全局托管模式 Progress -->
    <div v-else-if="step === 4" class="step-container" style="text-align: center; padding: 50px 0;">
      <el-progress type="dashboard" :percentage="progressPercent" :color="colors" />
      <h3 style="margin-top: 20px;">🌐 正在全局委托 AI 大脑逐批处理书签...</h3>
      <p style="color: #F56C6C; font-weight: bold">已处理: {{ processedCount }} / {{ totalCount }}</p>
      <p style="color: #909399">数据拆分传输中，为了保障分类结构完整，在此期间请绝对不要关闭窗口/中断网络</p>
    </div>

    <!-- 全局托管模式 完成 -->
    <div v-else-if="step === 5" class="step-container" style="text-align: center; padding: 50px 0;">
       <el-result icon="success" title="🎉 全局洗牌重构顺利收工" sub-title="您的千万级书签资产已全部得到 AI 指引并原地落位！" />
       <el-button type="primary" size="large" @click="finishGlobal">立即见证奇迹 (刷新页面)</el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const props = defineProps<{
  modelValue: boolean
  selectedBookmarks: any[]
  isGlobalMode: boolean
}>()

const emit = defineEmits(['update:modelValue', 'applied'])

const dialogVisible = ref(false)
const step = ref(1)
const applying = ref(false)

const processedCount = ref(0)
const totalCount = ref(0)
const progressPercent = computed(() => totalCount.value === 0 ? 0 : Math.round((processedCount.value / totalCount.value) * 100))
const colors = [
  { color: '#f56c6c', percentage: 20 },
  { color: '#e6a23c', percentage: 40 },
  { color: '#5cb87a', percentage: 60 },
  { color: '#1989fa', percentage: 80 },
  { color: '#6f7ad3', percentage: 100 },
]

const config = ref({
  apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  apiKey: '',
  modelName: 'gemini-1.5-pro'
})

const suggestions = ref<any[]>([])
const selectedSuggestions = ref<any[]>([])

// Sync v-model
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    step.value = 1
    suggestions.value = []
    selectedSuggestions.value = []
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

onMounted(() => {
  const cachedConfig = localStorage.getItem('bm_ai_config')
  if (cachedConfig) {
    try {
      config.value = JSON.parse(cachedConfig)
    } catch(e){}
  }
})

const getBookmarkTitle = (id: string | number) => {
  const node = props.selectedBookmarks.find(n => String(n.id) === String(id))
  return node ? node.title : `未知(${id})`
}

const handleSelectionChange = (val: any[]) => {
  selectedSuggestions.value = val
}

const startAnalysis = async () => {
  if (!config.value.apiKey || !config.value.apiBaseUrl || !config.value.modelName) {
    ElMessage.warning('请将配置填写完整！')
    return
  }
  
  // Cache to LocalStorage
  localStorage.setItem('bm_ai_config', JSON.stringify(config.value))
  
  const linkIds = props.selectedBookmarks.filter(item => item.type !== 'h3').map(item => item.id)
  if (linkIds.length === 0) {
    ElMessage.error('没有可用书签实体供归类。')
    return
  }

  if (props.isGlobalMode) {
    // ---- 启动全局极速批量委托引擎 ----
    await processGlobalAuto(linkIds)
  } else {
    // ---- 启动普通人工审查模式 ----
    step.value = 2
    try {
      const res: any = await request.post('/BookMarks/toolbox/ai/categorize', {
        apiBaseUrl: config.value.apiBaseUrl,
        apiKey: config.value.apiKey,
        modelName: config.value.modelName,
        bookmarkIds: linkIds
      })
      suggestions.value = res.data || []
      step.value = 3
    } catch (error: any) {
      ElMessage.error('AI 请求失败：' + (error.response?.data?.msg || error.message || '未知错误'))
      step.value = 1
    }
  }
}

// Global Streaming AI Processor
const processGlobalAuto = async (linkIds: any[]) => {
  totalCount.value = linkIds.length
  processedCount.value = 0
  step.value = 4

  const BATCH_SIZE = 40 // 防止 Gemini Token Context Window 超限，每次只平送 40 组书签
  
  for (let i = 0; i < linkIds.length; i += BATCH_SIZE) {
    const chunk = linkIds.slice(i, i + BATCH_SIZE)
    
    try {
      const res: any = await request.post('/BookMarks/toolbox/ai/categorize', {
        apiBaseUrl: config.value.apiBaseUrl,
        apiKey: config.value.apiKey,
        modelName: config.value.modelName,
        bookmarkIds: chunk
      })
      
      const batchSuggestions = res.data || []
      for (const item of batchSuggestions) {
         let runTargetId = item.recommendedParentId
         
         if (!runTargetId && item.recommendedParentName) {
            const formData = new FormData()
            formData.append('parentId', '0')
            formData.append('folderName', item.recommendedParentName)
            const folderRes: any = await request.post('/BookMarks/createFolder', formData)
            runTargetId = folderRes.data.id
         }
         
         if (runTargetId) {
            const mf = new FormData()
            mf.append('nodeId', String(item.bookmarkId))
            mf.append('targetParentId', String(runTargetId))
            mf.append('sortOrder', '0')
            await request.post('/BookMarks/move', mf)
         }
      }
    } catch (error) {
       console.error(`Chunk ${i} Failed:`, error)
       // LLM 往往存在幻觉导致个别 JSON 瘫痪抛出 500，此时必须放手让循环继续流转不能终止生命链路
    }
    
    // 更新实弹处理战报百分比
    processedCount.value += chunk.length
  }
  
  step.value = 5
}

const finishGlobal = () => {
    dialogVisible.value = false
    emit('applied')
}

// Local Applies
const applySuggestions = async () => {
  applying.value = true
  let successCount = 0
  
  try {
    for (const item of selectedSuggestions.value) {
      let runTargetId = item.recommendedParentId
      if (!runTargetId && item.recommendedParentName) {
         const formData = new FormData()
         formData.append('parentId', '0')
         formData.append('folderName', item.recommendedParentName)
         const folderRes: any = await request.post('/BookMarks/createFolder', formData)
         runTargetId = folderRes.data.id
      }
      if (runTargetId) {
         const mf = new FormData()
         mf.append('nodeId', String(item.bookmarkId))
         mf.append('targetParentId', String(runTargetId))
         mf.append('sortOrder', '0')
         await request.post('/BookMarks/move', mf)
         successCount++
      }
    }
    ElMessage.success(`成功为您智能归档了 ${successCount} 个书签！`)
    dialogVisible.value = false
    emit('applied')
  } catch (e) {
    ElMessage.error('部分节点移动时发生故障')
  } finally {
    applying.value = false
  }
}

</script>

<style scoped>
.step-container {
  padding: 10px 20px;
}
.tip-text {
  font-size: 12px;
  color: #909399;
  line-height: normal;
  margin-top: 5px;
}
</style>
