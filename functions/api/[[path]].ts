
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

  // --- 路由处理 ---

  if (path === "/api/create-room") {
    const code = generateCode(6);
    await kv.put(`room:msg:${code}`, "[]", { expirationTtl: 43200 });
    return new Response(JSON.stringify({ code: 200, roomCode: code }), { headers: corsHeaders });
  }

  if (path === "/api/send-msg") {
    const { roomCode, msg, type = 'text', isBurn = false } = await request.json();
    const key = `room:msg:${roomCode}`;
    const rawData = await kv.get(key);
    if (rawData === null) return new Response(JSON.stringify({ code: 404, msg: "房间不存在" }), { headers: corsHeaders });
    
    const data = JSON.parse(rawData);
    data.push({ 
      id: Math.random().toString(36).substring(2, 15),
      sender: 'anonymous', 
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), 
      timestamp: Date.now(), // 增加时间戳用于销毁计算
      type,
      content: msg,
      read: false,
      isBurn
    });
    if (data.length > 30) data.shift(); 
    await kv.put(key, JSON.stringify(data), { expirationTtl: 43200 });
    return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
  }

  if (path === "/api/get-msg") {
    const code = url.searchParams.get("roomCode");
    const key = `room:msg:${code}`;
    const rawData = await kv.get(key);
    let data = JSON.parse(rawData || "[]");
    
    const now = Date.now();
    // 房间阅后即焚逻辑：为了让所有人都能看到，给予 15 秒展示宽限期
    // 只有超过 15 秒的 burn 消息才会被从 KV 中剔除
    const expiredBurnIds = data
      .filter((m: any) => m.isBurn && (now - (m.timestamp || 0) > 15000))
      .map((m: any) => m.id);

    if (expiredBurnIds.length > 0) {
      const remaining = data.filter((m: any) => !expiredBurnIds.includes(m.id));
      await kv.put(key, JSON.stringify(remaining), { expirationTtl: 43200 });
      // 注意：本次请求依然返回这些“刚过期”的消息，下次轮询就会消失
    }

    return new Response(JSON.stringify({ code: 200, data }), { headers: corsHeaders });
  }

  if (path === "/api/delete-room-msg") {
    try {
      const { roomCode, messageId } = await request.json();
      const key = `room:msg:${roomCode}`;
      const rawData = await kv.get(key);
      if (!rawData) return new Response(JSON.stringify({ code: 200, msg: "Already empty" }), { headers: corsHeaders });
      const data = JSON.parse(rawData).filter((m: any) => m.id !== messageId);
      await kv.put(key, JSON.stringify(data), { expirationTtl: 43200 });
      return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ code: 500, msg: "Delete operation failed" }), { status: 500, headers: corsHeaders });
    }
  }

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
    const { myCode, targetCode, msg, type = 'text', isBurn = false } = await request.json();
    const relKey = [myCode, targetCode].sort().join("_");
    const msgKey = `friend:msg:${relKey}`;
    const data = JSON.parse(await kv.get(msgKey) || "[]");
    data.push({ 
      id: Math.random().toString(36).substring(2, 15),
      sender: myCode, 
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), 
      timestamp: Date.now(),
      type,
      content: msg,
      read: false,
      isBurn
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

    // 好友阅后即焚逻辑：
    // 如果消息是对方发的且标记为阅后即焚，那么在我这次获取后，就应该从 KV 中删掉
    const burnMessagesFromTarget = data.filter((m: any) => m.isBurn && m.sender === targetCode);
    
    if (burnMessagesFromTarget.length > 0 || updated) {
      // 过滤掉所有我已经读过的对方发的阅后即焚消息
      const remaining = data.filter((m: any) => !(m.isBurn && m.sender === targetCode));
      await kv.put(msgKey, JSON.stringify(remaining), { expirationTtl: 43200 });
      // 同样，本次请求返回完整 data（包含刚刚焚毁的），下次轮询双方都看不到了
    }

    return new Response(JSON.stringify({ code: 200, data }), { headers: corsHeaders });
  }

  if (path === "/api/delete-friend-msg") {
    try {
      const { myCode, targetCode, messageId } = await request.json();
      const relKey = [myCode, targetCode].sort().join("_");
      const msgKey = `friend:msg:${relKey}`;
      const rawData = await kv.get(msgKey);
      if (!rawData) return new Response(JSON.stringify({ code: 200, msg: "Already empty" }), { headers: corsHeaders });
      const data = JSON.parse(rawData).filter((m: any) => m.id !== messageId);
      await kv.put(msgKey, JSON.stringify(data), { expirationTtl: 43200 });
      return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ code: 500, msg: "Delete operation failed" }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ code: 404, msg: "未找到接口" }), { status: 404, headers: corsHeaders });
};
