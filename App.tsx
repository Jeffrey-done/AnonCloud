
import React, { useState, useEffect } from 'react';
import { TabType } from './types';
import RoomView from './components/RoomView';
import FriendView from './components/FriendView';
import SettingsView from './components/SettingsView';
import { MessageSquare, Users, Settings, Shield } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.ROOM);
  const [apiBase, setApiBase] = useState<string>(() => {
    return localStorage.getItem('anon_chat_api_base') || 'https://anon-chat-api.your-subdomain.workers.dev';
  });

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
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-wider">
            Cloudflare Native
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 pb-24">
        {activeTab === TabType.ROOM && <RoomView apiBase={apiBase} />}
        {activeTab === TabType.FRIEND && <FriendView apiBase={apiBase} />}
        {activeTab === TabType.SETTINGS && <SettingsView apiBase={apiBase} setApiBase={setApiBase} />}
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
            <span className="text-xs font-medium">房间码</span>
          </button>
          <button
            onClick={() => setActiveTab(TabType.FRIEND)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === TabType.FRIEND ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={20} />
            <span className="text-xs font-medium">私密好友</span>
          </button>
          <button
            onClick={() => setActiveTab(TabType.SETTINGS)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === TabType.SETTINGS ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings size={20} />
            <span className="text-xs font-medium">设置</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
