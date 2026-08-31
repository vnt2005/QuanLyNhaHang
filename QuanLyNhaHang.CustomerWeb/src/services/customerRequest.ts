import { ApiError, apiRequest } from './client'
import {
  getCustomerAccessToken,
  restoreCustomerSession,
} from './customerAuth'

export async function authenticatedCustomerRequest<T>(
  path: string,
  init?: RequestInit,
  fallbackAccessToken?: string | null,
) {
  let accessToken = getCustomerAccessToken() || fallbackAccessToken || ''
  if (!accessToken) accessToken = (await restoreCustomerSession()).token

  try {
    return await apiRequest<T>(path, init, accessToken)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    const restored = await restoreCustomerSession()
    return apiRequest<T>(path, init, restored.token)
  }
}

export function optionalCustomerRequest<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
) {
  return accessToken
    ? authenticatedCustomerRequest<T>(path, init, accessToken)
    : apiRequest<T>(path, init)
}
