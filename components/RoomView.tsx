
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, MessageType, SavedRoom } from '../types';
import { request } from '../services/api';
import { deriveKey, encryptContent, decryptContent, isCryptoSupported } from '../services/crypto';
import ProtocolInfo from './ProtocolInfo';
import { 
  Send, PlusCircle, Copy, CheckCircle2, Image as ImageIcon, 
  Smile, X, Maximize2, AlertCircle, Loader2, Lock, Unlock, HelpCircle, Zap, History, Mic, StopCircle, Play, Pause, Volume2, ShieldAlert
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
  // 缓存成功解密的消息内容
  const decryptedCache = useRef<Record<string, string>>({});
  
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initCrypto = useCallback(async () => {
    if (!activeRoom || !password) return;
    if (!isCryptoSupported()) {
      setError('当前环境不支持加密（需 HTTPS）');
      return;
    }
    try {
      setIsInitializing(true);
      const key = await deriveKey(activeRoom, password);
      setCryptoKey(key);
      decryptedCache.current = {}; // 关键：密钥变化必须清空缓存
      setError(null);
    } catch (e: any) {
      setError(e.message || '加密初始化失败');
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
      const updated = [{ code, pass, lastUsed: Date.now() }, ...filtered].slice(0, 10);
      return updated;
    });
  };

  const removeSavedRoom = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    setSavedRooms(prev => prev.filter(r => r.code !== code));
  };

  const handleQuickJoin = (room: SavedRoom) => {
    setRoomCode(room.code);
    setPassword(room.pass);
    setActiveRoom(room.code);
  };

  const fetchMessages = useCallback(async () => {
    if (!activeRoom || !cryptoKey) return;

    const res = await request<Message[]>(apiBase, `/api/get-msg?roomCode=${activeRoom}`);
    if (res.code === 200 && res.data) {
      const decryptedMsgs = await Promise.all(res.data.map(async (m) => {
        // 如果消息没有 ID，使用时间戳+内容前缀作为唯一键，防止重复
        const cacheId = m.id || `${m.time}-${m.content.substring(0, 20)}`;
        
        if (decryptedCache.current[cacheId] && decryptedCache.current[cacheId] !== '🔒 [解密失败]') {
          return { ...m, content: decryptedCache.current[cacheId] };
        }
        
        const decrypted = await decryptContent(cryptoKey, m.content);
        const finalContent = decrypted !== null ? decrypted : '🔒 [解密失败]';
        decryptedCache.current[cacheId] = finalContent;
        return { ...m, content: finalContent };
      }));
      setMessages(decryptedMsgs);
      setError(null);
    } else if (res.code === 404) {
      setActiveRoom('');
    }
  }, [activeRoom, cryptoKey, apiBase]);

  useEffect(() => {
    let interval: any;
    if (activeRoom && cryptoKey) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3500);
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
        type
      });
      
      if (res.code === 200) {
        setError(null);
        await fetchMessages(); // 发送成功后强制刷新
      } else {
        setError(res.msg || '发送失败');
        if (isMainInput) setInputMsg(rawContent);
      }
    } catch (e: any) {
      setError('加密失败，请检查密钥是否正确');
      if (isMainInput) setInputMsg(rawContent);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => sendMessage(reader.result as string, 'audio');
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => setRecordDuration(p => p + 1), 1000);
    } catch (err) {
      setError('麦克风权限被拒绝');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('文件不能超过 2MB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const type: MessageType = file.type.startsWith('video') ? 'video' : (file.type.startsWith('audio') ? 'audio' : 'image');
      await sendMessage(ev.target?.result as string, type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const toggle = () => {
      if (playing) audioRef.current?.pause();
      else audioRef.current?.play();
      setPlaying(!playing);
    };
    return (
      <div className="flex items-center space-x-3 bg-slate-100/50 p-3 rounded-2xl border border-slate-200/50 min-w-[160px]">
        <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} className="hidden" />
        <button onClick={toggle} className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-all">
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
        <div className="flex-1 space-y-1">
          <div className="flex items-end space-x-0.5 h-4">
             {[...Array(12)].map((_, i) => (
               <div key={i} className={`w-1 bg-blue-400/40 rounded-full ${playing ? 'animate-bounce' : ''}`} style={{ 
                 height: `${Math.random() * 100}%`,
                 animationDelay: `${i * 0.1}s`,
                 animationDuration: '0.6s'
               }} />
             ))}
          </div>
          <span className="text-[10px] font-black text-blue-600/60 uppercase block">E2EE Audio</span>
        </div>
      </div>
    );
  };

  const renderMessageContent = (m: Message) => {
    const content = (m.content || '').trim();
    if (content === '🔒 [解密失败]' || content === '🔒 [无法解密的加密数据]') {
      return (
        <div className="flex items-center space-x-2 text-red-500 bg-red-50/50 p-2 rounded-xl border border-red-100">
          <ShieldAlert size={14} />
          <span className="text-[12px] font-black uppercase">密钥不匹配</span>
        </div>
      );
    }
    
    if (m.type === 'audio' || content.startsWith('data:audio/') || content.startsWith('data:video/webm')) {
      return <AudioPlayer src={content} />;
    }

    if (m.type === 'image' || content.startsWith('data:image/')) {
      return <img src={content} className="rounded-2xl max-w-full max-h-[320px] object-cover cursor-zoom-in shadow-md" alt="media" onClick={() => setPreviewImage(content)} />;
    }
    
    if (m.type === 'video' || (content.startsWith('data:video/') && !content.startsWith('data:video/webm'))) {
      return <video src={content} controls className="rounded-2xl max-w-full max-h-[320px] shadow-md border border-slate-200 bg-black" />;
    }

    return <p className="text-[14px] leading-relaxed break-all whitespace-pre-wrap font-medium">{m.content}</p>;
  };

  if (activeRoom) {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden">
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl animate-in zoom-in-95" alt="preview" />
          </div>
        )}

        {/* Room Header */}
        <div className="flex-shrink-0 px-4 py-3 bg-white/60 backdrop-blur-md border-b border-slate-200/60 z-10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => { navigator.clipboard.writeText(activeRoom); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
              className="flex items-center space-x-2 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-sm"
            >
              <span className="text-xs font-black font-mono tracking-widest text-slate-700">{activeRoom}</span>
              {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-300" />}
            </button>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600`}>
              {isInitializing ? <Loader2 size={10} className="animate-spin" /> : <Lock size={10} strokeWidth={3} />}
              <span className="text-[9px] font-black uppercase">{isInitializing ? 'Syncing' : 'E2EE'}</span>
            </div>
          </div>
          <button onClick={() => { setActiveRoom(''); setCryptoKey(null); }} className="p-2 text-slate-400 hover:text-red-500"><X size={20} /></button>
        </div>

        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-5 bg-slate-50/30" onClick={() => setShowEmoji(false)}>
          {messages.map((m) => (
            <div key={m.id || Math.random()} className="flex flex-col items-start animate-in slide-in-from-bottom-2 duration-300">
              <div className={`relative px-4 py-3 rounded-[24px] rounded-tl-none border shadow-sm bg-white border-slate-200/80 text-slate-800 max-w-[85%]`}>
                {renderMessageContent(m)}
              </div>
              <div className="flex items-center mt-1.5 ml-1 space-x-2">
                <span className="text-[8px] font-black text-slate-300 uppercase">{m.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Section */}
        <div className="flex-shrink-0 px-4 pb-32 pt-2 bg-white">
          <div className="relative flex items-center p-1.5 rounded-[30px] border border-slate-200 shadow-xl">
            <button onClick={() => setShowEmoji(!showEmoji)} className="p-3 text-slate-400"><Smile size={22} /></button>
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
              placeholder="发送加密消息..."
              className="flex-1 min-w-0 bg-transparent px-2 py-3 text-[15px] outline-none"
              disabled={loading}
            />
            <div className="flex items-center space-x-1 flex-shrink-0 pr-1">
              <button onClick={() => startRecording()} className={`p-2 rounded-full ${isRecording ? 'text-red-500 bg-red-50' : 'text-slate-400'}`}><Mic size={20} /></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400"><ImageIcon size={20} /></button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileUpload} />
              <button 
                onClick={() => sendMessage()} 
                disabled={loading || !inputMsg.trim()}
                className="p-3 rounded-full bg-slate-900 text-white shadow-lg active:scale-95 disabled:opacity-20"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-6 pb-32 space-y-6">
      <div className="bg-white p-10 rounded-[48px] border border-slate-200/60 shadow-2xl text-center space-y-8">
         <div className="relative mx-auto bg-slate-900 w-20 h-20 rounded-[30px] flex items-center justify-center text-white shadow-xl">
            <Lock size={36} />
            <div className="absolute -top-2 -right-2 bg-blue-500 p-1.5 rounded-full ring-4 ring-white shadow-lg"><Zap size={12} className="text-white fill-white" /></div>
         </div>
         <div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">AnonCloud Sync</h2>
           <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">Zero Knowledge Protocol</p>
         </div>
         {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">{error}</div>}
         <button 
          onClick={async () => { if(!password) { setError('密钥密码不能为空'); return; } setLoading(true); try { const res = await request<any>(apiBase, '/api/create-room'); if (res.code === 200) setActiveRoom(res.roomCode!); } finally { setLoading(false); } }}
          className="w-full bg-slate-900 text-white py-4.5 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-xl"
         >
           {loading ? <Loader2 size={18} className="animate-spin" /> : '开启新加密空间'}
         </button>
      </div>

      <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[40px] border border-white shadow-xl space-y-5">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
               <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">房间码</label>
               <input type="text" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="6-CHAR" className="w-full bg-transparent font-black font-mono text-base outline-none" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
               <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">加密密钥</label>
               <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent font-black text-base outline-none" />
            </div>
         </div>
         <button onClick={() => { if(!roomCode || !password) return; setActiveRoom(roomCode.toUpperCase().trim()); }} className="w-full bg-blue-600 text-white py-4.5 rounded-[22px] font-black text-xs uppercase shadow-lg shadow-blue-100">进入加密频道</button>
      </div>

      {savedRooms.length > 0 && (
        <div className="space-y-4 px-2">
          <div className="flex items-center justify-between">
             <span className="text-[10px] font-black uppercase text-slate-400">历史频道</span>
             <button onClick={() => setSavedRooms([])} className="text-[9px] font-black text-slate-300 uppercase">一键粉碎</button>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {savedRooms.map((room) => (
              <div key={room.code} onClick={() => handleQuickJoin(room)} className="flex items-center bg-white border border-slate-200/60 rounded-2xl px-4 py-2 cursor-pointer hover:shadow-md transition-all">
                <span className="text-[11px] font-black font-mono mr-3 text-slate-700">{room.code}</span>
                <button onClick={(e) => removeSavedRoom(e, room.code)} className="text-slate-300 hover:text-red-400"><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomView;
