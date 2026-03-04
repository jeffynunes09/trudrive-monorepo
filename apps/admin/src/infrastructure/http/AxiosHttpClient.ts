import axios, { type AxiosInstance } from 'axios'
import type { IHttpClient } from '../../application/ports/IHttpClient'
import type { IStorageGateway } from '../../application/ports/IStorageGateway'
import { API_BASE_URL, TOKEN_KEY } from './api.config'

export class AxiosHttpClient implements IHttpClient {
  private readonly client: AxiosInstance

  constructor(private readonly storage: IStorageGateway) {
    this.client = axios.create({ baseURL: API_BASE_URL })

    // Injeta token em todas as requisições
    this.client.interceptors.request.use((config) => {
      const token = this.storage.get(TOKEN_KEY)
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    // Trata 401 globalmente
    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          this.storage.remove(TOKEN_KEY)
          window.location.href = '/login'
        }
        return Promise.reject(err)
      },
    )
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const res = await this.client.get<T>(url, { params })
    return res.data
  }

  async post<T>(url: string, body: unknown): Promise<T> {
    const res = await this.client.post<T>(url, body)
    return res.data
  }

  async patch<T>(url: string, body: unknown): Promise<T> {
    const res = await this.client.patch<T>(url, body)
    return res.data
  }

  async delete(url: string): Promise<void> {
    await this.client.delete(url)
  }
}
