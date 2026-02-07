
import { ApiResponse } from '../types';

export const request = async <T,>(
  apiBase: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 增加到10秒

  try {
    const isSameOrigin = typeof window !== 'undefined' && apiBase === window.location.origin;
    
    // 鲁棒的 URL 拼接逻辑
    const cleanBase = apiBase ? apiBase.replace(/\/+$/, '') : '';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${cleanBase}${cleanEndpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      // 如果是同源，使用 same-origin 模式，彻底免去 CORS 烦恼
      mode: isSameOrigin ? 'same-origin' : 'cors',
      credentials: isSameOrigin ? 'include' : 'same-origin',
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    clearTimeout(timeoutId);

    if (res.status === 500) {
      const errorData = await res.json().catch(() => ({}));
      return { code: 500, msg: errorData.msg || "服务器内部错误，请检查 KV 绑定。" };
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { code: res.status, msg: errorData.msg || `请求失败 (${res.status})` };
    }
    
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { code: 408, msg: '连接超时。请检查网络环境或尝试重新连接。' };
    }
    console.error('API Request Failed:', err);
    return { code: 500, msg: '网络连接异常。由于运营商拦截，建议将此应用部署到自己的 Cloudflare 域名下。' };
  }
};
