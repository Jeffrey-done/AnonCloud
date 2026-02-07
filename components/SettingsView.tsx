
import React, { useState } from 'react';
import { Info, ShieldCheck, Trash2, RefreshCw, ChevronRight, Globe, Link2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { request } from '../services/api';

interface SettingsViewProps {
  apiBase: string;
  setApiBase: (url: string) => void;
  defaultApi: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ apiBase, setApiBase, defaultApi }) => {
  const [tempApi, setTempApi] = useState(apiBase);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  const handleReset = () => {
    if (window.confirm('Wipe all local data and configurations? Current link will be terminated.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      // 尝试访问一个基础接口测试连通性
      const res = await fetch(`${tempApi.replace(/\/+$/, '')}/api/get-msg?roomCode=PING`);
      if (res.ok) {
        setTestStatus('success');
        setApiBase(tempApi);
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('failed');
      }
    } catch (e) {
      setTestStatus('failed');
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Brand Header */}
      <div className="text-center py-4 space-y-2">
         <div className="inline-block bg-white p-4 rounded-[28px] shadow-xl border border-slate-200 shadow-slate-200/50 mb-2">
            <ShieldCheck size={40} className="text-blue-600" strokeWidth={2.5} />
         </div>
         <h2 className="text-2xl font-black text-slate-900 tracking-tight">Privacy Vault</h2>
         <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">System Compliance: v1.3.5</p>
      </div>

      {/* API Node Configuration */}
      <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-800">
          <Globe size={18} className="text-blue-500" />
          <h3 className="font-black text-xs uppercase tracking-widest">Protocol Endpoint</h3>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <input 
              type="text" 
              value={tempApi}
              onChange={(e) => setTempApi(e.target.value)}
              placeholder="https://your-worker.com"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-mono font-medium outline-none focus:ring-2 ring-blue-100 transition-all"
            />
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={testConnection}
              disabled={testStatus === 'testing'}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                testStatus === 'success' ? 'bg-emerald-500 text-white' : 
                testStatus === 'failed' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'
              }`}
            >
              {testStatus === 'testing' ? <Loader2 size={14} className="animate-spin" /> : 
               testStatus === 'success' ? <Check size={14} /> : 
               testStatus === 'failed' ? <AlertCircle size={14} /> : <Link2 size={14} />}
              <span>{testStatus === 'testing' ? 'Linking...' : testStatus === 'success' ? 'Node Active' : testStatus === 'failed' ? 'Link Failed' : 'Apply Node'}</span>
            </button>
            <button 
              onClick={() => { setTempApi(defaultApi); setApiBase(defaultApi); }}
              className="px-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"
              title="Reset to Default"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-medium px-1">
            * 如果无法发送消息，请部署自己的 Cloudflare Worker 并在此输入自定义域名地址。
          </p>
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
            <div className="p-2 bg-white/10 rounded-xl text-blue-400"><RefreshCw size={20} /></div>
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
