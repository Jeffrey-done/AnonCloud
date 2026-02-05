
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType, SavedRoom } from '../types';
import { request } from '../services/api';
import { deriveKey, encryptContent, decryptContent } from '../services/crypto';
import ProtocolInfo from './ProtocolInfo';
import { 
  Send, PlusCircle, Copy, CheckCircle2, Image as ImageIcon, 
  Smile, X, Maximize2, AlertCircle, Loader2, Lock, Unlock, HelpCircle, Zap, History, Mic, StopCircle, Play, Pause, Volume2
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
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('anon_active_room', activeRoom);
    localStorage.setItem('anon_last_room_input', roomCode);
    localStorage.setItem('anon_last_room_pass', password);
    localStorage.setItem('anon_saved_rooms', JSON.stringify(savedRooms));
    
    if (activeRoom && password) {
      initCrypto();
      saveToHistory(activeRoom, password);
    }
  }, [activeRoom, roomCode, password, savedRooms]);

  const initCrypto = async () => {
    try {
      const key = await deriveKey(activeRoom, password);
      setCryptoKey(key);
    } catch (e) {
      setError('密钥初始化失败');
    }
  };

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
    setTimeout(() => { setActiveRoom(room.code); }, 50);
  };

  useEffect(() => {
    let interval: any;
    if (activeRoom && cryptoKey) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3500);
    }
    return () => clearInterval(interval);
  }, [activeRoom, cryptoKey, apiBase]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchMessages = async () => {
    const res = await request<Message[]>(apiBase, `/api/get-msg?roomCode=${activeRoom}`);
    if (res.code === 200 && res.data) {
      if (cryptoKey) {
        const decryptedMsgs = await Promise.all(res.data.map(async (m) => {
          const decrypted = await decryptContent(cryptoKey, m.content);
          return { ...m, content: decrypted || '🔒 [无法解密的加密数据]' };
        }));
        setMessages(decryptedMsgs);
      }
      setError(null);
    } else if (res.code === 404) {
      setActiveRoom('');
    } else if (res.code !== 200) {
      setError(res.msg || '无法连接到服务器');
    }
  };

  const sendMessage = async (content?: string, type: MessageType = 'text') => {
    const rawContent = content !== undefined ? content : inputMsg;
    if (!rawContent.trim() || !activeRoom || !cryptoKey) return;
    
    setLoading(true);
    const encrypted = await encryptContent(cryptoKey, rawContent);
    
    const res = await request<any>(apiBase, '/api/send-msg', 'POST', { 
      roomCode: activeRoom, 
      msg: encrypted, 
      type
    });
    setLoading(false);
    
    if (res.code === 200) {
      if (content === undefined) setInputMsg('');
      setError(null);
      fetchMessages();
    } else {
      setError(res.msg || '发送失败');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          await sendMessage(base64, 'audio');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError('无法访问麦克风');
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
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const type: MessageType = file.type.startsWith('video') ? 'video' : (file.type.startsWith('audio') ? 'audio' : 'image');
      await sendMessage(base64, type);
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
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[10px] font-black text-blue-600/60 uppercase">E2EE Audio</span>
            <Volume2 size={10} className="text-slate-300" />
          </div>
        </div>
      </div>
    );
  };

  const renderMessageContent = (m: Message) => {
    const content = (m.content || '').trim();
    if (content.includes('[无法解密的加密数据]')) {
      return (
        <div className="flex items-center space-x-2 text-red-400 bg-red-50/50 p-2 rounded-xl border border-red-100">
          <Lock size={14} />
          <span className="text-[12px] font-medium">{content}</span>
        </div>
      );
    }
    
    if (m.type === 'audio' || content.startsWith('data:audio/') || content.startsWith('data:video/webm')) {
      return <AudioPlayer src={content} />;
    }

    const isImageData = content.startsWith('data:image/');
    const isVideoData = content.startsWith('data:video/') && !content.startsWith('data:video/webm');

    if (m.type === 'image' || isImageData) {
      return (
        <div className="relative group/media">
          <img 
            src={content} 
            className="rounded-2xl max-w-full max-h-[320px] object-cover cursor-zoom-in hover:brightness-90 transition-all shadow-md" 
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
      return <video src={content} controls className="rounded-2xl max-w-full max-h-[320px] shadow-md border border-slate-200" />;
    }

    return (
      <div className="max-w-full overflow-hidden">
        <p className="text-[14px] leading-relaxed break-all whitespace-pre-wrap">{m.content}</p>
      </div>
    );
  };

  if (activeRoom) {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="preview" />
            <button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white"><X size={24} /></button>
          </div>
        )}

        {/* Room Header */}
        <div className="flex-shrink-0 px-4 py-3 bg-white/40 backdrop-blur-sm border-b border-slate-200/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => { navigator.clipboard.writeText(activeRoom); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                className="group flex items-center space-x-2 bg-white border border-slate-200/60 px-3 py-1.5 rounded-xl shadow-sm active:scale-95 transition-all"
              >
                <span className="text-xs font-black font-mono tracking-widest text-slate-700">{activeRoom}</span>
                {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-300" />}
              </button>
              <div className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600">
                <Lock size={10} strokeWidth={3} />
                <span className="text-[9px] font-black uppercase">E2EE</span>
              </div>
            </div>
            <button onClick={() => { setActiveRoom(''); setCryptoKey(null); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
              <X size={18} />
            </button>
          </div>
          {error && (
            <div className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-center space-x-2 text-red-600 text-[10px] font-bold">
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth" onClick={() => setShowEmoji(false)}>
          {messages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full opacity-30 select-none text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-3"><Lock size={32} className="text-slate-400" /></div>
              <p className="text-[10px] font-black uppercase tracking-widest">Encrypted Session Ready</p>
            </div>
          )}
          
          {messages.map((m) => (
            <div key={m.id} className="flex flex-col items-start animate-in slide-in-from-bottom-2 duration-300">
              <div className="relative px-4 py-3 rounded-[20px] rounded-tl-none border shadow-sm bg-white border-slate-200/80 text-slate-800 max-w-[85%]">
                {renderMessageContent(m)}
              </div>
              <div className="flex items-center mt-1 ml-1 space-x-1.5">
                <span className="text-[9px] font-medium text-slate-400">{m.time}</span>
                <Lock size={8} className="text-slate-300" />
              </div>
            </div>
          ))}
        </div>

        {/* Input Section - Anchored above bottom nav */}
        <div className="flex-shrink-0 px-4 pb-32 pt-2">
          {showEmoji && (
            <div className="absolute bottom-[240px] left-4 right-4 bg-white border border-slate-200 p-3 rounded-3xl shadow-2xl z-50 grid grid-cols-8 gap-2">
              {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(prev => prev + e); setShowEmoji(false); }} className="text-xl p-2 hover:bg-slate-100 rounded-xl">{e}</button>)}
            </div>
          )}

          {isRecording && (
            <div className="absolute bottom-[240px] left-4 right-4 bg-slate-900 p-4 rounded-3xl shadow-2xl z-50 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-white">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="font-mono text-lg">{formatDuration(recordDuration)}</span>
              </div>
              <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full">
                <StopCircle size={20} />
              </button>
            </div>
          )}

          <div className="relative flex flex-col p-1.5 rounded-[28px] border bg-white border-slate-200 shadow-xl shadow-slate-200/40">
            <div className="flex items-center">
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 flex-shrink-0 text-slate-400 hover:text-blue-600">
                <Smile size={20} />
              </button>
              
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isRecording ? "Recording..." : "Secure message..."}
                disabled={isRecording}
                className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-[14px] font-medium focus:ring-0 outline-none text-slate-800"
              />
              
              <div className="flex items-center space-x-0.5 flex-shrink-0">
                <button onClick={() => startRecording()} className={`p-2 rounded-full ${isRecording ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:bg-slate-50'}`}>
                  <Mic size={18} />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-slate-400 hover:bg-slate-50">
                  <ImageIcon size={18} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileUpload} />
                
                <button 
                  onClick={() => sendMessage()} 
                  disabled={loading || !inputMsg.trim() || isRecording}
                  className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-all active:scale-90 ml-1"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={2.5} />}
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
      {showProtocol && <ProtocolInfo onClose={() => setShowProtocol(false)} />}
      
      {/* Main Action Card */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-xl text-center space-y-6">
         <div className="relative mx-auto bg-slate-900 w-16 h-16 rounded-[24px] flex items-center justify-center text-white">
            <Lock size={28} />
            <div className="absolute -top-1 -right-1 bg-blue-500 p-1 rounded-full ring-2 ring-white">
              <Zap size={10} className="text-white fill-white" />
            </div>
         </div>
         <div>
           <h2 className="text-xl font-black text-slate-900 tracking-tight">Zero-Knowledge Chat</h2>
           <p className="text-slate-400 text-[11px] font-bold uppercase mt-1">Temporary Encrypted Room</p>
         </div>

         <div className="space-y-3">
            <button 
              onClick={async () => { 
                if(!password) { setError('请输入密码作为密钥'); return; }
                setLoading(true); 
                const res = await request<any>(apiBase, '/api/create-room'); 
                if (res.code === 200) setActiveRoom(res.roomCode!); 
                else setError(res.msg || '连接失败'); 
                setLoading(false); 
              }}
              disabled={loading} 
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
              <span>New Room</span>
            </button>
            <button onClick={() => setShowProtocol(true)} className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center space-x-1 mx-auto">
              <HelpCircle size={12} />
              <span>Security Protocol</span>
            </button>
         </div>
      </div>

      {/* Join Form */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-[32px] border border-white shadow-sm space-y-4">
         <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl px-3 py-2">
               <label className="text-[8px] font-black text-slate-400 uppercase">Room Code</label>
               <input type="text" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="6-CHAR" className="w-full bg-transparent font-black font-mono text-sm outline-none" />
            </div>
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl px-3 py-2">
               <label className="text-[8px] font-black text-slate-400 uppercase">Key Password</label>
               <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="SECRET" className="w-full bg-transparent font-black text-sm outline-none" />
            </div>
         </div>
         <button onClick={() => { if(!roomCode || !password) return; setActiveRoom(roomCode.toUpperCase()); }} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest">
           Access Vault
         </button>
      </div>

      {/* Saved Chips */}
      {savedRooms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
             <div className="flex items-center space-x-1.5">
               <History size={10} className="text-slate-400" />
               <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">History</span>
             </div>
             <button onClick={() => setSavedRooms([])} className="text-[8px] font-bold text-slate-300">Clear</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedRooms.map((room) => (
              <div key={room.code} onClick={() => handleQuickJoin(room)} className="flex items-center bg-white border border-slate-100 rounded-full px-3 py-1.5 cursor-pointer hover:border-blue-200 transition-all">
                <span className="text-[10px] font-black font-mono mr-2">{room.code}</span>
                <button onClick={(e) => removeSavedRoom(e, room.code)} className="text-slate-300 hover:text-red-400"><X size={10} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomView;
