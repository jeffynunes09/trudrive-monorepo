export interface IHttpClient {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T>
  post<T>(url: string, body: unknown): Promise<T>
  patch<T>(url: string, body: unknown): Promise<T>
  delete(url: string): Promise<void>
}
