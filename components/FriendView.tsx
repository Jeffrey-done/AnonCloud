
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { Send, UserPlus, Fingerprint, Lock, Copy, CheckCircle2, Check, Image as ImageIcon, Smile, X, Maximize2, Loader2, ShieldCheck, Link2 } from 'lucide-react';

const EMOJIS = ['❤️', '✨', '🔥', '😂', '😭', '💀', '💯', '👌', '👀', '🤫', '🌹', '⚡'];

const isDataUrl = (text: string) => text.startsWith('data:');

const FriendView: React.FC<{ apiBase: string }> = ({ apiBase }) => {
  const [myCode, setMyCode] = useState<string>(() => localStorage.getItem('anon_my_friend_code') || '');
  const [targetCode, setTargetCode] = useState<string>(() => localStorage.getItem('anon_target_friend_code') || '');
  const [isPaired, setIsPaired] = useState<boolean>(() => localStorage.getItem('anon_friend_paired') === 'true');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const renderMessageContent = (m: Message) => {
    const content = m.content;
    const isMedia = isDataUrl(content);

    if (m.type === 'image' || (isMedia && content.includes('image/'))) {
      return (
        <img 
          src={content} 
          className="rounded-2xl max-w-full max-h-[300px] object-cover cursor-zoom-in" 
          onClick={() => setPreviewImage(content)} 
          alt="encrypted media"
        />
      );
    }

    if (m.type === 'video' || (isMedia && content.includes('video/'))) {
      return (
        <div className="rounded-2xl overflow-hidden bg-black/5 shadow-inner">
          <video src={content} controls className="max-w-full max-h-[300px] block" />
        </div>
      );
    }

    return <p className={`text-[15px] leading-relaxed break-all whitespace-pre-wrap font-medium`}>{content}</p>;
  };

  if (isPaired) {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500 bg-[#FDFDFD]">
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="preview" />
          </div>
        )}

        {/* Friend Header */}
        <div className="flex-shrink-0 px-5 py-4 bg-white/50 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center space-x-3 px-4 py-2 bg-white rounded-2xl border border-slate-200/50 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse" />
            <span className="font-black text-slate-800 text-xs tracking-widest uppercase font-mono">{targetCode}</span>
          </div>
          <button onClick={() => { if(confirm('Terminate this private link?')) setIsPaired(false); }} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-xl border border-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-8 space-y-6 scroll-smooth" onClick={() => setShowEmoji(false)}>
          {messages.map((m) => {
            const isMe = m.sender === myCode;
            const isMedia = isDataUrl(m.content);
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-300`}>
                <div className={`relative px-5 py-3.5 rounded-[28px] shadow-sm ${isMedia ? 'bg-transparent shadow-none px-0' : (isMe ? 'bg-slate-900 rounded-tr-none text-white' : 'bg-white border border-slate-200/80 rounded-tl-none text-slate-800')} max-w-[85%]`}>
                  {renderMessageContent(m)}
                </div>
                <div className={`flex items-center mt-2 space-x-1.5 px-1 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{m.time}</span>
                  {isMe && (m.read 
                    ? <Check size={12} className="text-emerald-500" strokeWidth={3}/> 
                    : <Check size={12} className="text-slate-200" strokeWidth={3}/>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 px-4 pb-32 pt-4">
          {showEmoji && (
            <div className="absolute bottom-[240px] left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200 p-4 rounded-[32px] shadow-2xl z-50 grid grid-cols-6 gap-3">
              {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(p => p + e); setShowEmoji(false); }} className="text-2xl p-3 hover:bg-slate-50 rounded-2xl transition-transform active:scale-90">{e}</button>)}
            </div>
          )}

          <div className="relative flex flex-col p-2 rounded-[32px] border bg-slate-900 border-slate-800 shadow-2xl">
            <div className="flex items-center">
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-3.5 flex-shrink-0 text-white/40 hover:text-white transition-colors"><Smile size={24} /></button>
              <input 
                type="text" 
                value={inputMsg} 
                onChange={e => setInputMsg(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                placeholder="Private tunnel..." 
                className="flex-1 min-w-0 bg-transparent px-2 py-4 text-[15px] font-medium outline-none text-white placeholder:text-white/20" 
              />
              <div className="flex items-center space-x-1 flex-shrink-0 pr-1">
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-white/40 hover:text-white"><ImageIcon size={22} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                <button onClick={() => sendMessage()} className="p-4 rounded-2xl bg-blue-600 text-white transition-all active:scale-90 shadow-xl shadow-blue-900/40">
                  <Send size={22} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 pt-8 pb-32 space-y-8 bg-[#F8FAFC]">
      <div className="bg-white p-10 rounded-[56px] border border-slate-200/60 shadow-2xl space-y-8 animate-in slide-in-from-top-6 duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
              <Fingerprint className="text-blue-600" size={28} />
              <span>Identity Node</span>
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">Global Ephemeral Identifier</p>
          </div>
          {myCode && <ShieldCheck className="text-emerald-500" size={24} />}
        </div>

        {myCode ? (
          <div className="group relative">
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] px-6 py-8 text-center transition-all group-hover:border-blue-200">
              <span className="text-2xl font-black font-mono tracking-[0.3em] text-slate-800 uppercase">{myCode}</span>
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
              className="absolute -right-3 -bottom-3 p-4 bg-slate-900 text-white rounded-[24px] shadow-2xl active:scale-90 transition-all"
            >
              {copied ? <CheckCircle2 size={24} className="text-emerald-400" /> : <Copy size={24} />}
            </button>
          </div>
        ) : (
          <button 
            onClick={async () => { setLoading(true); const res = await request<any>(apiBase, '/api/create-friend-code'); setLoading(false); if (res.code === 200) setMyCode(res.friendCode!); }} 
            className="w-full bg-slate-900 text-white py-5 rounded-[28px] font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-3"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><Fingerprint size={18}/><span>Generate Identity</span></>}
          </button>
        )}
      </div>

      <div className="bg-white p-10 rounded-[56px] border border-slate-200/60 shadow-2xl space-y-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
          <Link2 className="text-blue-500" size={28} />
          <span>Synchronize Pair</span>
        </h2>
        
        <div className="space-y-4">
          <div className="bg-slate-50/50 border border-slate-100 rounded-[28px] px-6 py-5 focus-within:ring-4 ring-blue-50 transition-all flex items-center">
             <div className="pr-4 text-slate-300"><Fingerprint size={20}/></div>
             <input type="text" value={myCode} onChange={e => setMyCode(e.target.value.toUpperCase())} placeholder="MY IDENTITY" className="w-full bg-transparent font-black font-mono text-sm tracking-widest outline-none placeholder:text-slate-200" />
          </div>
          <div className="bg-slate-50/50 border border-slate-100 rounded-[28px] px-6 py-5 focus-within:ring-4 ring-blue-50 transition-all flex items-center">
             <div className="pr-4 text-slate-300"><Lock size={20}/></div>
             <input type="text" value={targetCode} onChange={e => setTargetCode(e.target.value.toUpperCase())} placeholder="TARGET IDENTITY" className="w-full bg-transparent font-black font-mono text-sm tracking-widest outline-none placeholder:text-slate-200" />
          </div>
          <button 
            onClick={async () => { 
              if(!myCode || !targetCode) return;
              setLoading(true);
              const res = await request<any>(apiBase, '/api/add-friend', 'POST', { myCode, targetCode }); 
              setLoading(false);
              if (res.code === 200) setIsPaired(true); 
              else alert(res.msg || 'Pairing failed');
            }} 
            className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center space-x-3"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><UserPlus size={18}/><span>Establish Tunnel</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendView;
