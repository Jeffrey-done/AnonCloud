
import { ApiResponse } from '../types';

export const request = async <T,>(
  apiBase: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // 如果 apiBase 为空，直接使用相对路径（即请求当前域名的接口）
    let url: string;
    if (!apiBase || apiBase.trim() === '') {
      url = cleanEndpoint;
    } else {
      const cleanBase = apiBase.replace(/\/+$/, '');
      url = `${cleanBase}${cleanEndpoint}`;
    }
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { 
        code: res.status, 
        msg: errorData.msg || `节点错误 (${res.status})` 
      };
    }
    
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { code: 408, msg: '请求超时，请检查网络连接。' };
    }
    return { code: 500, msg: '连接异常：' + (err.message || '未知错误') };
  }
};
