
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { Send, UserPlus, Fingerprint, Lock, Copy, CheckCircle2, Check, Image as ImageIcon, Smile, MoreVertical, Trash2, EyeOff, Flame, X, Maximize2 } from 'lucide-react';

const EMOJIS = ['❤️', '✨', '🔥', '😂', '😭', '🤡', '💀', '💯', '👌', '👀', '🤫', '🌹'];

const FriendView: React.FC<{ apiBase: string }> = ({ apiBase }) => {
  const [myCode, setMyCode] = useState<string>(() => localStorage.getItem('anon_my_friend_code') || '');
  const [targetCode, setTargetCode] = useState<string>(() => localStorage.getItem('anon_target_friend_code') || '');
  const [isPaired, setIsPaired] = useState<boolean>(() => localStorage.getItem('anon_friend_paired') === 'true');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isBurnMode, setIsBurnMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [localDeletedIds, setLocalDeletedIds] = useState<string[]>(() => {
    const relKey = [myCode, targetCode].sort().join("_");
    return JSON.parse(localStorage.getItem(`anon_deleted_friend_${relKey}`) || '[]');
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('anon_my_friend_code', myCode);
    localStorage.setItem('anon_target_friend_code', targetCode);
    localStorage.setItem('anon_friend_paired', String(isPaired));
    const relKey = [myCode, targetCode].sort().join("_");
    setLocalDeletedIds(JSON.parse(localStorage.getItem(`anon_deleted_friend_${relKey}`) || '[]'));
  }, [myCode, targetCode, isPaired]);

  useEffect(() => {
    const relKey = [myCode, targetCode].sort().join("_");
    if (relKey !== "_") {
      localStorage.setItem(`anon_deleted_friend_${relKey}`, JSON.stringify(localDeletedIds));
    }
  }, [localDeletedIds, myCode, targetCode]);

  // 好友聊天阅后即焚本地自动清理逻辑
  useEffect(() => {
    const burnableMessages = messages.filter(m => m.isBurn && !localDeletedIds.includes(m.id));
    const timers = burnableMessages.map(m => {
      return setTimeout(() => {
        setLocalDeletedIds(prev => [...prev, m.id]);
      }, 15000); 
    });
    return () => timers.forEach(clearTimeout);
  }, [messages, localDeletedIds]);

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
    setLocalDeletedIds(prev => [...prev, msgId]);
    setMenuMsgId(null);
    await request<any>(apiBase, '/api/delete-friend-msg', 'POST', { myCode, targetCode, messageId: msgId });
  };

  const deleteForMe = (msgId: string) => {
    setLocalDeletedIds(prev => [...prev, msgId]);
    setMenuMsgId(null);
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
          <img 
            src={content} 
            className="rounded-2xl max-w-full max-h-[300px] object-cover cursor-zoom-in shadow-md" 
            alt="media" 
            onClick={() => setPreviewImage(content)}
          />
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
    const filteredMessages = messages.filter(m => !localDeletedIds.includes(m.id));

    return (
      <div className="flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl ring-1 ring-white/10" alt="preview" />
            <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
              <X size={24} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between px-2 mb-4">
          <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-200/60">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" />
            <h3 className="font-black text-slate-700 text-xs tracking-[0.15em] uppercase">{targetCode}</h3>
          </div>
          <button onClick={() => setIsPaired(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 space-y-6 pb-4 scroll-smooth" onClick={() => {setMenuMsgId(null); setShowEmoji(false);}}>
          {filteredMessages.map((m) => {
            const isMe = m.sender === myCode;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative animate-in fade-in duration-500 transition-all`}>
                <div className={`flex items-end space-x-2 max-w-[88%] ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`relative px-4 py-3 rounded-[24px] shadow-sm transition-all overflow-hidden ${
                    isMe 
                      ? (m.isBurn ? 'bg-orange-600 rounded-tr-none' : 'bg-blue-600 rounded-tr-none shadow-blue-200/50') 
                      : (m.isBurn ? 'bg-orange-50 border border-orange-200 rounded-tl-none ring-2 ring-orange-500/5' : 'bg-white border border-slate-200/80 rounded-tl-none')
                  }`}>
                    {m.isBurn && (
                      <div className={`flex items-center space-x-1 mb-1.5 opacity-80 ${isMe ? 'text-white/70' : 'text-orange-600'}`}>
                        <Flame size={10} fill="currentColor" />
                        <span className="text-[9px] font-black uppercase tracking-tighter animate-pulse">Self-destructing...</span>
                      </div>
                    )}
                    {renderMessageContent(m, isMe)}
                  </div>
                  
                  <button onClick={(e) => { e.stopPropagation(); setMenuMsgId(menuMsgId === m.id ? null : m.id); }} className="p-1 text-slate-300 hover:text-slate-600 transition-opacity opacity-0 group-hover:opacity-100">
                    <MoreVertical size={14} />
                  </button>

                  {menuMsgId === m.id && (
                    <div className={`absolute ${isMe ? 'right-full mr-2' : 'left-full ml-2'} bottom-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 flex flex-col p-1 animate-in zoom-in-95 duration-200 ring-4 ring-black/5`} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => deleteForMe(m.id)} className="flex items-center space-x-2 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-xl">
                        <EyeOff size={14} /> <span>Hide</span>
                      </button>
                      {isMe && (
                        <button onClick={() => deleteForEveryone(m.id)} className="flex items-center space-x-2 px-3 py-2 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-xl">
                          <Trash2 size={14} /> <span>Recall</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className={`flex items-center mt-1.5 space-x-1.5 ${isMe ? 'flex-row-reverse space-x-reverse' : ''} px-1`}>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{m.time}</span>
                  {isMe && (m.read 
                    ? <div className="flex -space-x-1.5 opacity-60"><Check size={10} className="text-emerald-500" strokeWidth={3}/><Check size={10} className="text-emerald-500" strokeWidth={3}/></div> 
                    : <Check size={10} className="text-slate-200" strokeWidth={3}/>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto px-1 pb-2">
          {showEmoji && (
            <div className="absolute bottom-24 left-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-3xl shadow-2xl z-50 grid grid-cols-6 gap-2">
              {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(p => p + e); setShowEmoji(false); }} className="text-2xl p-2 hover:bg-slate-50 rounded-xl transition-all">{e}</button>)}
            </div>
          )}

          <div className={`relative flex flex-col p-2 rounded-[32px] border transition-all duration-300 ${
            isBurnMode ? 'bg-orange-600 border-orange-400 shadow-xl shadow-orange-200' : 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-900/40'
          }`}>
            <div className="flex items-center">
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 text-white/50 hover:text-white transition-colors"><Smile size={20} /></button>
              <button onClick={() => setIsBurnMode(!isBurnMode)} className={`p-2.5 rounded-full transition-all relative ${isBurnMode ? 'bg-white text-orange-600' : 'text-white/50 hover:text-orange-400'}`}>
                <Flame size={20} fill={isBurnMode ? "currentColor" : "none"} />
              </button>
              
              <input 
                type="text" 
                value={inputMsg} 
                onChange={e => setInputMsg(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                placeholder={isBurnMode ? "Self-destruct message..." : "Private message..."} 
                className={`flex-1 bg-transparent border-none px-3 py-2.5 text-[15px] font-medium focus:ring-0 outline-none transition-colors text-white placeholder:text-white/30`} 
              />
              
              <div className="flex items-center pr-1">
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-white/50 hover:text-white"><ImageIcon size={20} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                <button 
                  onClick={() => sendMessage()} 
                  className={`p-3 rounded-full shadow-lg transition-all active:scale-90 ${isBurnMode ? 'bg-white text-orange-600' : 'bg-blue-600 text-white'}`}
                >
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
    <div className="space-y-6 max-w-md mx-auto">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-xl shadow-slate-200/50 space-y-8">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Fingerprint className="text-blue-600" size={24} />
            <span>Identity Node</span>
          </h2>
          <p className="text-slate-400 text-[12px] font-medium mt-1">Share this code with your contact</p>
        </div>

        {myCode ? (
          <div className="group relative">
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl px-4 py-6 text-center">
              <span className="text-2xl font-black font-mono tracking-[0.4em] text-slate-800 uppercase leading-none">{myCode}</span>
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
              className="absolute -right-3 -bottom-3 p-4 bg-slate-900 text-white rounded-[24px] shadow-xl shadow-slate-900/30 active:scale-90 transition-all"
            >
              {copied ? <CheckCircle2 size={22} className="text-emerald-400" /> : <Copy size={22} />}
            </button>
          </div>
        ) : (
          <button 
            onClick={async () => { const res = await request<any>(apiBase, '/api/create-friend-code'); if (res.code === 200) setMyCode(res.friendCode!); }} 
            className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-[0.98] transition-all"
          >
            Generate Identity
          </button>
        )}
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-xl shadow-slate-200/50 space-y-6">
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <UserPlus className="text-slate-400" size={24} />
          <span>Sync Pair</span>
        </h2>
        
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-1 flex items-center">
             <div className="p-3 text-slate-400"><Fingerprint size={18}/></div>
             <input type="text" value={myCode} onChange={e => setMyCode(e.target.value.toUpperCase())} placeholder="MY CODE" className="w-full bg-transparent py-4 font-black font-mono text-xs tracking-widest outline-none text-slate-800" />
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-1 flex items-center">
             <div className="p-3 text-slate-400"><Lock size={18}/></div>
             <input type="text" value={targetCode} onChange={e => setTargetCode(e.target.value.toUpperCase())} placeholder="TARGET CODE" className="w-full bg-transparent py-4 font-black font-mono text-xs tracking-widest outline-none text-slate-800" />
          </div>
          <button 
            onClick={async () => { const res = await request<any>(apiBase, '/api/add-friend', 'POST', { myCode, targetCode }); if (res.code === 200) setIsPaired(true); }} 
            className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-[0.98] transition-all"
          >
            Establish Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendView;
