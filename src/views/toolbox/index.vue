<template>
  <div class="toolbox-container">
    <el-card shadow="never" class="box-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Tools /></el-icon> 核心管家工具箱 (Data Toolbox)</span>
        </div>
      </template>

      <el-alert
        title="高危操作区：请务必确保您已经通过「一键全量导出原生HTML」备份过了原始数据！"
        type="warning"
        show-icon
        :closable="false"
        style="margin-bottom: 30px;"
      />

      <el-row :gutter="30">
        <!-- 一键清理重复链接 -->
        <el-col :span="8" class="tool-col">
          <el-card shadow="hover" class="tool-item">
            <el-icon class="tool-icon" style="color: #F56C6C"><CopyDocument /></el-icon>
            <h3>清理冗余克隆链接</h3>
            <p class="tool-desc">全表扫除所有重复指向同一个 URL 的书签，严格保留最早期存入的那一份，彻底释放大量数据库存储空间。</p>
            <el-button type="danger" plain @click="confirmAction('dedupe')">一键去重</el-button>
          </el-card>
        </el-col>

        <!-- 一键清理空目录 -->
        <el-col :span="8" class="tool-col">
          <el-card shadow="hover" class="tool-item">
            <el-icon class="tool-icon" style="color: #E6A23C"><Delete /></el-icon>
            <h3>销毁空壳文件夹</h3>
            <p class="tool-desc">层级大清洗！递归查找并粉碎所有内部没有挂载任何子级文件或者书签的“空外壳目录”。</p>
            <el-button type="warning" plain @click="confirmAction('emptyFolders')">一键毁灭空夹</el-button>
          </el-card>
        </el-col>

        <!-- 最新版快照提取 -->
        <el-col :span="8" class="tool-col">
          <el-card shadow="hover" class="tool-item">
            <el-icon class="tool-icon" style="color: #67C23A"><Download /></el-icon>
            <h3>无损逆向生成快照</h3>
            <p class="tool-desc">将目前云端数据库的所有树状节点关系，逆向打包编译为一份全新的、符合浏览器导入标准的 HTML Bookmarks 原生文件。</p>
            <el-button type="success" plain @click="confirmAction('export')">提取原生快照备份</el-button>
          </el-card>
        </el-col>

        <!-- 一键全量清空 -->
        <el-col :span="8" class="tool-col">
          <el-card shadow="hover" class="tool-item">
            <el-icon class="tool-icon" style="color: #909399"><WarnTriangleFilled /></el-icon>
            <h3>核弹洗地 (格式化)</h3>
            <p class="tool-desc">毁灭全部 8000+ 书签资源！如果您想洗手不干或者导入了一份极其错误不可挽回的破损文件，可以用此功能斩草除根。</p>
            <el-button type="info" plain @click="confirmAction('reset')">物理格式化一切</el-button>
          </el-card>
        </el-col>

        <!-- 一键探针栏位 -->
        <el-col :span="8" class="tool-col">
          <el-card shadow="hover" class="tool-item" style="border: 2px solid #F56C6C;">
            <el-icon class="tool-icon" style="color: #F56C6C"><Cpu /></el-icon>
            <h3 style="color: #F56C6C">一键死链并发探针 404 (流浪地球计划)</h3>
            <p class="tool-desc" style="color: #606266">基于 Java 21 虚拟线程 (Virtual Threads) ，支持每秒极大并发心跳侦测，彻底大清洗并揪出全部失联网址。</p>
            <el-button type="danger" plain @click="handleStartScanDialog">启动高潜巡航探针</el-button>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <!-- 死链扫描结果与进度弹窗 -->
    <el-dialog v-model="scanDialogVisible" title="死链体检（Virtual Threads 高并发扫描）" width="80%" :close-on-click-modal="false" @close="clearScanTimer">
      <div v-if="scanProgress.running" style="margin-bottom: 20px;">
        <p style="margin-bottom: 10px; font-weight: bold; color: #409EFF">
          正在并行嗅探: {{ scanProgress.processed }} / {{ scanProgress.total }}
        </p>
        <el-progress :percentage="scanPercentage" :stroke-width="18" striped striped-flow></el-progress>
      </div>
      <div v-else-if="scanProgress.total > 0 && scanProgress.processed >= scanProgress.total" style="margin-bottom: 20px;">
        <el-alert title="体检扫描完成！以下是系统为您捕获的失联阵亡名单，请勾选剔除" type="success" :closable="false" show-icon />
      </div>

      <el-table :data="scanProgress.brokenLinks" style="width: 100%" height="400" @selection-change="handleScanSelectionChange" v-loading="scanProgress.running">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="title" label="书签名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="href" label="检测网址" min-width="250" show-overflow-tooltip>
          <template #default="scope">
            <a :href="scope.row.href" target="_blank" style="color: #409EFF; text-decoration: none;">{{ scope.row.href }}</a>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="诊断结果 (404 / 超时)" width="200">
          <template #default="scope">
            <el-tag type="danger">{{ scope.row.reason }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="scanDialogVisible = false">关闭面板</el-button>
          <el-button type="warning" :disabled="scanSelection.length === 0 || scanProgress.running" @click="handleArchiveBroken">
            安全流放选中节点至归档区 ({{ scanSelection.length }})
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Tools, CopyDocument, Delete, Download, WarnTriangleFilled, Cpu } from '@element-plus/icons-vue'

