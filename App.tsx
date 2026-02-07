
import React, { useState, useEffect } from 'react';
import { TabType } from './types';
import RoomView from './components/RoomView';
import FriendView from './components/FriendView';
import SettingsView from './components/SettingsView';
import { MessageSquare, Users, Settings, Shield, AlertCircle, WifiOff, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.ROOM);
  
  // 核心改进：默认不写死任何外部域名
  // 只要你能打开这个网页，我们就直接请求当前域名的 /api
  const getAutoApi = () => {
    if (typeof window !== 'undefined') {
      // 返回当前域名的 origin，例如 https://xxx.pages.dev
      return window.location.origin;
    }
    return '';
  };

  const DEFAULT_API = getAutoApi();

  const [apiBase, setApiBase] = useState<string>(() => {
    const stored = localStorage.getItem('anon_chat_api_base');
    // 如果存储的是旧的外部 API，或者没有存储，则强制使用当前域名 API
    if (!stored || stored.includes('64209310.xyz')) {
      return DEFAULT_API;
    }
    return stored;
  });

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    localStorage.setItem('anon_chat_api_base', apiBase);
    
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        // 使用同源心跳检测
        const res = await fetch(`${apiBase.replace(/\/+$/, '')}/api/get-msg?roomCode=PING`, { 
          signal: controller.signal,
          mode: apiBase === window.location.origin ? 'same-origin' : 'cors',
          cache: 'no-cache'
        });
        clearTimeout(id);
        setIsOnline(res.ok);
      } catch (e) {
        setIsOnline(false);
      }
    };
    
    checkConnection();
    const timer = setInterval(checkConnection, 10000);
    return () => clearInterval(timer);
  }, [apiBase]);

  const isLocalNode = apiBase === window.location.origin;

  return (
    <div className="h-[100dvh] flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex-shrink-0 z-50">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-xl text-white shadow-lg shadow-blue-200/50">
              <Shield size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">AnonCloud</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 block">Privacy Protocol</span>
            </div>
          </div>
          
          <div className="flex items-center">
            {isOnline ? (
              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border shadow-sm transition-all ${
                isLocalNode ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'
              }`}>
                <Zap size={12} className={isLocalNode ? 'fill-blue-500' : 'fill-emerald-500'} />
                <span>{isLocalNode ? 'DIRECT TUNNEL' : 'EXTERNAL NODE'}</span>
              </div>
            ) : (
              <button 
                onClick={() => setActiveTab(TabType.SETTINGS)}
                className="flex items-center space-x-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-[10px] font-black border border-red-100 animate-pulse"
              >
                <AlertCircle size={12} />
                <span>LINK BLOCKED</span>
              </button>
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
              <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${activeTab === TabType.ROOM ? 'opacity-100' : 'opacity-60'}`}>Chat</span>
            </button>
            
            <button
              onClick={() => setActiveTab(TabType.FRIEND)}
              className={`flex flex-col items-center justify-center flex-1 py-3 rounded-2xl transition-all duration-300 ${
                activeTab === TabType.FRIEND ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users size={20} strokeWidth={activeTab === TabType.FRIEND ? 2.5 : 2} />
              <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${activeTab === TabType.FRIEND ? 'opacity-100' : 'opacity-60'}`}>Private</span>
            </button>
            
            <button
              onClick={() => setActiveTab(TabType.SETTINGS)}
              className={`flex flex-col items-center justify-center flex-1 py-3 rounded-2xl transition-all duration-300 ${
                activeTab === TabType.SETTINGS ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings size={20} strokeWidth={activeTab === TabType.SETTINGS ? 2.5 : 2} />
              <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${activeTab === TabType.SETTINGS ? 'opacity-100' : 'opacity-60'}`}>Vault</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default App;
