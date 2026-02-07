
import React, { useState } from 'react';
import { ShieldCheck, Trash2, RefreshCw, ChevronRight, Globe, CheckCircle, Smartphone, HelpCircle } from 'lucide-react';

interface SettingsViewProps {
  apiBase: string;
  setApiBase: (url: string) => void;
  defaultApi: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ apiBase, setApiBase, defaultApi }) => {
  const [tempApi, setTempApi] = useState(apiBase);
  const [showApiInput, setShowApiInput] = useState(false);

  const handleReset = () => {
    if (window.confirm('确定要清除所有本地数据吗？这将导致当前所有的匿名身份丢失。')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const saveApi = () => {
    setApiBase(tempApi);
    setShowApiInput(false);
  };

  const isNative = !apiBase || apiBase.trim() === '';

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center py-4 space-y-2">
         <div className="inline-block bg-white p-4 rounded-[28px] shadow-xl border border-slate-200 shadow-slate-200/50 mb-2">
            <ShieldCheck size={40} className="text-blue-600" strokeWidth={2.5} />
         </div>
         <h2 className="text-2xl font-black text-slate-900 tracking-tight">隐私保险箱</h2>
         <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">Security Dashboard</p>
      </div>

      {/* Connectivity Status for China */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[32px] p-6 text-white shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <Smartphone size={20} className="text-blue-200" />
          <h4 className="font-black text-xs uppercase tracking-wider">连接优化指南 (中国区)</h4>
        </div>
        <div className="space-y-4 opacity-95 text-[11px] leading-relaxed font-bold">
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 space-y-2">
            <p className="flex items-start space-x-2">
              <span className="bg-blue-400 text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
              <span>必须在 Cloudflare Pages 设置中绑定<b>您的自定义域名</b>（如 64209310.xyz）。</span>
            </p>
            <p className="flex items-start space-x-2">
              <span className="bg-blue-400 text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
              <span>将“API 路由”设置为<b>同源原生模式</b>（当前已是默认）。</span>
            </p>
          </div>
          <p className="px-1 text-white/60 italic text-[10px]">原理：通过自定义域名直连，可以绕过对 Cloudflare 默认域名的干扰。</p>
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-50 text-slate-600 rounded-xl"><Globe size={18} /></div>
            <span className="font-black text-[13px] text-slate-800 uppercase tracking-tighter">通信模式</span>
          </div>
          <button 
            onClick={() => setShowApiInput(!showApiInput)}
            className="text-[10px] font-black text-blue-600 uppercase"
          >
            {showApiInput ? '收起' : '高级设置'}
          </button>
        </div>

        {showApiInput ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <input 
              type="text" 
              value={tempApi} 
              onChange={e => setTempApi(e.target.value)}
              placeholder="留空使用本域名 API (推荐)"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 ring-blue-100"
            />
            <div className="flex space-x-2">
              <button onClick={saveApi} className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest">保存</button>
              <button onClick={() => { setTempApi(''); setApiBase(''); setShowApiInput(false); }} className="px-4 bg-slate-100 text-slate-500 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest">原生</button>
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${isNative ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
            <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase ${isNative ? 'text-emerald-600' : 'text-blue-600'}`}>
                {isNative ? '同源原生模式' : '第三方代理模式'}
              </span>
              <span className="text-xs font-mono text-slate-600 truncate max-w-[180px]">
                {isNative ? 'Running on current domain' : apiBase}
              </span>
            </div>
            {isNative ? <CheckCircle size={16} className="text-emerald-500" /> : <Globe size={16} className="text-blue-500" />}
          </div>
        )}
      </div>

      {/* Management Actions */}
      <div className="bg-slate-900 rounded-[40px] p-2 shadow-2xl shadow-slate-900/30">
        <button 
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-[32px] transition-all text-white"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl text-blue-400"><RefreshCw size={20} /></div>
            <span className="font-bold text-[13px] tracking-tight">刷新并强制同步</span>
          </div>
          <ChevronRight size={18} className="text-white/20" />
        </button>

        <div className="h-[1px] bg-white/5 mx-6 my-1" />

        <button 
          onClick={handleReset}
          className="w-full flex items-center justify-between p-5 bg-transparent hover:bg-red-500/10 rounded-[32px] transition-all text-red-400"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/10 rounded-xl"><Trash2 size={20} /></div>
            <span className="font-bold text-[13px] tracking-tight">销毁本地身份数据</span>
          </div>
          <ChevronRight size={18} className="text-red-500/20" />
        </button>
      </div>

      <div className="flex items-center justify-center space-x-2 opacity-20 text-slate-900 pt-4">
        <HelpCircle size={12} />
        <p className="text-[9px] font-black uppercase tracking-[0.2em]">End-to-End Encrypted Tunnel</p>
      </div>
    </div>
  );
};

export default SettingsView;
