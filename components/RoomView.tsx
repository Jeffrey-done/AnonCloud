import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Message, MessageType, SavedRoom } from '../types';
import { request } from '../services/api';
import { deriveKey, encryptContent, decryptContent } from '../services/crypto';
import ProtocolInfo from './ProtocolInfo';
import QRCode from 'qrcode';
import { 
  Send, Copy, CheckCircle2, Image as ImageIcon, 
  Smile, X, AlertCircle, Loader2, Lock, Unlock, HelpCircle, Zap, History, Mic, StopCircle, Play, Pause, ShieldAlert, ShieldCheck, QrCode
} from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '🤔', '😎', '🔥', '✨', '👍', '🙏', '❤️', '🎉', '👋', '👀', '🌚', '🤫', '💀'];

const isOnlyEmoji = (text: string) => {
  const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/g;
  return text.length <= 8 && emojiRegex.test(text.replace(/\s/g, ''));
};

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
  const decryptedCache = useRef<Record<string, string>>({});
  
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showProtocol, setShowProtocol] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 核心：处理 URL 分享逻辑
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const params = new URLSearchParams(hash);
      const r = params.get('r');
      const p = params.get('p');
      if (r && p) {
        setRoomCode(r.toUpperCase());
        setPassword(p);
        setActiveRoom(r.toUpperCase());
        // 成功解析后清除 Hash 保护隐私
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

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
      const key = await deriveKey(activeRoom, password);
      setCryptoKey(key);
      decryptedCache.current = {}; 
      setError(null);
    } catch (e: any) {
      setError('加密初始化失败');
    }
  }, [activeRoom, password]);

  useEffect(() => {
    localStorage.setItem('anon_active_room', activeRoom);
    localStorage.setItem('anon_last_room_input', roomCode);
    localStorage.setItem('anon_last_room_pass', password);
    localStorage.setItem('anon_saved_rooms', JSON.stringify(savedRooms));
    
    if (activeRoom && password) {
      initCrypto();
      setSavedRooms(prev => {
        const filtered = prev.filter(r => r.code !== activeRoom);
        return [{ code: activeRoom, pass: password, lastUsed: Date.now() }, ...filtered].slice(0, 10);
      });
    }
  }, [activeRoom, password, initCrypto]);

  const fetchMessages = useCallback(async () => {
    if (!activeRoom || !cryptoKey) return;
    const res = await request<any[]>(apiBase, `/api/get-msg?roomCode=${activeRoom}`);
    if (res.code === 200 && res.data) {
      const decryptedMsgs = await Promise.all(res.data.map(async (m) => {
        const cacheKey = `${m.id || 'NOID'}-${m.content.substring(0, 20)}`;
        if (decryptedCache.current[cacheKey]) return { ...m, content: decryptedCache.current[cacheKey] };
        const decrypted = await decryptContent(cryptoKey, m.content);
        const finalContent = decrypted !== null ? decrypted : '🔒 [解密失败]';
        if (decrypted !== null && m.id) decryptedCache.current[cacheKey] = finalContent;
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
    if (content === undefined) setInputMsg('');
    setLoading(true);
    try {
      const encrypted = await encryptContent(cryptoKey, rawContent);
      const res = await request<any>(apiBase, '/api/send-msg', 'POST', { roomCode: activeRoom, msg: encrypted, type });
      if (res.code === 200) fetchMessages();
      else setError(res.msg || '发送失败');
    } catch (e: any) { setError('加密失败'); }
    finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const type: MessageType = file.type.startsWith('image') ? 'image' : (file.type.startsWith('video') ? 'video' : 'audio');
      await sendMessage(ev.target?.result as string, type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async (e) => await sendMessage(e.target?.result as string, 'audio');
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (e) { setError('无法访问麦克风'); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const generateShareUrl = async () => {
    const url = `${window.location.origin}${window.location.pathname}#r=${activeRoom}&p=${password}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 4, color: { dark: '#0f172a', light: '#ffffff' } });
      setQrCodeUrl(qrDataUrl);
      setShowShare(true);
    } catch (err) { setError('生成二维码失败'); }
  };

  const renderMessageContent = (m: any) => {
    if (m.content === '🔒 [解密失败]') return <div className="flex items-center space-x-2 text-red-500/80 p-1"><ShieldAlert size={14} /><span className="text-[11px] font-black uppercase">Decryption Failed</span></div>;
    if (m.type === 'audio') return <AudioPlayer src={m.content} />;
    if (m.type === 'image') return <img src={m.content} className="rounded-2xl max-w-full max-h-[300px] object-cover cursor-zoom-in shadow-sm" alt="media" onClick={() => setPreviewImage(m.content)} />;
    const isEmoji = isOnlyEmoji(m.content);
    return <p className={`${isEmoji ? 'text-[48px] py-2' : 'text-[14px] leading-relaxed'} break-all whitespace-pre-wrap font-medium text-slate-800`}>{m.content}</p>;
  };

  if (activeRoom) {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden relative">
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in zoom-in-95" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="preview" />
          </div>
        )}

        {showShare && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowShare(false)}>
            <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Room Protocol</h3>
                <button onClick={() => setShowShare(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={18}/></button>
              </div>
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <img src={qrCodeUrl} className="w-full h-auto rounded-2xl" alt="QR Code" />
              </div>
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-medium leading-relaxed px-2">Scan to join this secure room instantly. The password is encoded in the fragment for one-tap sync.</p>
                <button 
                  onClick={() => { 
                    const url = `${window.location.origin}${window.location.pathname}#r=${activeRoom}&p=${password}`;
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-full flex items-center justify-center space-x-3 bg-slate-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-300"
                >
                  {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  <span>{copied ? 'Link Copied' : 'Copy Room Link'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Room Header */}
        <div className="flex-shrink-0 px-5 py-4 bg-white/70 backdrop-blur-md border-b border-slate-200/60 z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl shadow-inner border-2 border-white" style={{ background: visualFingerprint || '#000' }} />
            <div>
               <h3 className="text-sm font-black font-mono tracking-widest text-slate-800 leading-none uppercase">{activeRoom}</h3>
               <div className="flex items-center space-x-1.5 mt-1">
                 <ShieldCheck size={12} className="text-emerald-500" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">E2E Secure Channel</span>
               </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={generateShareUrl} className="p-2.5 text-slate-400 hover:text-blue-500 transition-colors"><QrCode size={18} /></button>
            <button onClick={() => setShowProtocol(true)} className="p-2.5 text-slate-400 hover:text-blue-500"><HelpCircle size={18}/></button>
            <button onClick={() => { setActiveRoom(''); setCryptoKey(null); }} className="p-2.5 text-slate-400 hover:text-red-500"><X size={20} /></button>
          </div>
        </div>

        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-8 space-y-6 bg-[#FDFDFD]" onClick={() => setShowEmoji(false)}>
          {messages.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-30 select-none"><Lock size={48} className="text-slate-300 mb-4" /><p className="text-xs font-black uppercase tracking-[0.3em]">Channel Established</p></div>}
          {messages.map((m) => {
            const isEmoji = isOnlyEmoji(m.content);
            return (
              <div key={m.id || Math.random()} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div className={`relative px-5 py-4 transition-all duration-500 ${isEmoji ? 'bg-transparent border-none' : 'bg-white border-slate-200/80 border rounded-[28px] rounded-tl-none'} text-slate-800 max-w-[85%] shadow-sm`}>
                  {renderMessageContent(m)}
                </div>
                {!isEmoji && <div className="flex items-center mt-2 ml-1"><span className="text-[9px] font-black text-slate-300 uppercase">{m.time}</span></div>}
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 px-4 pb-32 pt-4 bg-gradient-to-t from-white via-white to-transparent">
          {showEmoji && (
            <div className="absolute bottom-[280px] left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200 p-4 rounded-[32px] shadow-2xl z-50 grid grid-cols-8 gap-2 animate-in slide-in-from-bottom-4">
              {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(p => p + e); setShowEmoji(false); }} className="text-2xl p-2.5 hover:bg-slate-50 rounded-2xl transition-all active:scale-90">{e}</button>)}
            </div>
          )}
          
          <div className="relative flex flex-col space-y-3">
            <div className={`flex items-center p-2 rounded-[32px] border border-slate-200 transition-all duration-500 bg-white shadow-2xl`}>
              <button 
                onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
                className={`p-3.5 transition-all rounded-full ${isRecording ? 'text-red-500 bg-red-50 recording-pulse' : 'text-slate-400 hover:text-blue-500'}`}
              >
                {isRecording ? <StopCircle size={24} /> : <Mic size={24} />}
              </button>
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-3.5 text-slate-400 hover:text-blue-500 transition-colors"><Smile size={24} /></button>
              <input
                type="text" value={inputMsg} onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
                placeholder={isRecording ? "Listening..." : "E2EE encrypted..."}
                className="flex-1 min-w-0 bg-transparent px-2 py-4 text-[16px] outline-none font-medium text-slate-900"
              />
              <div className="flex items-center space-x-1.5 pr-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-300 hover:text-blue-600"><ImageIcon size={22} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileUpload} />
                <button onClick={() => sendMessage()} disabled={loading || !inputMsg.trim()} className={`p-4 rounded-2xl shadow-xl active:scale-95 disabled:opacity-20 bg-slate-900 text-white transition-all`}>
                  {loading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} strokeWidth={2.5} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        {showProtocol && <ProtocolInfo onClose={() => setShowProtocol(false)} />}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 pt-8 pb-32 space-y-8 bg-[#F8FAFC]">
      <div className="bg-white p-10 rounded-[56px] border border-slate-200/50 shadow-2xl text-center space-y-8 animate-in slide-in-from-top-6 duration-700">
         <div className="relative mx-auto bg-slate-900 w-24 h-24 rounded-[40px] flex items-center justify-center text-white shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500"><Lock size={44} /></div>
         <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Secure Sync</h2>
         {error && <div className="p-4 bg-red-50 border border-red-100 rounded-3xl text-red-600 text-xs font-black animate-shake flex items-center justify-center space-x-2"><AlertCircle size={14}/><span>{error}</span></div>}
         <button 
          onClick={async () => { if(!password) { setError('Please set encryption key'); return; } setLoading(true); try { const res = await request<any>(apiBase, '/api/create-room'); if (res.code === 200) setActiveRoom(res.roomCode!); } finally { setLoading(false); } }}
          className="w-full bg-slate-900 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-300 active:scale-95 transition-all"
         >
           {loading ? <Loader2 size={20} className="animate-spin" /> : 'Deploy New Node'}
         </button>
      </div>

      <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[48px] border border-white shadow-2xl space-y-6">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-slate-50/50 border border-slate-100 rounded-3xl px-6 py-5 focus-within:ring-4 ring-blue-50 transition-all">
               <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Entry Code</label>
               <input type="text" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="ROOM-ID" className="w-full bg-transparent font-black font-mono text-lg outline-none placeholder:text-slate-200" />
            </div>
            <div className="bg-slate-50/50 border border-slate-100 rounded-3xl px-6 py-5 focus-within:ring-4 ring-blue-50 transition-all">
               <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Passphrase</label>
               <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent font-black text-lg outline-none placeholder:text-slate-200" />
            </div>
         </div>
         <button onClick={() => { if(!roomCode || !password) return; setActiveRoom(roomCode.toUpperCase().trim()); }} className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-200 active:scale-95 transition-all">Establish Channel Sync</button>
      </div>

      {savedRooms.length > 0 && (
        <div className="space-y-4 px-2">
           <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center space-x-2"><History size={14} /><span>Active Fragments</span></h4>
           <div className="grid grid-cols-2 gap-3">
              {savedRooms.map(room => (
                <button key={room.code} onClick={() => { setRoomCode(room.code); setPassword(room.pass); setActiveRoom(room.code); }} className="bg-white border border-slate-100 p-4 rounded-[24px] text-left hover:border-blue-200 transition-all shadow-sm active:scale-95 group">
                  <div className="flex items-center justify-between"><span className="font-black font-mono text-sm text-slate-800">{room.code}</span><Unlock size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" /></div>
                </button>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default RoomView;