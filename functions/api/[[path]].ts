
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
      const { roomCode, msg, type = 'text' } = await request.json();
      const key = `room:msg:${roomCode}`;
      const rawData = await kv.get(key);
      if (rawData === null) return new Response(JSON.stringify({ code: 404, msg: "房间不存在" }), { headers: corsHeaders });
      
      const data = JSON.parse(rawData);
      data.push({ 
        id: crypto.randomUUID(), // 使用更可靠的 UUID
        sender: 'anonymous', 
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), 
        timestamp: Date.now(),
        type,
        content: msg,
        read: false
      });
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
    // 自动为缺少 ID 的老旧数据补充 ID，防止前端缓存重复
    let data = JSON.parse(rawData || "[]").map((m: any) => ({
      ...m,
      id: m.id || `legacy-${m.timestamp || Math.random()}`
    }));
    return new Response(JSON.stringify({ code: 200, data }), { headers: corsHeaders });
  }

  // ... 其余接口保持逻辑一致，确保 ID 生成
  return new Response(JSON.stringify({ code: 404, msg: "未找到接口" }), { status: 404, headers: corsHeaders });
};
