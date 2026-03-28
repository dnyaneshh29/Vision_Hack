import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      if (!window.location.pathname.includes('/login')) {
        toast.error('Session expired. Please log in again.')
        setTimeout(() => {
          window.location.href = '/login'
        }, 300)
      }
    } else if (status === 403) {
      toast.error('Access denied.')
    } else if (!error.response) {
      toast.error('Network error. Check your connection.')
    } else if (status >= 500) {
      toast.error('Server error. Please try again.')
    }
    return Promise.reject(error)
  }
)
