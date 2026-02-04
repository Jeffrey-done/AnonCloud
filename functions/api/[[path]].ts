
interface Env {
  CHAT_KV: any;
}

export const onRequest = async (context: { request: Request; env: Env; params: any }) => {
  const { request, env, params } = context;
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

  // --- 房间群聊 ---
  if (path === "/api/create-room") {
    const code = generateCode(6);
    await kv.put(`room:msg:${code}`, "[]", { expirationTtl: 43200 });
    return new Response(JSON.stringify({ code: 200, roomCode: code }), { headers: corsHeaders });
  }

  if (path === "/api/send-msg") {
    const { roomCode, msg, type = 'text' } = await request.json();
    const key = `room:msg:${roomCode}`;
    const rawData = await kv.get(key);
    if (rawData === null) return new Response(JSON.stringify({ code: 404, msg: "房间不存在" }), { headers: corsHeaders });
    
    const data = JSON.parse(rawData);
    data.push({ 
      id: Math.random().toString(36).substring(2, 11),
      sender: 'anonymous', 
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), 
      type,
      content: msg,
      read: false 
    });
    // 限制群聊记录条数，节省 KV 空间
    if (data.length > 30) data.shift(); 
    await kv.put(key, JSON.stringify(data), { expirationTtl: 43200 });
    return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
  }

  if (path === "/api/get-msg") {
    const code = url.searchParams.get("roomCode");
    const data = await kv.get(`room:msg:${code}`);
    return new Response(JSON.stringify({ code: 200, data: JSON.parse(data || "[]") }), { headers: corsHeaders });
  }

  // --- 1v1 私聊 ---
  if (path === "/api/create-friend-code") {
    const code = generateCode(8);
    await kv.put(`friend:reg:${code}`, "1", { expirationTtl: 604800 }); 
    return new Response(JSON.stringify({ code: 200, friendCode: code }), { headers: corsHeaders });
  }

  if (path === "/api/add-friend") {
    const { myCode, targetCode } = await request.json();
    const relKey = [myCode, targetCode].sort().join("_");
    await kv.put(`friend:rel:${relKey}`, "1", { expirationTtl: 604800 });
    return new Response(JSON.stringify({ code: 200, msg: "连接成功" }), { headers: corsHeaders });
  }

  if (path === "/api/send-friend-msg") {
    const { myCode, targetCode, msg, type = 'text' } = await request.json();
    const relKey = [myCode, targetCode].sort().join("_");
    const msgKey = `friend:msg:${relKey}`;
    const data = JSON.parse(await kv.get(msgKey) || "[]");
    data.push({ 
      id: Math.random().toString(36).substring(2, 11),
      sender: myCode, 
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), 
      type,
      content: msg,
      read: false 
    });
    if (data.length > 50) data.shift();
    await kv.put(msgKey, JSON.stringify(data), { expirationTtl: 43200 });
    return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
  }

  if (path === "/api/get-friend-msg") {
    const myCode = url.searchParams.get("myCode");
    const targetCode = url.searchParams.get("targetCode");
    const relKey = [myCode, targetCode].sort().join("_");
    const msgKey = `friend:msg:${relKey}`;
    let data = JSON.parse(await kv.get(msgKey) || "[]");
    let updated = false;
    data = data.map((m: any) => {
      if (m.sender === targetCode && !m.read) {
        m.read = true;
        updated = true;
      }
      return m;
    });
    if (updated) await kv.put(msgKey, JSON.stringify(data), { expirationTtl: 43200 });
    return new Response(JSON.stringify({ code: 200, data }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ code: 404, msg: "未找到接口" }), { status: 404, headers: corsHeaders });
};
