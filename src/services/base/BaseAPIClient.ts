import { authService } from "../AuthService";
import { API_CONFIG } from "../config/api.config";

export class BaseAPIClient {
  protected async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await authService.getAccessToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const headers = {
      ...API_CONFIG.DEFAULT_HEADERS,
      // Ensure Bearer prefix; Bentley APIs expect 'Bearer <token>'
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      ...options.headers,
    };

    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const method = (options.method || 'GET').toString().toUpperCase();
    const maxRetries = 2; // conservative retries to avoid hammering the API

    let attempt = 0;
    // Only retry idempotent requests (GET/HEAD)
    const canRetry = method === 'GET' || method === 'HEAD';

    while (true) {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.ok) {
        // For successful responses, check content type and length
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        // Handle different response types based on status code
        if (response.status === 204) {
          // No Content - return null
          return null as T;
        } else if (response.status === 202) {
          // Accepted - return response info including headers for async operations
          // For some APIs, 202 might include response body with links
          let responseBody = null;
          try {
            const text = await response.text();
            if (text && text.trim()) {
              responseBody = JSON.parse(text);
            }
          } catch (parseError) {
            // If parsing fails, continue without body
            console.warn('Failed to parse 202 response body:', parseError);
          }
          
          const responseData = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            location: response.headers.get('Location'),
            operationLocation: response.headers.get('Create-iModel-Operation'),
            body: responseBody
          };
          return responseData as T;
        }
        
        // Check if response has JSON content
        if (!contentType || (!contentType.includes('application/json') && contentLength === '0')) {
          return null as T;
        }
        
        // Check if there's actually content to parse
        const text = await response.text();
        if (!text || text.trim() === '') {
          return null as T;
        }
        
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.warn('Failed to parse JSON response:', text);
          throw new Error(`Invalid JSON response: ${parseError}`);
        }
      }

      if (response.status === 429 && canRetry && attempt < maxRetries) {
        // Respect Retry-After header when present, else exponential backoff (2s, 4s)
        const retryAfter = response.headers.get('Retry-After');
        const retrySeconds = retryAfter ? Math.min(30, parseInt(retryAfter, 10) || 0) : 2 * Math.pow(2, attempt);
        const delayMs = Math.max(500, retrySeconds * 1000);
        await new Promise((r) => setTimeout(r, delayMs));
        attempt += 1;
        continue;
      }

      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        console.error("API Error:", error);
        throw new Error(error.error?.message || `Request failed with status ${response.status}`);
      } catch {
        console.error("API Error Text:", errorText);
        throw new Error(`Request failed with status ${response.status}`);
      }
    }
  }

  protected async fetchBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    const token = await authService.getAccessToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    const headers = {
      ...API_CONFIG.DEFAULT_HEADERS,
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      ...options.headers,
    } as Record<string, string>;
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error?.message || `Request failed with status ${response.status}`);
      } catch {
        throw new Error(`Request failed with status ${response.status}`);
      }
    }
    return await response.blob();
  }
}
