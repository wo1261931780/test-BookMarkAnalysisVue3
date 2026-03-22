<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>上传书签数据</span>
      </div>
    </template>
    
    <div style="text-align: center; padding: 40px 0;">
      <el-upload
        class="upload-demo"
        drag
        action="/api/BookMarks/upload/auto"
        :on-success="handleSuccess"
        :on-error="handleError"
        :show-file-list="false"
        accept=".html,.plist"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持完整 Chrome 导出的 HTML 书签或 Safari 的 plist 书签格式文件
          </div>
        </template>
      </el-upload>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

const handleSuccess = (response: any) => {
  // Try to unwrap wrapper if present
  const message = response?.message || '导入成功，请刷新数据概览'
  if (response?.code === 200 || response?.totalParsed) {
    ElMessage.success(message)
  } else {
    ElMessage.success('导入完成！')
  }
}

const handleError = (error: any) => {
  ElMessage.error('上传失败，请检查后端服务是否开启')
  console.error(error)
}
</script>
