
import React, { useState } from 'react';
import { Info, ShieldCheck, Trash2, RefreshCw, ChevronRight, Globe, AlertTriangle, Link2, ExternalLink } from 'lucide-react';

interface SettingsViewProps {
  apiBase: string;
  setApiBase: (url: string) => void;
  defaultApi: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ apiBase, setApiBase, defaultApi }) => {
  const [inputUrl, setInputUrl] = useState(apiBase);
  const [isTesting, setIsTesting] = useState(false);

  const handleReset = () => {
    if (window.confirm('抹除所有本地数据和配置？当前连接将被断开。')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const saveApi = () => {
    let formatted = inputUrl.trim();
    if (formatted && !formatted.startsWith('http')) {
      formatted = 'https://' + formatted;
    }
    setApiBase(formatted || defaultApi);
    alert('API 节点已更新并持久化。');
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center py-4 space-y-2">
         <div className="inline-block bg-white p-4 rounded-[28px] shadow-xl border border-slate-200 shadow-slate-200/50 mb-2">
            <ShieldCheck size={40} className="text-blue-600" strokeWidth={2.5} />
         </div>
         <h2 className="text-2xl font-black text-slate-900 tracking-tight">Privacy Vault</h2>
         <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Protocol Version: v1.3.5</p>
      </div>

      {/* Network Acceleration */}
      <div className="bg-white p-6 rounded-[32px] border border-blue-100 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-blue-600">
          <Globe size={18} strokeWidth={2.5} />
          <h4 className="text-[13px] font-black uppercase tracking-tight">网络加速与节点</h4>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <input 
              type="text" 
              value={inputUrl} 
              onChange={e => setInputUrl(e.target.value)}
              placeholder="API Endpoint (https://...)" 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 ring-blue-500/20"
            />
            <button 
              onClick={saveApi}
              className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
            >
              SAVE
            </button>
          </div>

          {apiBase.includes('workers.dev') && (
            <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <AlertTriangle className="text-amber-500 flex-shrink-0" size={14} />
              <p className="text-[10px] text-amber-700 font-medium leading-normal">
                检测到正在使用 workers.dev 域名。该后缀在某些地区可能被封锁导致连接失败。建议将 Worker 绑定到您的自定义域名以获得最佳稳定性。
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => { setInputUrl(defaultApi); setApiBase(defaultApi); }}
              className="flex items-center justify-center space-x-2 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-slate-600 transition-all"
            >
              <Link2 size={12}/>
              <span>使用本地节点</span>
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center space-x-2 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 text-[10px] font-black uppercase text-blue-600 transition-all"
            >
              <ExternalLink size={12}/>
              <span>部署教程</span>
            </a>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="space-y-3">
        {[
          { title: "Stateless Node", desc: "No identity logs or IP tracking.", color: "text-blue-600", icon: Info },
          { title: "Global Vanish", desc: "Messages auto-deleted within 12h.", color: "text-emerald-600", icon: Info },
          { title: "Tunnel Encryption", desc: "End-to-end transport protocol.", color: "text-indigo-600", icon: Info }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-5 rounded-[28px] border border-slate-200/60 shadow-sm flex items-start space-x-4">
            <div className={`mt-1 ${item.color}`}><item.icon size={18} strokeWidth={2.5}/></div>
            <div>
              <h4 className="text-[13px] font-black uppercase text-slate-800 tracking-tighter">{item.title}</h4>
              <p className="text-slate-500 text-[12px] font-medium leading-snug mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Management */}
      <div className="bg-slate-900 rounded-[40px] p-2 shadow-2xl shadow-slate-900/30 overflow-hidden">
        <button 
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-[32px] transition-all text-white active:scale-95"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl text-blue-400">
              <RefreshCw size={20} className={isTesting ? 'animate-spin' : ''} />
            </div>
            <span className="font-bold text-[13px] tracking-tight">Synchronize Cloud Node</span>
          </div>
          <ChevronRight size={18} className="text-white/20" />
        </button>

        <div className="h-1 bg-white/5 mx-6" />

        <button 
          onClick={handleReset}
          className="w-full flex items-center justify-between p-5 bg-transparent hover:bg-red-500/10 rounded-[32px] transition-all text-red-400 active:scale-95"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/10 rounded-xl"><Trash2 size={20} /></div>
            <span className="font-bold text-[13px] tracking-tight text-red-400">Wipe Local Cache</span>
          </div>
          <ChevronRight size={18} className="text-red-500/20" />
        </button>
      </div>

      <div className="text-center pt-4 opacity-20 select-none">
         <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900">End Transmission</p>
      </div>
    </div>
  );
};

export default SettingsView;
