
import React from 'react';
import { Info, ShieldCheck, Trash2, RefreshCw } from 'lucide-react';

interface SettingsViewProps {
  apiBase: string;
  setApiBase: (url: string) => void;
  defaultApi: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ setApiBase, defaultApi }) => {
  
  const handleReset = () => {
    if (window.confirm('确定要重置所有设置并清理缓存吗？这会断开当前的私聊连接并清空本地房间记录。')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 隐私与安全说明 - 现在作为主卡片 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 text-slate-800">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-xl font-bold">隐私与安全声明</h2>
        </div>

        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-blue-500 mt-0.5"><Info size={18} /></div>
            <p>
              <span className="font-bold text-slate-800 block mb-1">无状态匿名架构</span>
              本程序不存储任何个人身份信息（PII）。您的消息通过高强度加密通道传输，系统不记录 IP、不要求登录。
            </p>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-blue-500 mt-0.5"><Info size={18} /></div>
            <p>
              <span className="font-bold text-slate-800 block mb-1">数据物理销毁</span>
              基于 Cloudflare KV 的 TTL 特性，所有聊天数据均设有 12 小时强制过期时间。一旦过期，数据将从全球节点彻底物理抹除，不可恢复。
            </p>
          </div>
          
          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-blue-500 mt-0.5"><Info size={18} /></div>
            <p>
              <span className="font-bold text-slate-800 block mb-1">后端透明化</span>
              为了进一步保护系统安全，后端接口地址已在 UI 中完全隐藏。您可以放心使用预设的安全隧道。
            </p>
          </div>
        </div>
      </div>

      {/* 危险操作区 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">数据管理</h3>
        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl transition-colors border border-slate-100 text-slate-700 font-medium group"
          >
            <div className="flex items-center space-x-3">
              <RefreshCw size={18} className="text-blue-500 group-active:rotate-180 transition-transform duration-500" />
              <span>刷新应用连接</span>
            </div>
          </button>

          <button 
            onClick={handleReset}
            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-red-50 rounded-2xl transition-colors border border-slate-100 text-red-600 font-medium group"
          >
            <div className="flex items-center space-x-3">
              <Trash2 size={18} className="text-red-500" />
              <span>清理本地缓存并重置</span>
            </div>
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2 italic">
          AnonCloud v1.2.0 • 强隐私匿名通讯协议
        </p>
      </div>
    </div>
  );
};

export default SettingsView;
