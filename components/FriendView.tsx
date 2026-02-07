
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { Send, UserPlus, Fingerprint, Lock, Copy, CheckCircle2, Check, Image as ImageIcon, Smile, X, Maximize2, Loader2, ShieldCheck, Link2, WifiOff, Clock } from 'lucide-react';

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
  const [isSyncing, setIsSyncing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollDelayRef = useRef<number>(3500);

  useEffect(() => {
    localStorage.setItem('anon_my_friend_code', myCode);
    localStorage.setItem('anon_target_friend_code', targetCode);
    localStorage.setItem('anon_friend_paired', String(isPaired));
  }, [myCode, targetCode, isPaired]);

  const fetchMessages = useCallback(async () => {
    if (!isPaired || !myCode || !targetCode) return;
    setIsSyncing(true);
    const res = await request<Message[]>(apiBase, `/api/get-friend-msg?myCode=${myCode}&targetCode=${targetCode}`);
    setIsSyncing(false);
    
    if (res.code === 200 && res.data) {
      setMessages(res.data);
      pollDelayRef.current = 3500;
    } else {
      pollDelayRef.current = Math.min(pollDelayRef.current + 3000, 15000);
    }
  }, [isPaired, myCode, targetCode, apiBase]);

  useEffect(() => {
    let timer: any;
    let isActive = true;

    const runPoll = async () => {
      if (!isActive || !isPaired) return;
      await fetchMessages();
      if (isActive) {
        timer = setTimeout(runPoll, pollDelayRef.current);
      }
    };

    if (isPaired) runPoll();
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [isPaired, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

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
      await sendMessage(ev.target?.result as string, file.type.startsWith('video') ? 'video' : 'image');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (isPaired) {
    return (
      <div className="flex flex-col h-full bg-[#FDFDFD]">
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="preview" />
          </div>
        )}

        {/* Friend Header */}
        <div className="flex-shrink-0 px-5 py-3 bg-white/50 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center space-x-3 px-3 py-1.5 bg-white rounded-xl border border-slate-200/50 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="font-black text-slate-800 text-[10px] tracking-widest uppercase font-mono">{targetCode}</span>
          </div>
          <button onClick={() => { if(confirm('终止本次私密连接？')) setIsPaired(false); }} className="p-2 text-slate-400 hover:text-red-500">
            <X size={18} />
          </button>
        </div>

        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
          {messages.map((m) => {
            const isMe = m.sender === myCode;
            const isMedia = isDataUrl(m.content);
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-300`}>
                <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${isMedia ? 'bg-transparent shadow-none px-0' : (isMe ? 'bg-slate-900 rounded-tr-none text-white' : 'bg-white border border-slate-200/80 rounded-tl-none text-slate-800')} max-w-[85%]`}>
                  {m.type === 'image' ? <img src={m.content} className="rounded-xl max-h-[300px] object-cover" onClick={() => setPreviewImage(m.content)} /> :
                   <p className="text-[14px] leading-relaxed break-all whitespace-pre-wrap font-medium">{m.content}</p>}
                </div>
                <div className={`flex items-center mt-1.5 space-x-2 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <span className="text-[8px] font-black text-slate-300 uppercase">{m.time}</span>
                  {isMe && (m.read ? <Check size={10} className="text-emerald-500" strokeWidth={3}/> : <Check size={10} className="text-slate-200" strokeWidth={3}/>)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 px-4 pb-32 pt-4">
          <div className="relative flex items-center p-1.5 rounded-[24px] border bg-slate-900 border-slate-800 shadow-xl">
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-3 text-white/40 hover:text-white"><Smile size={20} /></button>
              <input 
                type="text" value={inputMsg} onChange={e => setInputMsg(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                placeholder="私密加密通道..." 
                className="flex-1 bg-transparent px-2 py-3 text-sm font-medium outline-none text-white placeholder:text-white/20" 
              />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-white/40"><ImageIcon size={18} /></button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              <button onClick={() => sendMessage()} className="p-3 rounded-xl bg-blue-600 text-white shadow-lg active:scale-90">
                <Send size={18} />
              </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 pt-8 pb-32 space-y-8 bg-[#F8FAFC]">
      {/* ... (身份生成部分与之前保持一致) */}
      <div className="bg-white p-8 rounded-[48px] border border-slate-200/60 shadow-xl space-y-6">
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
          <Fingerprint className="text-blue-600" size={24} />
          <span>身份节点</span>
        </h2>
        {myCode ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center group relative">
            <span className="text-xl font-black font-mono tracking-widest text-slate-800 uppercase">{myCode}</span>
            <button 
              onClick={() => { navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
              className="absolute -right-2 -bottom-2 p-3 bg-slate-900 text-white rounded-2xl shadow-lg active:scale-90 transition-all"
            >
              {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
            </button>
          </div>
        ) : (
          <button 
            onClick={async () => { setLoading(true); const res = await request<any>(apiBase, '/api/create-friend-code'); setLoading(false); if (res.code === 200) setMyCode(res.friendCode!); }} 
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95"
          >
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : '激活身份节点'}
          </button>
        )}
      </div>

      <div className="bg-white p-8 rounded-[48px] border border-slate-200/60 shadow-xl space-y-6">
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
          <Link2 className="text-blue-500" size={24} />
          <span>配对同步</span>
        </h2>
        <div className="space-y-4">
          <input type="text" value={myCode} onChange={e => setMyCode(e.target.value.toUpperCase())} placeholder="我的 ID" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black font-mono text-xs outline-none" />
          <input type="text" value={targetCode} onChange={e => setTargetCode(e.target.value.toUpperCase())} placeholder="对方 ID" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black font-mono text-xs outline-none" />
          <button 
            onClick={async () => { 
              if(!myCode || !targetCode) return;
              setLoading(true);
              const res = await request<any>(apiBase, '/api/add-friend', 'POST', { myCode, targetCode }); 
              setLoading(false);
              if (res.code === 200) setIsPaired(true); 
              else alert(res.msg || '节点同步失败');
            }} 
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95"
          >
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : '建立私密隧道'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendView;
