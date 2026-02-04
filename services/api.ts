
import { ApiResponse } from '../types';

export const request = async <T,>(
  apiBase: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<ApiResponse<T>> => {
  try {
    // 自动移除末尾斜杠，确保拼接路径正确
    const baseUrl = apiBase.replace(/\/$/, '');
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
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { code: res.status, msg: errorData.msg || `请求失败 (${res.status})` };
    }
    return await res.json();
  } catch (err) {
    console.error('API Request Failed:', err);
    return { code: 500, msg: '无法连接到后端，请检查 API 地址是否正确且已部署 Worker' };
  }
};
