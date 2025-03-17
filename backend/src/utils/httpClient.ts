import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * Send data to a callback URL with retry logic
 */
export const sendToCallback = async <T>(
  url: string,
  data: T,
  maxRetries = 5,
  initialBackoff = 1000,
  timeout = 10000
): Promise<AxiosResponse> => {
  let retries = 0;
  
  const makeRequest = async (): Promise<AxiosResponse> => {
    try {
      const config: AxiosRequestConfig = {
        timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Google-Workspace-Integration/1.0',
        },
      };
      
      return await axios.post(url, data, config);
    } catch (error: unknown) {
      // Type guard for AxiosError
      if (axios.isAxiosError(error)) {
        // Only retry on network errors, timeouts, or server errors (5xx)
        const isServerError = error.response?.status && error.response.status >= 500;
        const isNetworkError = !error.response;
        const shouldRetry = (isServerError || isNetworkError) && retries < maxRetries;
        
        if (shouldRetry) {
          retries++;
          const backoffTime = initialBackoff * Math.pow(2, retries - 1);
          console.log(`Callback failed, backing off for ${backoffTime}ms (retry ${retries}/${maxRetries})`);
          
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
          return makeRequest(); // Retry with exponential backoff
        }
        
        // Client error (4xx) or out of retries
        if (error.response) {
          throw new Error(`Callback failed with status ${error.response.status}: ${error.response.statusText}`);
        } else {
          throw new Error(`Callback network error: ${error.message}`);
        }
      }
      
      // Not an Axios error, cast to Error if possible
      const err = error instanceof Error ? error : new Error('Unknown error occurred');
      throw err;
    }
  };
  
  return makeRequest();
}; 