
import React, { useState, useEffect } from 'react';
import { TabType } from './types';
import RoomView from './components/RoomView';
import FriendView from './components/FriendView';
import SettingsView from './components/SettingsView';
import { MessageSquare, Users, Settings, Shield, Globe, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.ROOM);
  
  // 核心逻辑：空字符串代表“相对路径”，即访问当前网页域名下的 /api
  const DEFAULT_API = ''; 

  const [apiBase, setApiBase] = useState<string>(() => {
    const stored = localStorage.getItem('anon_chat_api_base');
    // 强制清理过期的 workers.dev 或 pages.dev 存储，改用 Native 模式
    if (!stored || stored.includes('workers.dev') || stored.includes('pages.dev')) {
      return DEFAULT_API;
    }
    return stored;
  });

  const [isBlockedDomain, setIsBlockedDomain] = useState(false);

  useEffect(() => {
    localStorage.setItem('anon_chat_api_base', apiBase);
    // 检测当前访问域名
    const hostname = window.location.hostname;
    if (hostname.endsWith('pages.dev') || hostname.endsWith('workers.dev')) {
      setIsBlockedDomain(true);
    } else {
      setIsBlockedDomain(false);
    }
  }, [apiBase]);

  const isNative = apiBase === '';

  return (
    <div className="h-[100dvh] flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Blocked Domain Warning */}
      {isBlockedDomain && (
        <div className="bg-amber-500 text-white px-4 py-2 text-[11px] font-black flex items-center justify-center space-x-2 animate-pulse z-[100]">
          <AlertTriangle size={14} />
          <span className="tracking-tight uppercase">警告：当前使用的域名在大陆不稳定，请使用您的自定义域名访问</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex-shrink-0 z-50">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-xl text-white shadow-lg shadow-blue-200/50">
              <Shield size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">AnonCloud</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 block">Secure Protocol</span>
            </div>
          </div>
          
          <div className="flex items-center">
            {isNative ? (
              <div className="flex items-center space-x-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-[10px] font-black border border-emerald-100">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>NATIVE NODE (SAFE)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-[10px] font-black border border-amber-100">
                <Globe size={10} />
                <span>PROXY NODE</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto relative overflow-hidden">
        {activeTab === TabType.ROOM && <RoomView apiBase={apiBase} />}
        {activeTab === TabType.FRIEND && <FriendView apiBase={apiBase} />}
        {activeTab === TabType.SETTINGS && (
          <div className="h-full overflow-y-auto px-4 pt-6 pb-32">
            <SettingsView apiBase={apiBase} setApiBase={setApiBase} defaultApi={DEFAULT_API} />
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-4 right-4 z-50 pointer-events-none">
        <div className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-lg border border-white/10 rounded-3xl shadow-2xl shadow-slate-900/40 px-2 py-2 pointer-events-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveTab(TabType.ROOM)}
              className={`flex flex-col items-center justify-center flex-1 py-3 rounded-2xl transition-all duration-300 ${
                activeTab === TabType.ROOM ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare size={20} strokeWidth={activeTab === TabType.ROOM ? 2.5 : 2} />
              <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${activeTab === TabType.ROOM ? 'opacity-100' : 'opacity-60'}`}>聊天</span>
            </button>
            
            <button
              onClick={() => setActiveTab(TabType.FRIEND)}
              className={`flex flex-col items-center justify-center flex-1 py-3 rounded-2xl transition-all duration-300 ${
                activeTab === TabType.FRIEND ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users size={20} strokeWidth={activeTab === TabType.FRIEND ? 2.5 : 2} />
              <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${activeTab === TabType.FRIEND ? 'opacity-100' : 'opacity-60'}`}>私密</span>
            </button>
            
            <button
              onClick={() => setActiveTab(TabType.SETTINGS)}
              className={`flex flex-col items-center justify-center flex-1 py-3 rounded-2xl transition-all duration-300 ${
                activeTab === TabType.SETTINGS ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings size={20} strokeWidth={activeTab === TabType.SETTINGS ? 2.5 : 2} />
              <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${activeTab === TabType.SETTINGS ? 'opacity-100' : 'opacity-60'}`}>设置</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default App;
