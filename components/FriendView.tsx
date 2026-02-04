
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { Send, UserPlus, Fingerprint, Lock, Copy, CheckCircle2, Check, Image as ImageIcon, Smile, MoreVertical, Trash2, EyeOff, Flame } from 'lucide-react';

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

  const [localDeletedIds, setLocalDeletedIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem(`anon_deleted_friend_${myCode}_${targetCode}`) || '[]');
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
    const res = await request<any>(apiBase, '/api/delete-friend-msg', 'POST', { myCode, targetCode, messageId: msgId });
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
    if (file.size > 2 * 1024 * 1024) return alert('文件大小限制 2MB');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const type: MessageType = file.type.startsWith('video') ? 'video' : 'image';
      await sendMessage(ev.target?.result as string, type);
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
          className="rounded-xl max-w-[min(100%,240px)] max-h-[300px] object-contain shadow-md" 
          alt="image" 
          onClick={() => window.open(content)} 
        />
      );
    }
    if (isVideo) {
      return (
        <video src={content} controls className="rounded-xl max-w-[min(100%,240px)] max-h-[300px] shadow-md" />
      );
    }
    return <p className="text-sm whitespace-pre-wrap leading-relaxed break-all">{m.content}</p>;
  };

  if (isPaired) {
    const filteredMessages = messages.filter(m => !localDeletedIds.includes(m.id));

    return (
      <div className="flex flex-col h-[calc(100vh-12rem)] relative">
        <div className="bg-white p-3 rounded-t-xl border border-slate-200 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{targetCode}</h3>
          </div>
          <button onClick={() => setIsPaired(false)} className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase tracking-widest">断开</button>
        </div>

        <div ref={scrollRef} className="flex-1 bg-white border-x border-slate-100 overflow-y-auto p-4 space-y-4" onClick={() => setMenuMsgId(null)}>
          {filteredMessages.map((m) => {
            const isMe = m.sender === myCode;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 group relative`}>
                <div className="flex items-center space-x-1 max-w-[90%]">
                  {!isMe && (
                     <button onClick={(e) => { e.stopPropagation(); setMenuMsgId(menuMsgId === m.id ? null : m.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400">
                        <MoreVertical size={14} />
                     </button>
                  )}
                  <div className={`rounded-2xl p-2 shadow-sm border ${isMe ? (isBurnMode && isMe ? 'bg-orange-600 border-orange-500 rounded-tr-none text-white' : 'bg-blue-600 border-blue-500 rounded-tr-none text-white') : (m.isBurn ? 'bg-orange-50 border-orange-200 text-orange-800 rounded-tl-none ring-1 ring-orange-100' : 'bg-slate-50 border-slate-100 rounded-tl-none text-slate-800')} overflow-hidden relative`}>
                    {m.isBurn && (
                      <div className={`flex items-center space-x-1 mb-1 text-[9px] font-bold uppercase ${isMe ? 'text-orange-200' : 'text-orange-600'}`}>
                        <Flame size={10} fill="currentColor" />
                        <span>阅后即焚</span>
                      </div>
                    )}
                    {renderMessageContent(m)}
                  </div>
                  {isMe && (
                     <button onClick={(e) => { e.stopPropagation(); setMenuMsgId(menuMsgId === m.id ? null : m.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400">
                        <MoreVertical size={14} />
                     </button>
                  )}
                </div>

                {menuMsgId === m.id && (
                  <div className={`absolute ${isMe ? 'right-0' : 'left-0'} bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 flex flex-col p-1 animate-in zoom-in-95 duration-200`}>
                    <button onClick={() => deleteForMe(m.id)} className="flex items-center space-x-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg">
                      <EyeOff size={14} /> <span>仅对自己隐藏</span>
                    </button>
                    {isMe && (
                      <button onClick={() => deleteForEveryone(m.id)} className="flex items-center space-x-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} /> <span>对所有人撤回</span>
                      </button>
                    )}
                  </div>
                )}

                <div className={`flex items-center mt-1 space-x-1 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <span className="text-[9px] font-medium text-slate-400">{m.time}</span>
                  {isMe && (m.read ? <div className="flex -space-x-1.5"><Check size={10} className="text-emerald-500" strokeWidth={3}/><Check size={10} className="text-emerald-500" strokeWidth={3}/></div> : <Check size={10} className="text-slate-300" strokeWidth={3}/>)}
                </div>
              </div>
            );
          })}
        </div>

        {showEmoji && (
          <div className="absolute bottom-24 left-4 right-4 bg-white border border-slate-200 p-3 rounded-2xl shadow-2xl z-50 grid grid-cols-6 gap-2">
            {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(p => p + e); setShowEmoji(false); }} className="text-3xl p-1 hover:bg-slate-50 rounded-lg">{e}</button>)}
          </div>
        )}

        <div className="bg-white p-3 rounded-b-xl border border-slate-200 shadow-inner space-y-2">
          {isBurnMode && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-lg border border-orange-100 animate-in slide-in-from-bottom-2">
              <Flame size={14} fill="currentColor" />
              <span className="text-[10px] font-bold uppercase tracking-wider">阅后即焚模式激活</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowEmoji(!showEmoji)} className={`p-2 rounded-full transition-colors ${showEmoji ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}><Smile size={20} /></button>
            <button onClick={() => setIsBurnMode(!isBurnMode)} className={`p-2 rounded-full transition-colors ${isBurnMode ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:bg-slate-100'}`}><Flame size={20} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><ImageIcon size={20} /></button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
            <input type="text" value={inputMsg} onChange={e => setInputMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={isBurnMode ? "私密发送并销毁..." : "私密发送..."} className={`flex-1 rounded-full px-4 py-2 text-sm outline-none transition-all ${isBurnMode ? 'bg-orange-50 focus:ring-2 focus:ring-orange-300' : 'bg-slate-50 focus:ring-2 focus:ring-blue-500'}`} />
            <button onClick={() => sendMessage()} className={`text-white p-2.5 rounded-full shadow-md transition-colors ${isBurnMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}><Send size={18} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold flex items-center space-x-2 text-blue-600"><Fingerprint size={20} /><span>我的匿名码</span></h2>
        {myCode ? (
          <div className="flex space-x-2">
            <div className="flex-1 bg-slate-50 border-dashed border-2 border-slate-200 rounded-xl py-3 text-center font-mono font-bold tracking-widest uppercase">{myCode}</div>
            <button onClick={() => { navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-3 bg-slate-100 rounded-xl active:scale-90 transition-transform">{copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}</button>
          </div>
        ) : (
          <button onClick={async () => { const res = await request<any>(apiBase, '/api/create-friend-code'); if (res.code === 200) setMyCode(res.friendCode!); }} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg shadow-slate-100 active:scale-95 transition-transform">生成编码</button>
        )}
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold flex items-center space-x-2 text-slate-700"><UserPlus size={20} /><span>开启私聊</span></h2>
        <div className="space-y-3">
          <input type="text" value={myCode} onChange={e => setMyCode(e.target.value.toUpperCase())} placeholder="我的编码" className="w-full bg-slate-50 p-3 rounded-xl outline-none uppercase" />
          <input type="text" value={targetCode} onChange={e => setTargetCode(e.target.value.toUpperCase())} placeholder="对方编码" className="w-full bg-slate-50 p-3 rounded-xl outline-none uppercase" />
          <button onClick={async () => { const res = await request<any>(apiBase, '/api/add-friend', 'POST', { myCode, targetCode }); if (res.code === 200) setIsPaired(true); }} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold active:scale-95 transition-transform shadow-lg shadow-blue-50">开启私聊</button>
        </div>
      </div>
    </div>
  );
};

export default FriendView;
