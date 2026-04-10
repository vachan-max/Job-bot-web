import axios from 'axios'
import { auth } from '../firebase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Creates axios instance pointing to FastAPI
const api = axios.create({ baseURL: API_URL })

// Automatically adds Firebase token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api