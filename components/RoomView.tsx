
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Message, MessageType, SavedRoom } from '../types';
import { request } from '../services/api';
import { deriveKey, encryptContent, decryptContent } from '../services/crypto';
import ProtocolInfo from './ProtocolInfo';
import QRCode from 'qrcode';
import { 
  Send, Copy, CheckCircle2, Image as ImageIcon, 
  Smile, X, AlertCircle, Loader2, Lock, Unlock, HelpCircle, History, Mic, StopCircle, Play, Pause, ShieldAlert, ShieldCheck, QrCode, WifiOff, Clock, Wifi
} from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '🤔', '😎', '🔥', '✨', '👍', '🙏', '❤️', '🎉', '👋', '👀', '🌚', '🤫', '💀'];

const isOnlyEmoji = (text: string) => {
  const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/g;
  return text.length <= 8 && emojiRegex.test(text.replace(/\s/g, ''));
};

const isDataUrl = (text: string) => text.startsWith('data:');

const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100);
    const onEnded = () => setPlaying(false);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <div className="flex items-center space-x-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 min-w-[200px]">
      <button onClick={togglePlay} className="p-2 bg-blue-600 text-white rounded-full hover:scale-105 active:scale-95 transition-transform">
        {playing ? <Pause size={16} fill="currentColor"/> : <Play size={16} className="ml-0.5" fill="currentColor"/>}
      </button>
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
        <div className="h-full bg-blue-500 transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
      <audio ref={audioRef} src={src} className="hidden" />
    </div>
  );
};

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
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const decryptedCache = useRef<Record<string, string>>({});
  
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showProtocol, setShowProtocol] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'syncing' | 'poor' | 'offline'>('online');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollDelayRef = useRef<number>(3000); // 初始轮询延迟

  // 初始化加密
  const initCrypto = useCallback(async () => {
    if (!activeRoom || !password) return;
    try {
      const key = await deriveKey(activeRoom, password);
      setCryptoKey(key);
      decryptedCache.current = {}; 
    } catch (e: any) {
      setError('加密套件初始化失败');
    }
  }, [activeRoom, password]);

  useEffect(() => {
    if (activeRoom && password) initCrypto();
  }, [activeRoom, password, initCrypto]);

  // 获取消息函数
  const fetchMessages = useCallback(async () => {
    if (!activeRoom || !cryptoKey) return false;
    
    setSyncStatus('syncing');
    const res = await request<any[]>(apiBase, `/api/get-msg?roomCode=${activeRoom}`);
    
    if (res.code === 200 && res.data) {
      setSyncStatus('online');
      setApiError(null);
      pollDelayRef.current = 3000; // 成功后重置延迟为 3s

      const decryptedMsgs = await Promise.all(res.data.map(async (m) => {
        const cacheKey = `${m.id}-${m.content.substring(0, 20)}`;
        if (decryptedCache.current[cacheKey]) return { ...m, content: decryptedCache.current[cacheKey] };
        const decrypted = await decryptContent(cryptoKey, m.content);
        const finalContent = decrypted !== null ? decrypted : '🔒 [解密失败]';
        if (decrypted !== null) decryptedCache.current[cacheKey] = finalContent;
        return { ...m, content: finalContent };
      }));
      setMessages(decryptedMsgs);
      return true;
    } else {
      // 指数退避：如果失败或超时，增加下一次轮询的间隔
      setSyncStatus('poor');
      pollDelayRef.current = Math.min(pollDelayRef.current + 3000, 15000); 
      setApiError(res.msg || '网络连接缓慢');
      return false;
    }
  }, [activeRoom, cryptoKey, apiBase]);

  // 递归智能轮询
  useEffect(() => {
    let timer: any;
    let isActive = true;

    const runPoll = async () => {
      if (!isActive) return;
      await fetchMessages();
      if (isActive) {
        timer = setTimeout(runPoll, pollDelayRef.current);
      }
    };

    if (activeRoom && cryptoKey) runPoll();

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [activeRoom, cryptoKey, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (content?: string, type: MessageType = 'text') => {
    const rawContent = (content !== undefined ? content : inputMsg).trim();
    if (!rawContent || !activeRoom || !cryptoKey) return;
    
    const tempId = `T-${Date.now()}`;
    if (content === undefined) setInputMsg('');
    
    // 乐观更新
    const optimisticMsg: Message = {
      id: tempId,
      sender: 'anonymous',
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      timestamp: Date.now(),
      type,
      content: rawContent,
      read: false
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setSendingIds(prev => new Set(prev).add(tempId));

    try {
      const encrypted = await encryptContent(cryptoKey, rawContent);
      const res = await request<any>(apiBase, '/api/send-msg', 'POST', { roomCode: activeRoom, msg: encrypted, type });
      if (res.code === 200) {
        await fetchMessages();
      } else {
        setApiError('发送排队中，请不要离开...');
      }
    } catch (e) {
      setError('发送失败');
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      alert('直连环境下图片请保持在 1MB 以内');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await sendMessage(ev.target?.result as string, file.type.startsWith('image') ? 'image' : 'video');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startRecording = async () => { /* ... (与之前一致) */ };
  const stopRecording = () => { /* ... (与之前一致) */ };

  const generateShareUrl = async () => {
    const url = `${window.location.origin}${window.location.pathname}#r=${activeRoom}&p=${password}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 400 });
    setQrCodeUrl(qrDataUrl);
    setShowShare(true);
  };

  if (activeRoom) {
    return (
      <div className="flex flex-col h-full overflow-hidden relative">
        {/* Network status overlay */}
        {syncStatus === 'poor' && (
          <div className="absolute top-16 left-0 right-0 z-[60] px-4 animate-in slide-in-from-top-2">
            <div className="bg-amber-500 text-white px-4 py-2 rounded-2xl shadow-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <WifiOff size={14} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase">连接同步缓慢... 频率已自动下调</span>
              </div>
              <Loader2 size={12} className="animate-spin" />
            </div>
          </div>
        )}

        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="preview" />
          </div>
        )}

        {showShare && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowShare(false)}>
            <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Room Entry Protocol</h3>
                <button onClick={() => setShowShare(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={18}/></button>
              </div>
              <img src={qrCodeUrl} className="w-full h-auto rounded-3xl border border-slate-100 p-2" alt="QR Code" />
              <button 
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#r=${activeRoom}&p=${password}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest"
              >
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Link Copied' : 'Copy Sync URL'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Room Header */}
        <div className="flex-shrink-0 px-5 py-3 bg-white/70 backdrop-blur-md border-b border-slate-200/60 z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="w-9 h-9 rounded-xl shadow-inner" style={{ background: useMemo(() => {
                let hash = 0; const s = password + activeRoom;
                for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
                return `hsl(${Math.abs(hash % 360)}, 70%, 50%)`;
             }, [password, activeRoom]) }} />
             <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest font-mono leading-none">{activeRoom}</h3>
                <div className="flex items-center space-x-1.5 mt-1">
                   {syncStatus === 'online' ? <ShieldCheck size={10} className="text-emerald-500" /> : <Wifi size={10} className="text-amber-500 animate-pulse" />}
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">
                     {syncStatus === 'online' ? 'E2E Connected' : 'Syncing Node...'}
                   </span>
                </div>
             </div>
          </div>
          <div className="flex items-center space-x-0.5">
            <button onClick={generateShareUrl} className="p-2 text-slate-400 hover:text-blue-500"><QrCode size={18}/></button>
            <button onClick={() => setShowProtocol(true)} className="p-2 text-slate-400"><HelpCircle size={18}/></button>
            <button onClick={() => { setActiveRoom(''); }} className="p-2 text-slate-400 hover:text-red-500"><X size={20}/></button>
          </div>
        </div>

        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5 bg-[#FDFDFD]" onClick={() => setShowEmoji(false)}>
          {messages.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-20"><Lock size={40} className="mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.4em]">Protocol Active</p></div>}
          {messages.map((m) => {
            const isEmoji = isOnlyEmoji(m.content);
            const isSending = sendingIds.has(m.id);
            return (
              <div key={m.id} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`relative px-4 py-3 ${isEmoji ? 'bg-transparent text-[48px]' : 'bg-white border border-slate-200/80 rounded-[22px] rounded-tl-none shadow-sm text-slate-800'} max-w-[85%] ${isSending ? 'opacity-40' : ''}`}>
                   {m.type === 'image' ? <img src={m.content} className="rounded-xl max-h-[300px] object-cover cursor-zoom-in" onClick={() => setPreviewImage(m.content)} /> : 
                    m.type === 'audio' ? <AudioPlayer src={m.content} /> :
                    <p className="text-[14px] leading-relaxed break-all whitespace-pre-wrap font-medium">{m.content}</p>}
                </div>
                {!isEmoji && <div className="flex items-center mt-1.5 ml-1 space-x-2">
                  <span className="text-[8px] font-black text-slate-300 uppercase">{m.time}</span>
                  {isSending && <Clock size={8} className="text-slate-200 animate-spin" />}
                </div>}
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 px-4 pb-32 pt-4 bg-white/80 backdrop-blur-md">
           {showEmoji && (
             <div className="absolute bottom-[280px] left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200 p-4 rounded-[32px] shadow-2xl z-50 grid grid-cols-8 gap-2 animate-in slide-in-from-bottom-2">
               {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(p => p + e); setShowEmoji(false); }} className="text-2xl p-2.5 hover:bg-slate-50 rounded-2xl active:scale-90">{e}</button>)}
             </div>
           )}
           <div className="flex items-center bg-slate-50 border border-slate-200 rounded-[28px] p-1.5 shadow-inner">
             <button onClick={() => setShowEmoji(!showEmoji)} className="p-3 text-slate-400 hover:text-blue-500 transition-colors"><Smile size={22} /></button>
             <input
               type="text" value={inputMsg} onChange={e => setInputMsg(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && sendMessage()}
               placeholder="加密传输中..."
               className="flex-1 bg-transparent px-2 py-3 text-sm outline-none font-medium text-slate-800 placeholder:text-slate-300"
             />
             <div className="flex items-center space-x-1 pr-1">
               <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><ImageIcon size={20} /></button>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
               <button onClick={() => sendMessage()} disabled={!inputMsg.trim()} className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg disabled:opacity-20 active:scale-95 transition-all">
                 <Send size={18} />
               </button>
             </div>
           </div>
        </div>
        {showProtocol && <ProtocolInfo onClose={() => setShowProtocol(false)} />}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 pt-8 pb-32 space-y-8 bg-[#F8FAFC]">
      <div className="bg-white p-8 rounded-[48px] border border-slate-200/50 shadow-2xl text-center space-y-6">
         <div className="mx-auto bg-slate-900 w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl"><Lock size={30} /></div>
         <h2 className="text-2xl font-black text-slate-900 tracking-tight">匿名隧道</h2>
         {apiError && <div className="text-[10px] font-black text-amber-600 bg-amber-50 py-2 rounded-xl flex items-center justify-center space-x-2"><AlertCircle size={12} /><span>{apiError}</span></div>}
         <button 
          onClick={async () => { if(!password) { setError('请设置密钥'); return; } setLoading(true); try { const res = await request<any>(apiBase, '/api/create-room'); if (res.code === 200) setActiveRoom(res.roomCode!); } finally { setLoading(false); } }}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
         >
           {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : '创建新节点'}
         </button>
      </div>

      <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[40px] border border-white shadow-xl space-y-5">
         <div className="space-y-3">
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 focus-within:ring-2 ring-blue-100 transition-all">
               <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-widest">房间代码</label>
               <input type="text" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="ROOM-CODE" className="w-full bg-transparent font-black font-mono text-base outline-none" />
            </div>
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 focus-within:ring-2 ring-blue-100 transition-all">
               <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-widest">加密密钥</label>
               <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent font-black text-base outline-none" />
            </div>
         </div>
         <button onClick={() => { if(!roomCode || !password) return; setActiveRoom(roomCode.toUpperCase().trim()); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">建立隧道连接</button>
      </div>

      {savedRooms.length > 0 && (
        <div className="space-y-3 px-1">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2"><History size={12} /><span>活跃片段</span></h4>
           <div className="grid grid-cols-2 gap-2">
              {savedRooms.map(room => (
                <button key={room.code} onClick={() => { setRoomCode(room.code); setPassword(room.pass); setActiveRoom(room.code); }} className="bg-white border border-slate-100 p-3.5 rounded-2xl text-left hover:border-blue-200 transition-all shadow-sm active:scale-95">
                  <span className="font-black font-mono text-xs text-slate-800">{room.code}</span>
                </button>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default RoomView;
