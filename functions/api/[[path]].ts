
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
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!kv) {
    return new Response(JSON.stringify({ code: 500, msg: "未检测到 CHAT_KV 绑定。" }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }

  const generateCode = (len: number) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "";
    for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
  };

  const generateMessageId = () => `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  // 辅助函数：安全解析 JSON Body
  const getJsonBody = async (req: Request) => {
    try {
      // 无论前端传什么 Content-Type，我们都尝试作为文本读取并解析
      const text = await req.text();
      return JSON.parse(text);
    } catch (e) {
      return {};
    }
  };

  // --- ROOM CHAT ENDPOINTS ---

  if (path === "/api/create-room") {
    const code = generateCode(6);
    await kv.put(`room:msg:${code}`, "[]", { expirationTtl: 43200 });
    return new Response(JSON.stringify({ code: 200, roomCode: code }), { headers: corsHeaders });
  }

  if (path === "/api/send-msg") {
    const { roomCode, msg, type = 'text' } = await getJsonBody(request);
    if (!roomCode || !msg) return new Response(JSON.stringify({ code: 400, msg: "参数错误" }), { headers: corsHeaders });

    const key = `room:msg:${roomCode}`;
    const rawData = await kv.get(key);
    if (rawData === null) return new Response(JSON.stringify({ code: 404, msg: "房间不存在" }), { headers: corsHeaders });
    
    const data = JSON.parse(rawData);
    data.push({ 
      id: generateMessageId(),
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
  }

  if (path === "/api/get-msg") {
    const code = url.searchParams.get("roomCode");
    const key = `room:msg:${code}`;
    const rawData = await kv.get(key);
    if (!rawData) return new Response(JSON.stringify({ code: 200, data: [] }), { headers: corsHeaders });
    return new Response(JSON.stringify({ code: 200, data: JSON.parse(rawData) }), { headers: corsHeaders });
  }

  // --- FRIEND CHAT ENDPOINTS ---

  if (path === "/api/create-friend-code") {
    const code = "UID-" + generateCode(8);
    await kv.put(`friend:id:${code}`, "active", { expirationTtl: 86400 * 7 });
    return new Response(JSON.stringify({ code: 200, friendCode: code }), { headers: corsHeaders });
  }

  if (path === "/api/add-friend") {
    const { myCode, targetCode } = await getJsonBody(request);
    if (!myCode || !targetCode) return new Response(JSON.stringify({ code: 400, msg: "Codes required" }), { headers: corsHeaders });
    
    const targetExists = await kv.get(`friend:id:${targetCode}`);
    if (!targetExists) return new Response(JSON.stringify({ code: 404, msg: "目标身份不存在" }), { headers: corsHeaders });

    const pairKey = [myCode, targetCode].sort().join(':');
    const channelKey = `friend:msg:${pairKey}`;
    const existing = await kv.get(channelKey);
    if (!existing) await kv.put(channelKey, "[]", { expirationTtl: 86400 * 3 });

    return new Response(JSON.stringify({ code: 200, msg: "Pair established" }), { headers: corsHeaders });
  }

  if (path === "/api/send-friend-msg") {
    const { myCode, targetCode, msg, type = 'text' } = await getJsonBody(request);
    if (!myCode || !targetCode || !msg) return new Response(JSON.stringify({ code: 400, msg: "Missing fields" }), { headers: corsHeaders });

    const pairKey = [myCode, targetCode].sort().join(':');
    const key = `friend:msg:${pairKey}`;
    const rawData = await kv.get(key);
    let data = rawData ? JSON.parse(rawData) : [];
    
    data.push({ 
      id: generateMessageId(), 
      sender: myCode, 
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), 
      timestamp: Date.now(),
      type,
      content: msg,
      read: false
    });
    if (data.length > 100) data.shift();
    await kv.put(key, JSON.stringify(data), { expirationTtl: 86400 * 3 });
    return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
  }

  if (path === "/api/get-friend-msg") {
    const myCode = url.searchParams.get("myCode");
    const targetCode = url.searchParams.get("targetCode");
    if (!myCode || !targetCode) return new Response(JSON.stringify({ code: 400 }), { headers: corsHeaders });

    const pairKey = [myCode, targetCode].sort().join(':');
    const key = `friend:msg:${pairKey}`;
    const rawData = await kv.get(key);
    let data = rawData ? JSON.parse(rawData) : [];
    
    let changed = false;
    const processed = data.map((m: any) => {
      if (m.sender !== myCode && !m.read) {
        m.read = true;
        changed = true;
      }
      return m;
    });

    if (changed) await kv.put(key, JSON.stringify(processed), { expirationTtl: 86400 * 3 });
    return new Response(JSON.stringify({ code: 200, data: processed }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ code: 404, msg: "未找到接口" }), { status: 404, headers: corsHeaders });
};
