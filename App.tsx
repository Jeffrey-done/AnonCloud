
import React, { useState, useEffect } from 'react';
import { TabType } from './types';
import RoomView from './components/RoomView';
import FriendView from './components/FriendView';
import SettingsView from './components/SettingsView';
import { MessageSquare, Users, Settings, Shield, Zap, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.ROOM);
  
  /**
   * 关键修改：默认 API 设为空字符串
   * 在 Cloudflare Pages 中，这会自动指向项目自带的 /functions/api
   * 这样只要 Pages 域名 (xxx.pages.dev) 能访问，聊天功能就一定能用，无需 VPN。
   */
  const DEFAULT_API = '';

  const [apiBase, setApiBase] = useState<string>(() => {
    return localStorage.getItem('anon_chat_api_base') || DEFAULT_API;
  });

  // 判断是否在使用内置优化通道
  const isDefault = apiBase === DEFAULT_API || apiBase === '' || apiBase.includes(window.location.hostname);

  useEffect(() => {
    localStorage.setItem('anon_chat_api_base', apiBase);
  }, [apiBase]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
              <Shield size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">AnonCloud</h1>
          </div>
          <div className="flex items-center">
            {isDefault ? (
              <div className="flex items-center space-x-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-[10px] font-bold border border-emerald-100 animate-pulse">
                <Zap size={12} fill="currentColor" />
                <span>安全隧道已加密直连</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-[10px] font-bold border border-amber-100">
                <Globe size={12} />
                <span>外部 API 模式</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 pb-24">
        {activeTab === TabType.ROOM && <RoomView apiBase={apiBase} />}
        {activeTab === TabType.FRIEND && <FriendView apiBase={apiBase} />}
        {activeTab === TabType.SETTINGS && <SettingsView apiBase={apiBase} setApiBase={setApiBase} defaultApi={DEFAULT_API} />}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="max-w-3xl mx-auto flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab(TabType.ROOM)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
              activeTab === TabType.ROOM ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MessageSquare size={20} className={activeTab === TabType.ROOM ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-widest">聊天室</span>
          </button>
          <button
            onClick={() => setActiveTab(TabType.FRIEND)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
              activeTab === TabType.FRIEND ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users size={20} className={activeTab === TabType.FRIEND ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-widest">私聊</span>
          </button>
          <button
            onClick={() => setActiveTab(TabType.SETTINGS)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
              activeTab === TabType.SETTINGS ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Settings size={20} className={activeTab === TabType.SETTINGS ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-widest">设置</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
