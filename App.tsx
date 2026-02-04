
import React, { useState, useEffect } from 'react';
import { TabType } from './types';
import RoomView from './components/RoomView';
import FriendView from './components/FriendView';
import SettingsView from './components/SettingsView';
import { MessageSquare, Users, Settings, Shield, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.ROOM);
  
  // 默认内置你提供的地址
  const DEFAULT_API = 'https://anon-chat-api.jeffreyy.workers.dev';

  const [apiBase, setApiBase] = useState<string>(() => {
    return localStorage.getItem('anon_chat_api_base') || DEFAULT_API;
  });

  // 判断是否在使用默认（内置）地址
  const isDefault = apiBase === DEFAULT_API || apiBase === '';

  useEffect(() => {
    localStorage.setItem('anon_chat_api_base', apiBase);
  }, [apiBase]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Shield size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">AnonCloud</h1>
          </div>
          <div className="flex items-center space-x-2">
            {isDefault ? (
              <div className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-[10px] font-bold border border-emerald-100">
                <Zap size={12} fill="currentColor" />
                <span>内置后端已连接</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-[10px] font-bold border border-amber-100">
                <span>自定义 API 模式</span>
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50">
        <div className="max-w-3xl mx-auto flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab(TabType.ROOM)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === TabType.ROOM ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare size={20} />
            <span className="text-[10px] font-bold uppercase">聊天室</span>
          </button>
          <button
            onClick={() => setActiveTab(TabType.FRIEND)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === TabType.FRIEND ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={20} />
            <span className="text-[10px] font-bold uppercase">私聊</span>
          </button>
          <button
            onClick={() => setActiveTab(TabType.SETTINGS)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === TabType.SETTINGS ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings size={20} />
            <span className="text-[10px] font-bold uppercase">设置</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
