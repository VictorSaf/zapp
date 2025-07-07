import { config } from '../config/env'

interface RequestOptions extends RequestInit {
  token?: string
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

class ApiService {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, headers, ...restOptions } = options

    const url = `${this.baseURL}${endpoint}`
    const authToken = token || this.token

    const finalHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (authToken) {
      finalHeaders['Authorization'] = `Bearer ${authToken}`
    }

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers: finalHeaders,
      })

      const data: ApiResponse<T> = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Request failed')
      }

      return data.data as T
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error')
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create instances for different services
export const coreApi = new ApiService(config.API_URL)
export const aiApi = new ApiService(config.AI_URL)

export default ApiService