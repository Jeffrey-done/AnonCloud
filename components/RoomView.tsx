
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Message, MessageType, SavedRoom } from '../types';
import { request } from '../services/api';
import { deriveKey, encryptContent, decryptContent, isCryptoSupported } from '../services/crypto';
import ProtocolInfo from './ProtocolInfo';
import { 
  Send, PlusCircle, Copy, CheckCircle2, Image as ImageIcon, 
  Smile, X, Maximize2, AlertCircle, Loader2, Lock, Unlock, HelpCircle, Zap, History, Mic, StopCircle, Play, Pause, Volume2, ShieldAlert, Flame, ShieldCheck, QrCode
} from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '🤔', '😎', '🙄', '🔥', '✨', '👍', '🙏', '❤️', '🎉', '👋', '👀', '🌚', '🤫'];

const RoomView: React.FC<{ apiBase: string }> = ({ apiBase }) => {
  const [roomCode, setRoomCode] = useState<string>(() => localStorage.getItem('anon_last_room_input') || '');
  const [password, setPassword] = useState<string>(() => localStorage.getItem('anon_last_room_pass') || '');
  const [activeRoom, setActiveRoom] = useState<string>(() => localStorage.getItem('anon_active_room') || '');
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>(() => {
    const saved = localStorage.getItem('anon_saved_rooms');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const decryptedCache = useRef<Record<string, string>>({});
  
  const [inputMsg, setInputMsg] = useState<string>('');
  const [isBurnMode, setIsBurnMode] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visualFingerprint = useMemo(() => {
    if (!password || !activeRoom) return null;
    let hash = 0;
    const seed = password + activeRoom;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const h1 = Math.abs(hash % 360);
    const h2 = Math.abs((hash * 31) % 360);
    return `linear-gradient(135deg, hsl(${h1}, 80%, 60%), hsl(${h2}, 80%, 40%))`;
  }, [password, activeRoom]);

  const initCrypto = useCallback(async () => {
    if (!activeRoom || !password) return;
    try {
      setIsInitializing(true);
      const key = await deriveKey(activeRoom, password);
      setCryptoKey(key);
      decryptedCache.current = {}; 
      setError(null);
    } catch (e: any) {
      setError('加密初始化失败，请确保环境安全');
    } finally {
      setIsInitializing(false);
    }
  }, [activeRoom, password]);

  useEffect(() => {
    localStorage.setItem('anon_active_room', activeRoom);
    localStorage.setItem('anon_last_room_input', roomCode);
    localStorage.setItem('anon_last_room_pass', password);
    localStorage.setItem('anon_saved_rooms', JSON.stringify(savedRooms));
    
    if (activeRoom && password) {
      initCrypto();
      saveToHistory(activeRoom, password);
    }
  }, [activeRoom, password, initCrypto]);

  const saveToHistory = (code: string, pass: string) => {
    if (!code || !pass) return;
    setSavedRooms(prev => {
      const filtered = prev.filter(r => r.code !== code);
      return [{ code, pass, lastUsed: Date.now() }, ...filtered].slice(0, 10);
    });
  };

  const handleQuickJoin = (room: SavedRoom) => {
    setRoomCode(room.code);
    setPassword(room.pass);
    setActiveRoom(room.code);
  };

  const fetchMessages = useCallback(async () => {
    if (!activeRoom || !cryptoKey) return;

    const res = await request<any[]>(apiBase, `/api/get-msg?roomCode=${activeRoom}`);
    if (res.code === 200 && res.data) {
      const decryptedMsgs = await Promise.all(res.data.map(async (m) => {
        const cacheKey = m.id || `legacy-${m.timestamp}`;
        
        if (decryptedCache.current[cacheKey]) {
          return { ...m, content: decryptedCache.current[cacheKey] };
        }
        
        const decrypted = await decryptContent(cryptoKey, m.content);
        const finalContent = decrypted !== null ? decrypted : '🔒 [解密失败]';
        decryptedCache.current[cacheKey] = finalContent;
        return { ...m, content: finalContent };
      }));
      setMessages(decryptedMsgs);
    }
  }, [activeRoom, cryptoKey, apiBase]);

  useEffect(() => {
    let interval: any;
    if (activeRoom && cryptoKey) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [activeRoom, cryptoKey, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (content?: string, type: MessageType = 'text') => {
    const rawContent = (content !== undefined ? content : inputMsg).trim();
    if (!rawContent || !activeRoom || !cryptoKey) return;
    
    const isMainInput = content === undefined;
    if (isMainInput) setInputMsg('');
    
    setLoading(true);
    try {
      const encrypted = await encryptContent(cryptoKey, rawContent);
      const res = await request<any>(apiBase, '/api/send-msg', 'POST', { 
        roomCode: activeRoom, 
        msg: encrypted, 
        type,
        burn: isBurnMode
      });
      
      if (res.code === 200) {
        if (isBurnMode) setIsBurnMode(false);
        fetchMessages();
      } else {
        setError(res.msg || '发送失败');
        if (isMainInput) setInputMsg(rawContent);
      }
    } catch (e: any) {
      setError('加密失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('文件超过 5MB 限制'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const type: MessageType = file.type.startsWith('video') ? 'video' : (file.type.startsWith('audio') ? 'audio' : 'image');
      await sendMessage(ev.target?.result as string, type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderMessageContent = (m: any) => {
    const content = m.content;
    if (content === '🔒 [解密失败]') {
      return (
        <div className="flex items-center space-x-2 text-red-400 p-1">
          <ShieldAlert size={14} />
          <span className="text-[11px] font-black uppercase">密钥错误</span>
        </div>
      );
    }
    
    if (m.type === 'audio' || content.startsWith('data:audio/')) {
       return (
         <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl">
           <Play size={14} fill="currentColor"/>
           <div className="h-1 w-24 bg-slate-200 rounded-full" />
           <span className="text-[10px] font-bold">SECURE</span>
         </div>
       );
    }

    if (m.type === 'image' || content.startsWith('data:image/')) {
      return <img src={content} className="rounded-2xl max-w-full max-h-[300px] object-cover cursor-zoom-in shadow-sm" alt="media" onClick={() => setPreviewImage(content)} />;
    }

    return (
      <div className="flex flex-col">
        {m.burn && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5 text-amber-600">
              <Flame size={12} fill="currentColor" className="animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-wider">销毁中</span>
            </div>
            {m.expireAt && (
               <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-amber-400 transition-all duration-1000 ease-linear" 
                   style={{ width: `${Math.max(0, ((m.expireAt - Date.now()) / 30000) * 100)}%` }}
                 />
               </div>
            )}
          </div>
        )}
        <p className="text-[14px] leading-relaxed break-all whitespace-pre-wrap font-medium">{m.content}</p>
      </div>
    );
  };

  if (activeRoom) {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden">
        {/* Room Header */}
        <div className="flex-shrink-0 px-4 py-3 bg-white/70 backdrop-blur-md border-b border-slate-200/60 z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-xl shadow-inner border border-white/50" 
              style={{ background: visualFingerprint || '#000' }}
            />
            <div>
               <h3 className="text-xs font-black font-mono tracking-widest text-slate-800 leading-none">{activeRoom}</h3>
               <div className="flex items-center space-x-1 mt-0.5">
                 <ShieldCheck size={10} className="text-emerald-500" />
                 <span className="text-[8px] font-black text-slate-400 uppercase">E2EE Active</span>
               </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={() => { navigator.clipboard.writeText(activeRoom); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 text-slate-400 hover:text-slate-600">
               {copied ? <CheckCircle2 size={18} className="text-emerald-500" /> : <QrCode size={18} />}
            </button>
            <button onClick={() => { setActiveRoom(''); setCryptoKey(null); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
          </div>
        </div>

        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 bg-slate-50/20" onClick={() => setShowEmoji(false)}>
          {messages.map((m) => (
            <div key={m.id} className="flex flex-col items-start animate-in slide-in-from-bottom-2 duration-300">
              <div className={`relative px-4 py-3 rounded-[22px] rounded-tl-none border shadow-sm transition-all duration-500 ${m.burn ? 'bg-amber-50/30 border-amber-100 ring-1 ring-amber-50' : 'bg-white border-slate-200/80'} text-slate-800 max-w-[85%]`}>
                {renderMessageContent(m)}
              </div>
              <span className="text-[8px] font-black text-slate-300 uppercase mt-1.5 ml-1">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 px-4 pb-32 pt-2 bg-gradient-to-t from-white via-white to-transparent">
          <div className="relative flex flex-col space-y-2">
            <div className={`flex items-center p-1.5 rounded-[30px] border transition-all duration-300 bg-white shadow-xl ${isBurnMode ? 'border-amber-400 ring-4 ring-amber-400/10 shadow-amber-100' : 'border-slate-200 shadow-slate-200/40'}`}>
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-3 text-slate-400 hover:text-blue-500 transition-colors"><Smile size={22} /></button>
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
                placeholder={isBurnMode ? "发送即焚消息..." : "发送安全消息..."}
                className="flex-1 min-w-0 bg-transparent px-2 py-3 text-[15px] outline-none"
                disabled={loading}
              />
              <div className="flex items-center space-x-1 pr-1">
                <button 
                  onClick={() => setIsBurnMode(!isBurnMode)} 
                  className={`p-2.5 rounded-full transition-all group relative ${isBurnMode ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500'}`}
                >
                  <Flame size={20} fill={isBurnMode ? "currentColor" : "none"} className={isBurnMode ? 'animate-pulse' : ''} />
                  {isBurnMode && <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping" />}
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-300 hover:text-blue-500 transition-colors"><ImageIcon size={20} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileUpload} />
                <button 
                  onClick={() => sendMessage()} 
                  disabled={loading || !inputMsg.trim()}
                  className={`p-3 rounded-full shadow-lg active:scale-95 disabled:opacity-20 transition-all ${isBurnMode ? 'bg-amber-600' : 'bg-slate-900'} text-white`}
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
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
      <div className="bg-white p-10 rounded-[48px] border border-slate-200/60 shadow-2xl text-center space-y-8 animate-in slide-in-from-top-4">
         <div className="relative mx-auto bg-slate-900 w-20 h-20 rounded-[30px] flex items-center justify-center text-white shadow-xl">
            <Lock size={36} />
            <div className="absolute -top-2 -right-2 bg-blue-500 p-1.5 rounded-full ring-4 ring-white shadow-lg"><Zap size={12} className="text-white fill-white" /></div>
         </div>
         <div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">AnonCloud Sync</h2>
           <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">Zero Knowledge Protocol</p>
         </div>
         {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold animate-shake">{error}</div>}
         <button 
          onClick={async () => { if(!password) { setError('请先设置加密密钥'); return; } setLoading(true); try { const res = await request<any>(apiBase, '/api/create-room'); if (res.code === 200) setActiveRoom(res.roomCode!); } finally { setLoading(false); } }}
          className="w-full bg-slate-900 text-white py-4.5 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
         >
           {loading ? <Loader2 size={18} className="animate-spin" /> : '开启新加密空间'}
         </button>
      </div>

      <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[40px] border border-white shadow-xl space-y-5">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 focus-within:ring-2 ring-blue-100 transition-all">
               <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">房间码</label>
               <input type="text" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="6-CHAR" className="w-full bg-transparent font-black font-mono text-base outline-none" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 focus-within:ring-2 ring-blue-100 transition-all">
               <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">加密密钥</label>
               <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent font-black text-base outline-none" />
            </div>
         </div>
         <button onClick={() => { if(!roomCode || !password) return; setActiveRoom(roomCode.toUpperCase().trim()); }} className="w-full bg-blue-600 text-white py-4.5 rounded-[22px] font-black text-xs uppercase shadow-lg shadow-blue