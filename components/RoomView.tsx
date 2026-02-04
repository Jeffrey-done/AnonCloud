
import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { request } from '../services/api';
import { Send, LogIn, PlusCircle, Clock, Info, Copy, CheckCircle2 } from 'lucide-react';

interface RoomViewProps {
  apiBase: string;
}

const RoomView: React.FC<RoomViewProps> = ({ apiBase }) => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [activeRoom, setActiveRoom] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: any;
    if (activeRoom) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [activeRoom, apiBase]);

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
      alert(res.msg || '无法连接后端，请检查设置中的 Worker 地址');
    }
    setLoading(false);
  };

  const enterRoom = () => {
    const code = roomCode.trim().toUpperCase();
    if (!code) return alert('请输入房间码');
    setActiveRoom(code);
    setMessages([]);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(activeRoom || roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    }
  };

  if (activeRoom) {
    return (
      <div className="flex flex-col h-[calc(100vh-13rem)]">
        <div className="bg-white p-3 rounded-t-xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <button onClick={copyRoomCode} className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 active:scale-95 transition-all">
              <span className="text-xs font-mono font-bold text-blue-600">{activeRoom}</span>
              {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} className="text-slate-400" />}
            </button>
          </div>
          <button 
            onClick={() => setActiveRoom('')} 
            className="text-xs text-slate-400 hover:text-red-500 font-bold uppercase transition-colors"
          >
            Leave
          </button>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 bg-white border-x border-slate-100 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-3 opacity-60">
              <Clock size={40} strokeWidth={1} />
              <p className="text-xs font-medium tracking-widest uppercase">Waiting for messages...</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-slate-50 rounded-2xl rounded-tl-none px-3.5 py-2.5 border border-slate-100 shadow-sm max-w-[90%]">
                  <p className="text-slate-800 text-sm leading-relaxed">{m.content}</p>
                </div>
                <span className="text-[10px] font-medium text-slate-400 mt-1 ml-1">{m.time}</span>
              </div>
            ))
          )}
        </div>

        <div className="bg-white p-3 rounded-b-xl border border-slate-200 flex items-center space-x-2 shadow-inner">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="说点什么..."
            className="flex-1 bg-slate-50 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 transition-all shadow-md active:scale-90"
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-600">
            <PlusCircle size={20} />
            <h2 className="text-lg font-bold tracking-tight">匿名房间</h2>
          </div>
          <Info size={16} className="text-slate-300" />
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          创建一个多人匿名聊天室。所有进入该房间的用户都可以实时交流。24小时后自动销毁。
        </p>
        <button
          onClick={createRoom}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-[0.98]"
        >
          {loading ? '连接中...' : <><PlusCircle size={18}/><span>创建新房间</span></>}
        </button>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
        <div className="relative flex justify-center"><span className="bg-slate-50 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">OR JOIN BY CODE</span></div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-700">
          <LogIn size={20} />
          <h2 className="text-lg font-bold tracking-tight">加入房间</h2>
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="6位代码"
            maxLength={6}
            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
          />
          <button
            onClick={enterRoom}
            className="bg-slate-800 text-white px-8 rounded-xl font-bold hover:bg-slate-900 transition-all active:scale-[0.98]"
          >
            进入
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomView;
