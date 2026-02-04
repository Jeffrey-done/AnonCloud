
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { Send, PlusCircle, Copy, CheckCircle2, Image as ImageIcon, Smile, MoreVertical, Trash2, EyeOff, Flame } from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '🤔', '😎', '🙄', '🔥', '✨', '👍', '🙏', '❤️', '🎉', '👋', '👀', '🌚', '🤡'];

const RoomView: React.FC<{ apiBase: string }> = ({ apiBase }) => {
  const [roomCode, setRoomCode] = useState<string>(() => localStorage.getItem('anon_last_room_input') || '');
  const [activeRoom, setActiveRoom] = useState<string>(() => localStorage.getItem('anon_active_room') || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isBurnMode, setIsBurnMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  
  const [localDeletedIds, setLocalDeletedIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem(`anon_deleted_room_${activeRoom}`) || '[]');
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('anon_active_room', activeRoom);
    localStorage.setItem('anon_last_room_input', roomCode);
    setLocalDeletedIds(JSON.parse(localStorage.getItem(`anon_deleted_room_${activeRoom}`) || '[]'));
  }, [activeRoom, roomCode]);

  useEffect(() => {
    localStorage.setItem(`anon_deleted_room_${activeRoom}`, JSON.stringify(localDeletedIds));
  }, [localDeletedIds, activeRoom]);

  useEffect(() => {
    let interval: any;
    if (activeRoom) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3500);
    }
    return () => clearInterval(interval);
  }, [activeRoom, apiBase]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchMessages = async () => {
    const res = await request<Message[]>(apiBase, `/api/get-msg?roomCode=${activeRoom}`);
    if (res.code === 200 && res.data) {
      setMessages(res.data);
    } else if (res.code === 404) {
      setActiveRoom('');
    }
  };

  const sendMessage = async (content?: string, type: MessageType = 'text') => {
    const payload = content !== undefined ? content : inputMsg;
    if (!payload.trim() || !activeRoom) return;
    
    const res = await request<any>(apiBase, '/api/send-msg', 'POST', { 
      roomCode: activeRoom, 
      msg: payload, 
      type,
      isBurn: isBurnMode
    });
    
    if (res.code === 200) {
      if (content === undefined) setInputMsg('');
      setIsBurnMode(false);
      fetchMessages();
    }
  };

  const deleteForEveryone = async (msgId: string) => {
    const res = await request<any>(apiBase, '/api/delete-room-msg', 'POST', { roomCode: activeRoom, messageId: msgId });
    if (res.code === 200) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setMenuMsgId(null);
    }
  };

  const deleteForMe = (msgId: string) => {
    setLocalDeletedIds(prev => [...prev, msgId]);
    setMenuMsgId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('文件请限制在 2MB 内');

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
    const content = (m.content || '').trim();
    const isImage = m.type === 'image' || content.startsWith('data:image/');
    const isVideo = m.type === 'video' || content.startsWith('data:video/');

    if (isImage) {
      return (
        <img 
          src={content} 
          className="rounded-xl max-w-[min(100%,260px)] max-h-[300px] object-contain shadow-md" 
          alt="image" 
          onClick={() => window.open(content)} 
        />
      );
    }
    if (isVideo) {
      return (
        <video src={content} controls className="rounded-xl max-w-[min(100%,260px)] max-h-[300px] shadow-md" />
      );
    }
    return <p className="text-slate-800 text-sm leading-relaxed break-all whitespace-pre-wrap">{m.content}</p>;
  };

  if (activeRoom) {
    const filteredMessages = messages.filter(m => !localDeletedIds.includes(m.id));

    return (
      <div className="flex flex-col h-[calc(100vh-13rem)] relative animate-in fade-in duration-300">
        <div className="bg-white p-3 rounded-t-xl border border-slate-200 flex items-center justify-between shadow-sm">
          <button onClick={() => { navigator.clipboard.writeText(activeRoom); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                  className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <span className="text-xs font-mono font-bold text-blue-600">{activeRoom}</span>
            {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} className="text-slate-400" />}
          </button>
          <button onClick={() => setActiveRoom('')} className="text-xs text-slate-400 hover:text-red-500 font-bold uppercase tracking-widest">离开</button>
        </div>

        <div ref={scrollRef} className="flex-1 bg-white border-x border-slate-100 overflow-y-auto p-4 space-y-4" onClick={() => setMenuMsgId(null)}>
          {filteredMessages.length === 0 && <div className="text-center py-20 text-slate-300 text-sm">暂无可见消息</div>}
          {filteredMessages.map((m, i) => (
            <div key={m.id} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300 relative group">
              <div className="flex items-end space-x-1 max-w-[95%]">
                <div className={`rounded-2xl rounded-tl-none px-3 py-2 border shadow-sm overflow-hidden ${m.isBurn ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                  {m.isBurn && (
                    <div className="flex items-center space-x-1 mb-1 text-[10px] font-bold text-orange-600 uppercase tracking-tighter">
                      <Flame size={10} fill="currentColor" />
                      <span>阅后即焚消息</span>
                    </div>
                  )}
                  {renderMessageContent(m)}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setMenuMsgId(menuMsgId === m.id ? null : m.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 transition-opacity"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-400 mt-1 ml-1">{m.time}</span>

              {menuMsgId === m.id && (
                <div className="absolute left-0 bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 flex flex-col p-1 animate-in zoom-in-95 duration-200">
                  <button onClick={() => deleteForMe(m.id)} className="flex items-center space-x-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg">
                    <EyeOff size={14} /> <span>仅对自己隐藏</span>
                  </button>
                  <button onClick={() => deleteForEveryone(m.id)} className="flex items-center space-x-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} /> <span>对所有人删除</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {showEmoji && (
          <div className="absolute bottom-24 left-4 right-4 bg-white border border-slate-200 p-2 rounded-2xl shadow-2xl z-50 grid grid-cols-8 gap-1 animate-in slide-in-from-bottom-4">
            {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(prev => prev + e); setShowEmoji(false); }} className="text-2xl p-1 hover:bg-slate-100 rounded-lg">{e}</button>)}
          </div>
        )}

        <div className="bg-white p-3 rounded-b-xl border border-slate-200 shadow-inner space-y-2">
          {isBurnMode && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-lg border border-orange-100 animate-in slide-in-from-bottom-2">
              <Flame size={14} fill="currentColor" />
              <span className="text-[10px] font-bold uppercase tracking-wider">阅后即焚模式已开启</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowEmoji(!showEmoji)} className={`p-2 rounded-full transition-colors ${showEmoji ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}><Smile size={20} /></button>
            <button onClick={() => setIsBurnMode(!isBurnMode)} className={`p-2 rounded-full transition-colors ${isBurnMode ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:bg-slate-100'}`}><Flame size={20} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><ImageIcon size={20} /></button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
            
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={isBurnMode ? "发送即消失的消息..." : "发送消息..."}
              className={`flex-1 border-none rounded-full px-4 py-2 text-sm focus:ring-2 outline-none transition-all ${isBurnMode ? 'bg-orange-50 focus:ring-orange-300' : 'bg-slate-50 focus:ring-blue-500'}`}
            />
            <button onClick={() => sendMessage()} className={`text-white p-2.5 rounded-full shadow-md active:scale-90 transition-colors ${isBurnMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <Send size={18} />
            </button>
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
                 disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100 active:scale-95 transition-transform">
           {loading ? '创建中...' : '开始新聊天'}
         </button>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex space-x-2">
         <input type="text" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="输入代码进入" className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 font-mono font-bold tracking-widest outline-none uppercase" />
         <button onClick={() => setActiveRoom(roomCode.trim().toUpperCase())} className="bg-slate-800 text-white px-8 rounded-xl font-bold active:scale-95 transition-transform">进入</button>
      </div>
    </div>
  );
};

export default RoomView;
