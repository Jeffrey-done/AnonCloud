
import { ApiResponse } from '../types';

export const request = async <T,>(
  apiBase: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 增加到12秒，适应波动网络

  try {
    // 鲁棒的 URL 拼接逻辑
    let url: string;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    if (!apiBase || apiBase === window.location.origin) {
      // 如果是同源，直接使用相对路径，这能绕过很多跨域和DNS问题
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

    if (res.status === 500) {
      const errorData = await res.json().catch(() => ({}));
      return { code: 500, msg: errorData.msg || "服务器繁忙或配置错误。" };
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { code: res.status, msg: errorData.msg || `网络请求异常 (${res.status})` };
    }
    
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { code: 408, msg: '连接超时。这通常是由于网络审查导致的，请尝试更换节点或开启代理。' };
    }
    console.error('API Request Failed:', err);
    return { code: 500, msg: '无法连接到 API 节点。建议前往设置页面检查 API 地址或切换节点。' };
  }
};
