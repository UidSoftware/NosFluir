import api from './api'

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/token/', { email, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    return data
  },

  async logout() {
    const refresh = localStorage.getItem('refresh_token')
    try {
      if (refresh) {
        await api.post('/token/blacklist/', { refresh })
      }
    } catch {
      // ignora erros no logout
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  },

  async getUser() {
    const { data } = await api.get('/me/')
    return data
  },
}
