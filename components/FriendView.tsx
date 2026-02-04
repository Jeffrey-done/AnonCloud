
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { Send, UserPlus, Fingerprint, Lock, Copy, CheckCircle2, Check, Image as ImageIcon, Smile } from 'lucide-react';

const EMOJIS = ['❤️', '✨', '🔥', '😂', '😭', '🤡', '💀', '💯', '👌', '👀', '🤫', '🌹'];

const FriendView: React.FC<{ apiBase: string }> = ({ apiBase }) => {
  const [myCode, setMyCode] = useState<string>(() => localStorage.getItem('anon_my_friend_code') || '');
  const [targetCode, setTargetCode] = useState<string>(() => localStorage.getItem('anon_target_friend_code') || '');
  const [isPaired, setIsPaired] = useState<boolean>(() => localStorage.getItem('anon_friend_paired') === 'true');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [copied, setCopied] = useState(false);
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
      interval = setInterval(fetchMessages, 3000);
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
    const res = await request<any>(apiBase, '/api/send-friend-msg', 'POST', { myCode, targetCode, msg: payload, type });
    if (res.code === 200) {
      if (content === undefined) setInputMsg('');
      fetchMessages();
    }
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
        <div className="max-w-full overflow-hidden">
          <img 
            src={content} 
            className="rounded-xl max-w-[min(100%,240px)] max-h-[300px] object-contain shadow-md cursor-zoom-in" 
            alt="image" 
            onClick={() => window.open(content)} 
          />
        </div>
      );
    }
    if (isVideo) {
      return (
        <video 
          src={content} 
          controls 
          className="rounded-xl max-w-[min(100%,240px)] max-h-[300px] shadow-md" 
        />
      );
    }
    return <p className="text-sm whitespace-pre-wrap leading-relaxed break-all">{m.content}</p>;
  };

  if (isPaired) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)] relative">
        <div className="bg-white p-3 rounded-t-xl border border-slate-200 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{targetCode}</h3>
          </div>
          <button onClick={() => setIsPaired(false)} className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase tracking-widest">断开</button>
        </div>

        <div ref={scrollRef} className="flex-1 bg-white border-x border-slate-100 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isMe = m.sender === myCode;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[90%] rounded-2xl p-2 shadow-sm border ${isMe ? 'bg-blue-600 border-blue-500 rounded-tr-none text-white' : 'bg-slate-50 border-slate-100 rounded-tl-none text-slate-800'} overflow-hidden`}>
                  {renderMessageContent(m)}
                </div>
                <div className={`flex items-center mt-1 space-x-1 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <span className="text-[9px] font-medium text-slate-400">{m.time}</span>
                  {isMe && (m.read ? <div className="flex -space-x-1.5"><Check size={10} className="text-emerald-500" strokeWidth={3}/><Check size={10} className="text-emerald-500" strokeWidth={3}/></div> : <Check size={10} className="text-slate-300" strokeWidth={3}/>)}
                </div>
              </div>
            );
          })}
        </div>

        {showEmoji && (
          <div className="absolute bottom-20 left-4 right-4 bg-white border border-slate-200 p-3 rounded-2xl shadow-2xl z-50 grid grid-cols-6 gap-2">
            {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(p => p + e); setShowEmoji(false); }} className="text-3xl p-1 hover:bg-slate-50 rounded-lg">{e}</button>)}
          </div>
        )}

        <div className="bg-white p-3 rounded-b-xl border border-slate-200 flex items-center space-x-2 shadow-inner">
          <button onClick={() => setShowEmoji(!showEmoji)} className="text-slate-400 hover:text-blue-600 transition-colors"><Smile size={20} /></button>
          <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-blue-600"><ImageIcon size={20} /></button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
          <input type="text" value={inputMsg} onChange={e => setInputMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="私密发送..." className="flex-1 bg-slate-50 border-none rounded-full px-4 py-2 text-sm outline-none" />
          <button onClick={() => sendMessage()} className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 shadow-md"><Send size={18} /></button>
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
            <div className="flex-1 bg-slate-50 border-dashed border-2 border-slate-200 rounded-xl py-3 text-center font-mono font-bold tracking-widest">{myCode}</div>
            <button onClick={() => { navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-3 bg-slate-100 rounded-xl">{copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}</button>
          </div>
        ) : (
          <button onClick={async () => { const res = await request<any>(apiBase, '/api/create-friend-code'); if (res.code === 200) setMyCode(res.friendCode!); }} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">生成编码</button>
        )}
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold flex items-center space-x-2 text-slate-700"><UserPlus size={20} /><span>开启私聊</span></h2>
        <div className="space-y-3">
          <input type="text" value={myCode} onChange={e => setMyCode(e.target.value)} placeholder="我的编码" className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
          <input type="text" value={targetCode} onChange={e => setTargetCode(e.target.value)} placeholder="对方编码" className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
          <button onClick={async () => { const res = await request<any>(apiBase, '/api/add-friend', 'POST', { myCode, targetCode }); if (res.code === 200) setIsPaired(true); }} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold">开启私聊</button>
        </div>
      </div>
    </div>
  );
};

export default FriendView;
