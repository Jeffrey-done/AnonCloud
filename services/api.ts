
import { ApiResponse } from '../types';

export const request = async <T,>(
  apiBase: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<ApiResponse<T>> => {
  try {
    const url = `${apiBase}${endpoint}`;
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
      const errorData = await res.json();
      return { code: res.status, msg: errorData.msg || '网络请求错误' };
    }
    return await res.json();
  } catch (err) {
    console.error('API Request Failed:', err);
    return { code: 500, msg: '无法连接到后端，请检查 API 地址' };
  }
};