const scanDialogVisible = ref(false)
const scanProgress = ref({ running: false, total: 0, processed: 0, brokenLinks: [] as any[] })
const scanSelection = ref<any[]>([])
let scanTimer: any = null

const scanPercentage = computed(() => {
  if (scanProgress.value.total === 0) return 0
  return Math.floor((scanProgress.value.processed / scanProgress.value.total) * 100)
})

const handleStartScanDialog = async () => {
  try {
    await ElMessageBox.confirm(
      '开启探针前，系统将为您 [去除重复并清空空文件夹] 以避免无意义的网络请求。\n扫描将依托 Java 21 虚拟线程以 40 并发心跳安全运作，无感不卡顿本机网卡。\n确信继续吗？',
      '启动虚拟线程体检探针',
      { confirmButtonText: '点火起飞', cancelButtonText: '暂缓', type: 'warning' }
    )
    
    ElMessage.info('探针舰队拔锚，正在请求发射场...')
    scanProgress.value = { running: true, total: 1, processed: 0, brokenLinks: [] }
    scanDialogVisible.value = true
    
    try {
      await request.post('/BookMarks/toolbox/scanDeadLinks/start')
    } catch(e: any) {
      if (e.response && e.response.data && e.response.data.msg) {
         ElMessage.info(e.response.data.msg)
      }
    }
    startPolling()
  } catch (e) {
    // 拦截取消
  }
}

const clearScanTimer = () => {
  if (scanTimer) {
    clearInterval(scanTimer)
    scanTimer = null
  }
}

const startPolling = () => {
  clearScanTimer()
  scanTimer = setInterval(async () => {
    try {
      const res: any = await request.get('/BookMarks/toolbox/scanDeadLinks/progress')
      scanProgress.value = res.data
      if (!res.data.running && res.data.total > 0 && res.data.processed >= res.data.total) {
        clearScanTimer()
        ElMessage.success('探针扫描全面完成！')
      }
    } catch(e) {
      console.error(e)
    }
  }, 1000)
}

const handleScanSelectionChange = (val: any[]) => {
  scanSelection.value = val
}

