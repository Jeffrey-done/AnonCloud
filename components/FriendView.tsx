
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { Send, UserPlus, Fingerprint, Lock, Copy, CheckCircle2, Check, Image as ImageIcon, Smile, X, Maximize2 } from 'lucide-react';

const EMOJIS = ['❤️', '✨', '🔥', '😂', '😭', '🤡', '💀', '💯', '👌', '👀', '🤫', '🌹'];

const FriendView: React.FC<{ apiBase: string }> = ({ apiBase }) => {
  const [myCode, setMyCode] = useState<string>(() => localStorage.getItem('anon_my_friend_code') || '');
  const [targetCode, setTargetCode] = useState<string>(() => localStorage.getItem('anon_target_friend_code') || '');
  const [isPaired, setIsPaired] = useState<boolean>(() => localStorage.getItem('anon_friend_paired') === 'true');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('anon_my_friend_code', myCode);
    localStorage.setItem('anon_target_friend_code', targetCode);
    localStorage.setItem('anon_friend_paired', String(isPaired));
  }, [myCode, targetCode, isPaired]);

  useEffect(() => {
    let interval: any;
    if (isPaired && myCode && targetCode) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3500);
    }
    return () => clearInterval(interval);
  }, [isPaired, myCode, targetCode]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchMessages = async () => {
    const res = await request<Message[]>(apiBase, `/api/get-friend-msg?myCode=${myCode}&targetCode=${targetCode}`);
    if (res.code === 200 && res.data) setMessages(res.data);
  };

  const sendMessage = async (content?: string, type: MessageType = 'text') => {
    const payload = content !== undefined ? content : inputMsg;
    if (!payload.trim() || !isPaired) return;
    const res = await request<any>(apiBase, '/api/send-friend-msg', 'POST', { 
      myCode, 
      targetCode, 
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
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const type: MessageType = file.type.startsWith('video') ? 'video' : 'image';
      await sendMessage(ev.target?.result as string, type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderMessageContent = (m: Message, isMe: boolean) => {
    const content = (m.content || '').trim();
    const isImageData = content.startsWith('data:image/');
    const isVideoData = content.startsWith('data:video/');

    if (m.type === 'image' || isImageData) {
      return (
        <div className="relative group/media">
          <img src={content} className="rounded-2xl max-w-full max-h-[300px] object-cover cursor-zoom-in shadow-md" alt="media" onClick={() => setPreviewImage(content)} />
          <div className="absolute top-2 right-2 p-1.5 bg-black/20 backdrop-blur-md rounded-lg text-white opacity-0 group-hover/media:opacity-100 transition-opacity pointer-events-none">
            <Maximize2 size={12} />
          </div>
        </div>
      );
    }
    
    if (m.type === 'video' || isVideoData) {
      return <video src={content} controls className="rounded-2xl max-w-full max-h-[300px] shadow-md" />;
    }

    return (
      <div className="max-w-full overflow-hidden">
        <p className={`text-[14px] leading-relaxed break-all whitespace-pre-wrap ${isMe ? 'text-white' : 'text-slate-800'}`}>
          {m.content}
        </p>
      </div>
    );
  };

  if (isPaired) {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="preview" />
          </div>
        )}

        {/* Friend Header */}
        <div className="flex-shrink-0 px-4 py-3 bg-white/40 backdrop-blur-sm border-b border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 px-3 py-1.5 bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse" />
            <span className="font-black text-slate-700 text-xs tracking-widest uppercase">{targetCode}</span>
          </div>
          <button onClick={() => setIsPaired(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth" onClick={() => setShowEmoji(false)}>
          {messages.map((m) => {
            const isMe = m.sender === myCode;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-300`}>
                <div className={`relative px-4 py-3 rounded-[24px] shadow-sm ${isMe ? 'bg-blue-600 rounded-tr-none text-white' : 'bg-white border border-slate-200/80 rounded-tl-none text-slate-800'} max-w-[85%]`}>
                  {renderMessageContent(m, isMe)}
                </div>
                <div className={`flex items-center mt-1 space-x-1 px-1 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <span className="text-[8px] font-black text-slate-300 uppercase">{m.time}</span>
                  {isMe && (m.read 
                    ? <Check size={10} className="text-emerald-500" strokeWidth={3}/> 
                    : <Check size={10} className="text-slate-200" strokeWidth={3}/>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 px-4 pb-32 pt-2">
          {showEmoji && (
            <div className="absolute bottom-[240px] left-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-3xl shadow-2xl z-50 grid grid-cols-6 gap-2">
              {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(p => p + e); setShowEmoji(false); }} className="text-2xl p-2 hover:bg-slate-50 rounded-xl">{e}</button>)}
            </div>
          )}

          <div className="relative flex flex-col p-1.5 rounded-[28px] border bg-slate-900 border-slate-800 shadow-2xl">
            <div className="flex items-center">
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 flex-shrink-0 text-white/50 hover:text-white"><Smile size={20} /></button>
              <input 
                type="text" 
                value={inputMsg} 
                onChange={e => setInputMsg(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                placeholder="Private message..." 
                className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-[14px] font-medium outline-none text-white placeholder:text-white/20" 
              />
              <div className="flex items-center space-x-0.5 flex-shrink-0">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-white/50 hover:text-white"><ImageIcon size={18} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                <button onClick={() => sendMessage()} className="p-2.5 rounded-full bg-blue-600 text-white transition-all active:scale-90 ml-1">
                  <Send size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-6 pb-32 space-y-6">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-xl space-y-8">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Fingerprint className="text-blue-600" size={20} />
            <span>Identity Node</span>
          </h2>
          <p className="text-slate-400 text-[11px] font-bold uppercase mt-1">Global Communication ID</p>
        </div>

        {myCode ? (
          <div className="group relative">
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl px-4 py-6 text-center">
              <span className="text-2xl font-black font-mono tracking-[0.3em] text-slate-800 uppercase">{myCode}</span>
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
              className="absolute -right-2 -bottom-2 p-3.5 bg-slate-900 text-white rounded-[20px] shadow-xl active:scale-90 transition-all"
            >
              {copied ? <CheckCircle2 size={20} className="text-emerald-400" /> : <Copy size={20} />}
            </button>
          </div>
        ) : (
          <button onClick={async () => { const res = await request<any>(apiBase, '/api/create-friend-code'); if (res.code === 200) setMyCode(res.friendCode!); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
            Generate Identity
          </button>
        )}
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-xl space-y-6">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <UserPlus className="text-slate-400" size={20} />
          <span>Sync Pair</span>
        </h2>
        
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-0.5 flex items-center">
             <div className="p-3 text-slate-400"><Fingerprint size={16}/></div>
             <input type="text" value={myCode} onChange={e => setMyCode(e.target.value.toUpperCase())} placeholder="MY CODE" className="w-full bg-transparent py-3 font-black font-mono text-xs tracking-widest outline-none" />
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-0.5 flex items-center">
             <div className="p-3 text-slate-400"><Lock size={16}/></div>
             <input type="text" value={targetCode} onChange={e => setTargetCode(e.target.value.toUpperCase())} placeholder="TARGET CODE" className="w-full bg-transparent py-3 font-black font-mono text-xs tracking-widest outline-none" />
          </div>
          <button onClick={async () => { const res = await request<any>(apiBase, '/api/add-friend', 'POST', { myCode, targetCode }); if (res.code === 200) setIsPaired(true); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100">
            Establish Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendView;
