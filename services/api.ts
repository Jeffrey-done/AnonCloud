
import { ApiResponse } from '../types';

export const request = async <T,>(
  apiBase: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<ApiResponse<T>> => {
  try {
    // 自动移除末尾斜杠
    const baseUrl = apiBase ? apiBase.replace(/\/$/, '') : '';
    // 如果没有 baseUrl，直接请求相对路径 /api/...
    const url = `${baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    
    // 检查是否是因为没有绑定 KV 导致的错误
    if (res.status === 500) {
      const errorData = await res.json().catch(() => ({}));
      if (errorData.msg && errorData.msg.includes('CHAT_KV')) {
        return { code: 500, msg: errorData.msg };
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { code: res.status, msg: errorData.msg || `请求失败 (${res.status})` };
    }
    return await res.json();
  } catch (err) {
    console.error('API Request Failed:', err);
    return { code: 500, msg: '连接失败。请确保已在 Cloudflare Pages 的设置中完成了 KV 命名空间绑定。' };
  }
};
