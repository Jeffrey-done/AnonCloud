
import { ApiResponse } from '../types';

export const request = async <T,>(
  apiBase: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 缩短超时到10秒，更快反馈

  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // 强制构造完整的 URL，避免浏览器对相对路径的处理差异
    let url: string;
    if (!apiBase || apiBase.trim() === '') {
      // 合并部署模式：使用当前网页所在的域名
      url = `${window.location.origin}${cleanEndpoint}`;
    } else {
      // 代理模式：使用用户填写的域名
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

    // 如果返回 500，通常是 KV 没绑定
    if (res.status === 500) {
      const errorData = await res.json().catch(() => ({}));
      return { 
        code: 500, 
        msg: errorData.msg || "后端服务异常：请检查 Cloudflare Pages 是否绑定了 CHAT_KV" 
      };
    }

    if (!res.ok) {
      return { 
        code: res.status, 
        msg: `接口访问失败 (${res.status})，请确认域名是否被拦截` 
      };
    }
    
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error("API Request Error:", err);
    
    if (err.name === 'AbortError') {
      return { code: 408, msg: '网络连接超时：请检查自定义域名解析或尝试切换网络' };
    }
    
    // 如果是 fetch 失败（TypeError），通常是域名无法解析或被墙
    return { 
      code: 500, 
      msg: '无法连接到服务器：请确认是否使用了自定义域名，且 DNS 解析已生效' 
    };
  }
};
