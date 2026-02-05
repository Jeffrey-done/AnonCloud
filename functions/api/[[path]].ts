
interface Env {
  CHAT_KV: any;
}

export const onRequest = async (context: { request: Request; env: Env; params: any }) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const kv = env.CHAT_KV;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!kv) {
    return new Response(JSON.stringify({ code: 500, msg: "未检测到 CHAT_KV 绑定。" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const generateCode = (len: number) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "";
    for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
  };

  if (path === "/api/create-room") {
    const code = generateCode(6);
    await kv.put(`room:msg:${code}`, "[]", { expirationTtl: 43200 });
    return new Response(JSON.stringify({ code: 200, roomCode: code }), { headers: corsHeaders });
  }

  if (path === "/api/send-msg") {
    try {
      const { roomCode, msg, type = 'text', burn = false } = await request.json();
      const key = `room:msg:${roomCode}`;
      const rawData = await kv.get(key);
      if (rawData === null) return new Response(JSON.stringify({ code: 404, msg: "房间不存在" }), { headers: corsHeaders });
      
      const data = JSON.parse(rawData);
      data.push({ 
        id: crypto.randomUUID(), 
        sender: 'anonymous', 
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), 
        timestamp: Date.now(),
        type,
        content: msg,
        burn,
        burnState: burn ? 'pending' : 'none', // pending: 未读, burning: 销毁中
        read: false
      });
      // 保持消息队列长度
      if (data.length > 50) data.shift(); 
      await kv.put(key, JSON.stringify(data), { expirationTtl: 43200 });
      return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ code: 400, msg: "Invalid Request" }), { status: 400, headers: corsHeaders });
    }
  }

  if (path === "/api/get-msg") {
    const code = url.searchParams.get("roomCode");
    const key = `room:msg:${code}`;
    const rawData = await kv.get(key);
    if (!rawData) return new Response(JSON.stringify({ code: 200, data: [] }), { headers: corsHeaders });

    let data = JSON.parse(rawData);
    const now = Date.now();
    let needsUpdate = false;

    // 过滤逻辑：移除已超时的阅后即焚消息
    const filteredData = data.filter((m: any) => {
      if (m.burn && m.expireAt && now > m.expireAt) {
        needsUpdate = true;
        return false;
      }
      return true;
    });

    // 状态更新逻辑：如果消息是阅后即焚且从未被读取，标记“点燃”
    const processedData = filteredData.map((m: any) => {
      if (m.burn && !m.expireAt) {
        m.expireAt = now + 30000; // 30秒引信
        m.burnState = 'burning';
        needsUpdate = true;
      }
      return m;
    });

    if (needsUpdate) {
      await kv.put(key, JSON.stringify(processedData), { expirationTtl: 43200 });
    }

    return new Response(JSON.stringify({ code: 200, data: processedData }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ code: 404, msg: "未找到接口" }), { status: 404, headers: corsHeaders });
};
