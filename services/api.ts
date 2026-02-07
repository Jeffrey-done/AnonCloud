
import { ApiResponse } from '../types';

/**
 * 带有重试和增强容错能力的请求函数
 */
export const request = async <T,>(
  apiBase: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  retries = 2 // 默认重试 2 次
): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  // 超时延长到 25s，因为大陆直连 Cloudflare 丢包严重，需要给 TCP 更多重传时间
  const timeoutId = setTimeout(() => controller.abort(), 25000); 

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
        'Content-Type': 'text/plain;charset=UTF-8', // 保持 text/plain 规避 OPTIONS 预检
      },
      signal: controller.signal,
      cache: 'no-store'
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    clearTimeout(timeoutId);

    // 获取响应文本
    const text = await res.text();
    
    // 如果返回的是 HTML（通常是 Cloudflare 的 5xx 错误页），手动处理
    if (text.trim().startsWith('<!DOCTYPE')) {
      throw new Error(`Cloudflare Node Error (${res.status})`);
    }

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON response');
    }

    return jsonResponse;
  } catch (err: any) {
    clearTimeout(timeoutId);

    // 自动重试逻辑
    if (retries > 0 && (err.name === 'AbortError' || err.message.includes('Fetch'))) {
      console.warn(`Retrying... attempts left: ${retries}`);
      return request(apiBase, endpoint, method, body, retries - 1);
    }

    console.error("API Error:", err);
    
    if (err.name === 'AbortError') {
      return { code: 408, msg: '网络非常拥堵，正在持续重试...' };
    }
    
    return { 
      code: 500, 
      msg: err.message || '连接节点失败，请检查网络'
    };
  }
};
