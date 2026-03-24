<template>
  <el-dialog v-model="dialogVisible" title="🤖 智能 AI 书签洗牌与重组引擎" width="85%" top="5vh" destroy-on-close>
    
    <div v-if="step === 1" class="step-container">
      <el-alert v-if="isGlobalMode" title="🔥 全局知识拓扑大爆炸重建" type="error" description="此操作将：1.抹杀现存所有的旧分类目录 2.按域名聚类全站链结 3.将聚类浓缩体一次性下发给 Gemini 令其重新出架构图 4.瞬时在本地落地生成新树并重新分配所有子代。仅需消耗极少的 Token 即可重构百万资产！" show-icon style="margin-bottom: 20px" />
      <el-alert v-else title="请配置大语言模型 (LLM) 接入点" type="info" description="系统将把您选中的待分类书签和现有的所有目录名发送给大语言模型进行推理。API Key 仅保存在您的本地浏览器中。" show-icon style="margin-bottom: 20px" />
      
      <el-form :model="config" label-width="120px">
        <el-form-item label="API Base URL">
          <el-input v-model="config.apiBaseUrl" placeholder="例如: https://api.openai.com/v1 等 OpenAI 标准前缀" />
          <div class="tip-text">支持搭载了 OpenAI 兼容规范的大模型通信。使用 Gemini 请附加 openai 路径：https://generativelanguage.googleapis.com/v1beta/openai/</div>
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="config.apiKey" type="password" show-password placeholder="AIzaSy..." />
        </el-form-item>
        <el-form-item label="Model ID">
          <el-input v-model="config.modelName" placeholder="例如: gemini-3-flash-preview, gpt-4o, claude-3-5-sonnet-20240620" />
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

    <!-- 全局托管模式：每批次请求中 -->
    <div v-else-if="step === 4" class="step-container" style="text-align: center; padding: 50px 0;">
      <el-icon class="is-loading" style="font-size: 50px; color: #409EFF"><Loading /></el-icon>
      <h3 style="margin-top: 20px;">正在获取新一批的 AI 建议...</h3>
      <p style="color: #909399">调用大模型接口中，请耐心等待返回...</p>
    </div>

    <!-- 全局托管模式：单批次审查 -->
    <div v-else-if="step === 6" class="step-container">
      <el-alert :title="`AI 分批处理中（当前进度：第 ${currentBatchIndex + 1} / ${totalBatches} 批）：请审查并确认此批网域的流向`" type="warning" show-icon style="margin-bottom: 15px" />
      
      <el-table :data="batchSuggestions" style="width: 100%" height="400">
        <el-table-column prop="domain" label="核心网域 (Domain)" width="250" show-overflow-tooltip />
        <el-table-column prop="count" label="涉及条数" width="100" />
        <el-table-column prop="newFolderName" label="🎯 AI建议归属(可修改)" min-width="200">
          <template #default="{ row }">
            <el-input v-model="row.newFolderName" size="small" placeholder="修改后将在此文件夹落档" />
          </template>
        </el-table-column>
      </el-table>

      <div style="text-align: right; margin-top: 20px;">
        <el-button type="info" @click="fetchNextBatch" plain :loading="applying" style="float: left;">
          不满意本批次，直接重连重抓 ↻
        </el-button>
        <el-button type="primary" @click="confirmBatchMapping" :loading="applying" size="large">
          无误，立即覆盖数据库，抓取下一批 🚀
        </el-button>
      </div>
    </div>

    <!-- 全局托管模式 完成 -->
    <div v-else-if="step === 5" class="step-container" style="text-align: center; padding: 50px 0;">
       <el-result icon="success" title="🎉 全网大一统重组宣告落幕" sub-title="您的千万书签已经被有条不紊地分配入了新落地的分类树中！" />
       <el-button type="primary" size="large" @click="finishGlobal">立即检阅新帝国全线版图 (刷新页面)</el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
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


const totalBatches = ref(0)
const currentBatchIndex = ref(0)
const batchSuggestions = ref<any[]>([])

const config = ref({
  apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  apiKey: '',
  modelName: 'gemini-3-flash-preview'
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
  
  if (props.isGlobalMode) {
    // ---- 启动大爆炸摧毁与重构引擎 ----
    await processGlobalScorchedEarth()
  } else {
    const linkIds = props.selectedBookmarks.filter(item => item.type !== 'h3').map(item => item.id)
    if (linkIds.length === 0) {
      ElMessage.error('没有可用部分书签供分析，请先在列表中勾选想要分类的具体链接。')
      return
    }

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

// ---- 开始：全量托管人工审查流 ----
const processGlobalScorchedEarth = async () => {
  step.value = 4
  try {
    const initRes: any = await request.post('/BookMarks/toolbox/ai/reconstructTree/init')
    if (initRes.code !== 20000) {
      throw new Error(initRes.msg || '初始化大爆炸进程失败')
    }
    totalBatches.value = initRes.data.totalBatches
    currentBatchIndex.value = initRes.data.currentBatchIndex
    
    await fetchNextBatch()
  } catch (error: any) {
    ElMessage.error('初始化失败: ' + (error.response?.data?.msg || error.message || error))
    step.value = 1
  }
}

const fetchNextBatch = async () => {
  step.value = 4
  try {
    const res: any = await request.post('/BookMarks/toolbox/ai/reconstructTree/nextBatch', {
      apiBaseUrl: config.value.apiBaseUrl,
      apiKey: config.value.apiKey,
      modelName: config.value.modelName
    })
    
    if (res.code !== 20000) {
        throw new Error(res.msg || '获取批次折戟')
    }
    
    batchSuggestions.value = res.data || []
    step.value = 6
  } catch (error: any) {
    ElMessage.error('获取此批次 AI 建议时遇到了网络阻断或限流，您可以调整后直接再次点击重抓: ' + (error.response?.data?.msg || error.message || error))
    step.value = 6 
  }
}

const confirmBatchMapping = async () => {
  applying.value = true
  try {
    const res: any = await request.post('/BookMarks/toolbox/ai/reconstructTree/confirmBatch', batchSuggestions.value)
    if (res.code !== 20000) {
      throw new Error(res.msg || '保存库变失败')
    }
    
    currentBatchIndex.value = res.data.currentBatchIndex
    
    if (currentBatchIndex.value >= totalBatches.value) {
       step.value = 5
       ElMessage.success('全网结构重组落幕！')
    } else {
       await fetchNextBatch()
    }
  } catch (error: any) {
    ElMessage.error('本批次未能落实到数据库: ' + (error.response?.data?.msg || error.message || error))
  } finally {
    applying.value = false
  }
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
