

interface Env {
  // Fixed: Replaced missing KVNamespace type with any
  CHAT_KV: any;
}

// Fixed: Replaced missing PagesFunction type with an inline type definition for the context parameter
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
    return new Response(JSON.stringify({ code: 500, msg: "未检测到 CHAT_KV 绑定。请在 Cloudflare Pages 控制台的 设置 -> 函数 -> KV 命名空间绑定 中添加变量名为 CHAT_KV 的绑定。" }), { 
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

  // --- 房间群聊接口 ---
  if (path === "/api/create-room") {
    const code = generateCode(6);
    await kv.put(`room:msg:${code}`, "[]", { expirationTtl: 43200 }); // 12小时自动销毁
    return new Response(JSON.stringify({ code: 200, roomCode: code }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  if (path === "/api/send-msg") {
    const body: any = await request.json();
    const { roomCode, msg } = body;
    const key = `room:msg:${roomCode}`;
    const rawData = await kv.get(key);
    if (rawData === null) return new Response(JSON.stringify({ code: 404, msg: "房间不存在或已过期" }), { headers: corsHeaders });
    
    const data = JSON.parse(rawData);
    data.push({ time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), content: msg });
    if (data.length > 50) data.shift(); 
    await kv.put(key, JSON.stringify(data), { expirationTtl: 43200 });
    return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
  }

  if (path === "/api/get-msg") {
    const code = url.searchParams.get("roomCode");
    const data = await kv.get(`room:msg:${code}`);
    return new Response(JSON.stringify({ code: 200, data: JSON.parse(data || "[]") }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  // --- 1v1 私聊接口 ---
  if (path === "/api/create-friend-code") {
    const code = generateCode(8);
    await kv.put(`friend:reg:${code}`, "1", { expirationTtl: 604800 }); 
    return new Response(JSON.stringify({ code: 200, friendCode: code }), { headers: corsHeaders });
  }

  if (path === "/api/add-friend") {
    const body: any = await request.json();
    const { myCode, targetCode } = body;
    const relKey = [myCode, targetCode].sort().join("_");
    await kv.put(`friend:rel:${relKey}`, "1", { expirationTtl: 604800 });
    return new Response(JSON.stringify({ code: 200, msg: "连接成功" }), { headers: corsHeaders });
  }

  if (path === "/api/send-friend-msg") {
    const body: any = await request.json();
    const { myCode, targetCode, msg } = body;
    const relKey = [myCode, targetCode].sort().join("_");
    const msgKey = `friend:msg:${relKey}`;
    const data = JSON.parse(await kv.get(msgKey) || "[]");
    data.push({ time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), content: msg });
    await kv.put(msgKey, JSON.stringify(data), { expirationTtl: 43200 });
    return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
  }

  if (path === "/api/get-friend-msg") {
    const myCode = url.searchParams.get("myCode");
    const targetCode = url.searchParams.get("targetCode");
    const relKey = [myCode, targetCode].sort().join("_");
    const data = await kv.get(`friend:msg:${relKey}`);
    return new Response(JSON.stringify({ code: 200, data: JSON.parse(data || "[]") }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ code: 404, msg: "未找到接口" }), { 
    status: 404, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
};
