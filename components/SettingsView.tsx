
import React, { useState } from 'react';
import { Settings, HelpCircle, RotateCcw, Zap, Info, ShieldCheck } from 'lucide-react';

interface SettingsViewProps {
  apiBase: string;
  setApiBase: (url: string) => void;
  defaultApi: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ apiBase, setApiBase, defaultApi }) => {
  const isDefault = apiBase === defaultApi;

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-700">
            <Settings size={20} />
            <h2 className="text-lg font-bold">后端引擎配置</h2>
          </div>
          {isDefault && (
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">官方预设</span>
          )}
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
          <div className="flex items-start space-x-3">
            <Zap size={18} className="text-blue-600 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-800 mb-1">当前 API 地址</p>
              <p className="font-mono break-all">{apiBase || '（使用相对路径 /api）'}</p>
            </div>
          </div>
          
          {!isDefault && (
            <button 
              onClick={() => setApiBase(defaultApi)}
              className="flex items-center space-x-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase pt-2"
            >
              <RotateCcw size={12} />
              <span>恢复官方内置地址</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">自定义 API Base URL</label>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://your-worker.workers.dev"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-700">
          <ShieldCheck size={20} className="text-emerald-500" />
          <h2 className="text-lg font-bold">隐私与安全</h2>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-start space-x-3">
            <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600 mt-0.5"><Info size={14} /></div>
            <p>本程序采用<b>无状态匿名设计</b>。您的消息直接通过加密隧道传输，不关联任何个人 ID。</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600 mt-0.5"><Info size={14} /></div>
            <p>所有聊天记录由 Cloudflare KV 设置了 <b>TTL 自动物理销毁</b>。12 小时后数据将彻底从服务器抹除。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
