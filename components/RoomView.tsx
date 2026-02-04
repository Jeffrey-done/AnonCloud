
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { Send, LogIn, PlusCircle, Clock, Info, Copy, CheckCircle2, Image as ImageIcon, Film, Smile } from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '🤔', '😎', '🙄', '🔥', '✨', '👍', '🙏', '❤️', '🎉', '👋', '👀', '🌚', '🤡'];

const RoomView: React.FC<{ apiBase: string }> = ({ apiBase }) => {
  const [roomCode, setRoomCode] = useState<string>(() => localStorage.getItem('anon_last_room_input') || '');
  const [activeRoom, setActiveRoom] = useState<string>(() => localStorage.getItem('anon_active_room') || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('anon_active_room', activeRoom);
    localStorage.setItem('anon_last_room_input', roomCode);
  }, [activeRoom, roomCode]);

  useEffect(() => {
    let interval: any;
    if (activeRoom) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [activeRoom, apiBase]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchMessages = async () => {
    const res = await request<Message[]>(apiBase, `/api/get-msg?roomCode=${activeRoom}`);
    if (res.code === 200 && res.data) setMessages(res.data);
    else if (res.code === 404) setActiveRoom('');
  };

  const sendMessage = async (content?: string, type: MessageType = 'text') => {
    const payload = content !== undefined ? content : inputMsg;
    if (!payload.trim() || !activeRoom) return;
    
    const res = await request<any>(apiBase, '/api/send-msg', 'POST', { 
      roomCode: activeRoom, 
      msg: payload, 
      type 
    });
    
    if (res.code === 200) {
      if (content === undefined) setInputMsg('');
      fetchMessages();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('文件请限制在 2MB 以内');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const type: MessageType = file.type.startsWith('video') ? 'video' : 'image';
      await sendMessage(base64, type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderMessageContent = (m: Message) => {
    const isImage = m.type === 'image' || m.content.startsWith('data:image/');
    const isVideo = m.type === 'video' || m.content.startsWith('data:video/');

    if (isImage) {
      return (
        <img 
          src={m.content} 
          className="rounded-lg max-w-[240px] max-h-[320px] object-cover shadow-sm block cursor-zoom-in hover:opacity-95 transition-opacity" 
          alt="image" 
          onClick={() => window.open(m.content)} 
        />
      );
    }
    if (isVideo) {
      return (
        <video 
          src={m.content} 
          controls 
          className="rounded-lg max-w-[240px] max-h-[320px] shadow-sm block" 
        />
      );
    }
    return <p className="text-slate-800 text-sm leading-relaxed break-all whitespace-pre-wrap">{m.content}</p>;
  };

  if (activeRoom) {
    return (
      <div className="flex flex-col h-[calc(100vh-13rem)] relative">
        <div className="bg-white p-3 rounded-t-xl border border-slate-200 flex items-center justify-between shadow-sm">
          <button onClick={() => { navigator.clipboard.writeText(activeRoom); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                  className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <span className="text-xs font-mono font-bold text-blue-600">{activeRoom}</span>
            {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} className="text-slate-400" />}
          </button>
          <button onClick={() => setActiveRoom('')} className="text-xs text-slate-400 hover:text-red-500 font-bold uppercase">离开</button>
        </div>

        <div ref={scrollRef} className="flex-1 bg-white border-x border-slate-100 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-50 rounded-2xl rounded-tl-none px-3.5 py-2.5 border border-slate-100 shadow-sm max-w-[90%] overflow-hidden">
                {renderMessageContent(m)}
              </div>
              <span className="text-[10px] font-medium text-slate-400 mt-1 ml-1">{m.time}</span>
            </div>
          ))}
        </div>

        {showEmoji && (
          <div className="absolute bottom-20 left-4 right-4 bg-white border border-slate-200 p-2 rounded-2xl shadow-2xl z-50 grid grid-cols-8 gap-1 animate-in slide-in-from-bottom-4">
            {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(prev => prev + e); setShowEmoji(false); }} className="text-2xl p-1 hover:bg-slate-100 rounded-lg">{e}</button>)}
          </div>
        )}

        <div className="bg-white p-3 rounded-b-xl border border-slate-200 shadow-inner space-y-2">
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowEmoji(!showEmoji)} className={`p-2 rounded-full transition-colors ${showEmoji ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}><Smile size={20} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><ImageIcon size={20} /></button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
            
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="发送消息..."
              className="flex-1 bg-slate-50 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button onClick={() => sendMessage()} className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 shadow-md active:scale-90"><Send size={18} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-center">
         <div className="mx-auto bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center text-blue-600 mb-2"><PlusCircle size={32} /></div>
         <h2 className="text-xl font-bold">创建房间</h2>
         <button onClick={async () => { setLoading(true); const res = await request<any>(apiBase, '/api/create-room'); if (res.code === 200) setActiveRoom(res.roomCode!); setLoading(false); }}
                 disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">
           {loading ? '创建中...' : '开始新聊天'}
         </button>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex space-x-2">
         <input type="text" value={roomCode} onChange={e => setRoomCode(e.target.value)} placeholder="输入代码进入" className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 font-mono font-bold tracking-widest outline-none" />
         <button onClick={() => setActiveRoom(roomCode.trim().toUpperCase())} className="bg-slate-800 text-white px-8 rounded-xl font-bold">进入</button>
      </div>
    </div>
  );
};

export default RoomView;
