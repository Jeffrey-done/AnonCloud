
import { ApiResponse } from '../types';

export const request = async <T,>(
  apiBase: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 延长超时至 30s，适应大陆网络

  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    let url: string;
    if (!apiBase || apiBase.trim() === '') {
      url = `${window.location.origin}${cleanEndpoint}`;
    } else {
      const cleanBase = apiBase.replace(/\/+$/, '');
      url = `${cleanBase}${cleanEndpoint}`;
    }
    
    const options: RequestInit = {
      method,
      headers: {
        // 重要：使用 text/plain 规避浏览器发起 OPTIONS 预检请求，显著提升大陆直连速度
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      signal: controller.signal,
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    clearTimeout(timeoutId);

    if (res.status === 500) {
      const errorData = await res.json().catch(() => ({}));
      return { 
        code: 500, 
        msg: errorData.msg || "服务器内部错误：请检查 CHAT_KV 绑定" 
      };
    }

    if (!res.ok) {
      return { 
        code: res.status, 
        msg: `访问受限 (${res.status})，请确保通过自定义域名访问` 
      };
    }
    
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error("API Request Error:", err);
    
    if (err.name === 'AbortError') {
      return { code: 408, msg: '连接超时：大陆直连较慢，请稍后重试' };
    }
    
    return { 
      code: 500, 
      msg: '连接服务器失败：请检查网络或确认 DNS 是否生效' 
    };
  }
};
