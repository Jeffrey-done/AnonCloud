
import React, { useState } from 'react';
import { Settings, ShieldCheck, Database, HelpCircle, Code, Copy, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  apiBase: string;
  setApiBase: (url: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ apiBase, setApiBase }) => {
  const [copied, setCopied] = useState(false);
  
  // 完整的后端 Worker 代码逻辑 - 专为 Cloudflare Workers 优化
  const fullWorkerCode = `/**
 * AnonCloud Chat 后端 Worker
 * 部署指南：
 * 1. 在 Cloudflare 创建 Worker
 * 2. 粘贴此代码
 * 3. 在 Worker 设置 -> 变量 -> KV 命名空间绑定：
 *    - 变量名: CHAT_KV
 *    - KV 命名空间: 选择您创建的 KV
 */
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const path = url.pathname;
    const kv = env.CHAT_KV;

    if (!kv) {
      return new Response(JSON.stringify({ code: 500, msg: "KV 命名空间未绑定" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const generateCode = (len) => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let res = "";
      for(let i=0; i<len; i++) res += chars.charAt(Math.floor(Math.random()*chars.length));
      return res;
    };

    // --- 房间群聊接口 ---
    if (path === "/api/create-room") {
      const code = generateCode(6);
      await kv.put(\`room:msg:\${code}\`, "[]", { expirationTtl: 43200 }); // 12小时自动销毁
      return new Response(JSON.stringify({ code: 200, roomCode: code }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (path === "/api/send-msg") {
      const { roomCode, msg } = await request.json();
      const key = \`room:msg:\${roomCode}\`;
      const rawData = await kv.get(key);
      if (rawData === null) return new Response(JSON.stringify({ code: 404, msg: "房间不存在或已过期" }), { headers: corsHeaders });
      
      const data = JSON.parse(rawData);
      data.push({ time: new Date().toLocaleTimeString(), content: msg });
      if (data.length > 50) data.shift(); // 限制记录数量
      await kv.put(key, JSON.stringify(data), { expirationTtl: 43200 });
      return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
    }

    if (path === "/api/get-msg") {
      const code = url.searchParams.get("roomCode");
      const data = await kv.get(\`room:msg:\${code}\`);
      return new Response(JSON.stringify({ code: 200, data: JSON.parse(data || "[]") }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // --- 1v1 私聊接口 ---
    if (path === "/api/create-friend-code") {
      const code = generateCode(8);
      await kv.put(\`friend:reg:\${code}\`, "1", { expirationTtl: 604800 }); // 7天有效
      return new Response(JSON.stringify({ code: 200, friendCode: code }), { headers: corsHeaders });
    }

    if (path === "/api/add-friend") {
      const { myCode, targetCode } = await request.json();
      const relKey = [myCode, targetCode].sort().join("_");
      await kv.put(\`friend:rel:\${relKey}\`, "1", { expirationTtl: 604800 });
      return new Response(JSON.stringify({ code: 200, msg: "连接成功" }), { headers: corsHeaders });
    }

    if (path === "/api/send-friend-msg") {
      const { myCode, targetCode, msg } = await request.json();
      const relKey = [myCode, targetCode].sort().join("_");
      const msgKey = \`friend:msg:\${relKey}\`;
      const data = JSON.parse(await kv.get(msgKey) || "[]");
      data.push({ time: new Date().toLocaleTimeString(), content: msg });
      await kv.put(msgKey, JSON.stringify(data), { expirationTtl: 43200 });
      return new Response(JSON.stringify({ code: 200 }), { headers: corsHeaders });
    }

    if (path === "/api/get-friend-msg") {
      const myCode = url.searchParams.get("myCode");
      const targetCode = url.searchParams.get("targetCode");
      const relKey = [myCode, targetCode].sort().join("_");
      const data = await kv.get(\`friend:msg:\${relKey}\`);
      return new Response(JSON.stringify({ code: 200, data: JSON.parse(data || "[]") }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ code: 404, msg: "Endpoint not found" }), { 
      status: 404, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
};`;

  const copyWorkerCode = () => {
    navigator.clipboard.writeText(fullWorkerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-700">
          <Settings size={20} />
          <h2 className="text-lg font-bold">后端连接配置</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Cloudflare Worker API URL</label>
            <input
              type="text"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://your-worker.username.workers.dev"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-400">
            <Code size={20} />
            <h2 className="text-lg font-bold">后端部署代码 (直接复制)</h2>
          </div>
          <button onClick={copyWorkerCode} className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors">
            {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
            <span className="text-xs">{copied ? '已复制' : '复制全代码'}</span>
          </button>
        </div>
        <div className="bg-slate-950 rounded-xl p-4 overflow-hidden border border-slate-800">
          <pre className="text-[11px] text-slate-500 font-mono whitespace-pre overflow-x-auto max-h-60 overflow-y-auto">
            {fullWorkerCode}
          </pre>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed italic">
          注：在 Worker 中必须绑定一个名为 CHAT_KV 的命名空间，否则 API 会报错。
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-700">
          <HelpCircle size={20} />
          <h2 className="text-lg font-bold">部署步骤回顾</h2>
        </div>
        <div className="text-xs text-slate-500 space-y-2 list-decimal list-inside">
          <p>1. 登录 Cloudflare 控制台，创建一个 KV 命名空间（起名为 chat-anon-kv）。</p>
          <p>2. 创建一个 Worker，将上方的黑色背景代码全部替换进去。</p>
          <p>3. 在 Worker 的【设置】→【变量】里，将刚才的 KV 绑定为变量名 <code className="text-blue-600 font-bold">CHAT_KV</code>。</p>
          <p>4. 部署 Worker 后，把它的 URL 填入本页顶部的配置框中。</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
