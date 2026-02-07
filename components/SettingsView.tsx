
import React, { useState } from 'react';
import { ShieldCheck, Trash2, RefreshCw, ChevronRight, Globe, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';

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

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center py-4 space-y-2">
         <div className="inline-block bg-white p-4 rounded-[28px] shadow-xl border border-slate-200 shadow-slate-200/50 mb-2">
            <ShieldCheck size={40} className="text-blue-600" strokeWidth={2.5} />
         </div>
         <h2 className="text-2xl font-black text-slate-900 tracking-tight">隐私保险箱</h2>
         <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">AnonCloud Secure Protocol</p>
      </div>

      {/* Connection Guide for China */}
      <div className="bg-blue-600 rounded-[32px] p-6 text-white shadow-xl shadow-blue-200">
        <div className="flex items-center space-x-3 mb-3">
          <Smartphone size={20} className="text-blue-200" />
          <h4 className="font-black text-xs uppercase tracking-wider">中国大陆直连方案</h4>
        </div>
        <div className="space-y-3 opacity-90 text-[11px] leading-relaxed font-bold">
          <p>如果你在大陆无法发送信息，请按以下步骤操作：</p>
          <div className="bg-white/10 p-3 rounded-2xl space-y-2">
            <p>1. <span className="text-blue-200">不要使用</span> *.workers.dev 或 *.pages.dev 域名。</p>
            <p>2. 给 Pages 项目绑定一个<span className="text-blue-200">自定义域名</span>（如 .com/.net）。</p>
            <p>3. 将 API 模式设为 <span className="text-blue-200">“同源模式”</span>（下方清空地址即可）。</p>
          </div>
          <p className="text-[10px] text-blue-100 italic">原理：自定义域名+同源 API 请求目前是最稳定的直连方式。</p>
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-50 text-slate-600 rounded-xl"><Globe size={18} /></div>
            <span className="font-black text-[13px] text-slate-800 uppercase tracking-tighter">API 路由</span>
          </div>
          <button 
            onClick={() => setShowApiInput(!showApiInput)}
            className="text-[10px] font-black text-blue-600 uppercase"
          >
            {showApiInput ? '收起' : '修改'}
          </button>
        </div>

        {showApiInput ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <input 
              type="text" 
              value={tempApi} 
              onChange={e => setTempApi(e.target.value)}
              placeholder="留空即使用同源 API (推荐)"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 ring-blue-100"
            />
            <div className="flex space-x-2">
              <button onClick={saveApi} className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest">保存设置</button>
              <button onClick={() => { setTempApi(''); setApiBase(''); setShowApiInput(false); }} className="px-4 bg-slate-100 text-slate-500 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest">重置</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-100">
            <div className="flex flex-col">
              <span className="text-[10px] text-emerald-600 font-black uppercase">当前模式</span>
              <span className="text-xs font-mono text-emerald-700 truncate">
                {apiBase ? '外部代理节点' : '同源原生节点 (Native)'}
              </span>
            </div>
            <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
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
            <span className="font-bold text-[13px] tracking-tight">同步云端状态</span>
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
            <span className="font-bold text-[13px] tracking-tight">销毁本地数据</span>
          </div>
          <ChevronRight size={18} className="text-red-500/20" />
        </button>
      </div>

      <div className="text-center pt-4 opacity-10 select-none">
         <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-900">Encrypted Communication End</p>
      </div>
    </div>
  );
};

export default SettingsView;
