
import React, { useState, useEffect, useRef } from 'react';
import { Message, ApiResponse } from '../types';
import { request } from '../services/api';
import { Send, LogIn, PlusCircle, Clock, Info } from 'lucide-react';

interface RoomViewProps {
  apiBase: string;
}

const RoomView: React.FC<RoomViewProps> = ({ apiBase }) => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [activeRoom, setActiveRoom] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for messages
  useEffect(() => {
    let interval: any;
    if (activeRoom) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [activeRoom]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const res = await request<Message[]>(apiBase, `/api/get-msg?roomCode=${activeRoom}`);
    if (res.code === 200 && res.data) {
      setMessages(res.data);
    }
  };

  const createRoom = async () => {
    setLoading(true);
    const res = await request<any>(apiBase, '/api/create-room');
    if (res.code === 200 && res.roomCode) {
      setActiveRoom(res.roomCode);
      setRoomCode(res.roomCode);
    } else {
      alert(res.msg || '创建房间失败');
    }
    setLoading(false);
  };

  const enterRoom = () => {
    if (!roomCode.trim()) return alert('请输入房间码');
    setActiveRoom(roomCode.trim());
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!inputMsg.trim() || !activeRoom) return;
    const res = await request<any>(apiBase, '/api/send-msg', 'POST', {
      roomCode: activeRoom,
      msg: inputMsg,
    });
    if (res.code === 200) {
      setInputMsg('');
      fetchMessages();
    } else {
      alert(res.msg || '发送失败');
    }
  };

  if (activeRoom) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="bg-white p-3 rounded-t-xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <h3 className="font-semibold text-slate-700">房间: {activeRoom}</h3>
          </div>
          <button 
            onClick={() => setActiveRoom('')} 
            className="text-xs text-slate-400 hover:text-slate-600 font-medium"
          >
            退出房间
          </button>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 bg-white border-x border-slate-200 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <Clock size={32} strokeWidth={1.5} />
              <p className="text-sm">暂无消息，等待成员加入...</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="flex flex-col items-start max-w-[90%]">
                <div className="bg-slate-100 rounded-2xl rounded-tl-none p-3 shadow-sm">
                  <p className="text-slate-800 text-sm whitespace-pre-wrap">{m.content}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 ml-1">{m.time}</span>
              </div>
            ))
          )}
        </div>

        <div className="bg-white p-3 rounded-b-xl border border-slate-200 flex items-center space-x-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="输入消息..."
            className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors shadow-md active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-blue-600">
          <PlusCircle size={20} />
          <h2 className="text-lg font-bold">创建房间</h2>
        </div>
        <p className="text-sm text-slate-500">生成一个唯一的6位代码，任何人凭此代码皆可加入聊天。</p>
        <button
          onClick={createRoom}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {loading ? '创建中...' : <><PlusCircle size={18}/><span>立即创建</span></>}
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-slate-50 px-2 text-slate-400">或者</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-700">
          <LogIn size={20} />
          <h2 className="text-lg font-bold">进入房间</h2>
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="输入6位房间码"
            className="flex-1 bg-slate-100 border-slate-200 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase"
          />
          <button
            onClick={enterRoom}
            className="bg-slate-800 text-white px-6 rounded-xl font-semibold hover:bg-slate-900 transition-all"
          >
            进入
          </button>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex space-x-3">
        <Info className="text-blue-500 shrink-0" size={20} />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-semibold">关于匿名机制：</p>
          <ul className="list-disc list-inside space-y-0.5 opacity-80">
            <li>房间将在 24 小时后自动销毁</li>
            <li>聊天记录仅保留 12 小时</li>
            <li>无需登录，退出后无法通过原路径找回，请保存好房间码</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoomView;