const handleArchiveBroken = async () => {
  if (scanSelection.value.length === 0) return
  try {
    await ElMessageBox.confirm(`确认要将选中的 ${scanSelection.value.length} 个废弃书签保留并流放至【[系统归档] 疑似失联区 (404 Archive)】文件夹吗？\n它们不会被物理删除，您可以在树形结构根目录找到它们。`, '流放失效节点', { type: 'warning' })
    const ids = scanSelection.value.map(item => item.id)
    await request.post('/BookMarks/toolbox/archiveDeadLinks', ids)
    ElMessage.success('所选书签已安全流放至归档区！')
    scanProgress.value.brokenLinks = scanProgress.value.brokenLinks.filter(item => !ids.includes(item.id))
    scanSelection.value = []
  } catch (e) {
    // cancelled
  }
}

onUnmounted(() => {
  clearScanTimer()
})

const confirmAction = (type: string) => {
  let title = ''
  let message = ''
  let confirmBtnText = ''
  let alertType: 'warning' | 'error' | 'success' | 'info' = 'warning'

  switch (type) {
    case 'dedupe':
      title = '警告：准备清理重复链接'
      message = '您确认要深度扫除冗余吗？这将会使得多处分类下的重复地址缩减为仅保留最初的一个，这个过程可能需要几十秒。'
      confirmBtnText = '确信，请立即执行清理'
      alertType = 'warning'
      break
    case 'emptyFolders':
      title = '警告：清剿空文件夹'
      message = '我们将摧毁所有没有子元素的空目录节点。某些因为误操作清空备用的文件夹也会被一并粉碎，确定继续吗？'
      confirmBtnText = '确信，无用即是废物'
      alertType = 'warning'
      break
    case 'reset':
      title = '终极核准：物理格式化书签库'
      message = '【最高危】这意味着当前系统内的几千条书签及其分类树形脉络将永久除名消失。除非您已经有了 HTML 导出备份，否则强烈不建议操作！'
      confirmBtnText = '我明白，执行清剿令'
      alertType = 'error'
      break
    case 'export':
      title = '二次确认：提取最新云端映射'
      message = '确认开始组装最新的树形逻辑 HTML 快照吗？'
      confirmBtnText = '立即导出备份'
      alertType = 'success'
      break
  }

  ElMessageBox.confirm(
    message,
    title,
    {
      confirmButtonText: confirmBtnText,
      cancelButtonText: '取消，点错了',
      type: alertType,
    }
  ).then(() => {
    executeToolboxAction(type)
  }).catch(() => {
    ElMessage.info('已拦截本次危险操作')
  })
}

const executeToolboxAction = async (type: string) => {
  try {
    if (type === 'dedupe') {
      const res: any = await request.post('/BookMarks/toolbox/deduplicate')
      ElMessage.success('去重执行完毕！本次清理了大量空间！')
    } else if (type === 'emptyFolders') {
      const res: any = await request.post('/BookMarks/toolbox/clearEmptyFolders')
      ElMessage.success('空壳目录清扫完成！')
    } else if (type === 'reset') {
      const res: any = await request.post('/BookMarks/toolbox/reset')
      ElMessage.success('格式化完成！数据库现在是一张白纸了。')
    } else if (type === 'export') {
      ElMessage.info('准备导出书签，请稍后...')
      const res: any = await request.get('/BookMarks/export?format=html', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data || res]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'exported_bookmarks_master.html')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      ElMessage.success('快照成功离线着陆到本地')
    }
  } catch (error) {
    ElMessage.error(`执行 [${type}] 过程遭遇罕见异常波动，功能可能受限`)
  }
}
</script>

<style scoped>
.toolbox-container {
  padding: 20px;
}
.card-header {
  font-weight: bold;
  font-size: 18px;
  color: #303133;
}
.tool-col {
  margin-bottom: 25px;
}
.tool-item {
  text-align: center;
  border-radius: 8px;
  transition: all 0.3s;
  height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.tool-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}
.tool-icon {
  font-size: 40px;
  margin-bottom: 10px;
  margin-top: 10px;
}
.tool-item h3 {
  margin: 10px 0;
  font-size: 16px;
  color: #303133;
}
.tool-desc {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 20px;
  flex: 1;
}
.disabled-card {
  background-color: #f5f7fa;
  border: 1px dashed #e4e7ed;
}
</style>
