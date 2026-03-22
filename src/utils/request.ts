import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: '/api', // Proxy will rewrite to localhost:8000
  timeout: 60000 // Some parsing commands might take longer
})

// Request interceptors
service.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptors
service.interceptors.response.use(
  (response) => {
    // If backend returns a stream (e.g., file download), return the full response
    if (response.config.responseType === 'blob' || response.config.responseType === 'stream') {
        return response
    }
    return response.data;
  },
  (error) => {
    ElMessage({
      message: error.response?.data?.message || error.message || '请求失败',
      type: 'error',
      duration: 5 * 1000
    })
    return Promise.reject(error)
  }
)

export default service
