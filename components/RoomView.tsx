
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { deriveKey, encryptContent, decryptContent } from '../services/crypto';
import ProtocolInfo from './ProtocolInfo';
import { 
  Send, PlusCircle, Copy, CheckCircle2, Image as ImageIcon, 
  Smile, X, Maximize2, AlertCircle, Loader2, Lock, Unlock, HelpCircle, Zap,
  Mic, Square, Play, Pause, QrCode
} from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '🤔', '😎', '🙄', '🔥', '✨', '👍', '🙏', '❤️', '🎉', '👋', '👀', '🌚', '🤫'];

const RoomView: React.FC<{ apiBase: string }> = ({ apiBase }) => {
  const [roomCode, setRoomCode] = useState<string>(() => localStorage.getItem('anon_last_room_input') || '');
  const [password, setPassword] = useState<string>(() => localStorage.getItem('anon_last_room_pass') || '');
  const [activeRoom, setActiveRoom] = useState<string>(() => localStorage.getItem('anon_active_room') || '');
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 语音相关
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('anon_active_room', activeRoom);
    localStorage.setItem('anon_last_room_input', roomCode);
    localStorage.setItem('anon_last_room_pass', password);
    
    if (activeRoom && password) {
      initCrypto();
    }
  }, [activeRoom, roomCode, password]);

  const initCrypto = async () => {
    try {
      const key = await deriveKey(activeRoom, password);
      setCryptoKey(key);
    } catch (e) {
      setError('密钥初始化失败');
    }
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
      fetchMessages();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendMessage(base64Audio, 'audio');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('无法访问麦克风');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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
    
    if (m.type === 'audio' || content.startsWith('data:audio/')) {
      return (
        <div className="flex items-center space-x-3 bg-slate-100/50 p-3 rounded-2xl min-w-[160px]">
          <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-all" onClick={() => {
            const audio = new Audio(content);
            audio.play();
          }}>
            <Play size={16} fill="currentColor" />
          </button>
          <div className="flex-1 space-y-1">
            <div className="h-1.5 bg-slate-200 rounded-full w-full overflow-hidden">
              <div className="h-full bg-blue-400 w-1/3 animate-pulse" />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Encrypted Voice</p>
          </div>
        </div>
      );
    }

    const isImageData = content.startsWith('data:image/');
    const isVideoData = content.startsWith('data:video/');

    if (m.type === 'image' || isImageData) {
      return <img src={content} className="rounded-2xl max-w-full max-h-[320px] object-cover cursor-zoom-in shadow-md" alt="media" onClick={() => setPreviewImage(content)} />;
    }
    
    if (m.type === 'video' || isVideoData) {
      return <video src={content} controls className="rounded-2xl max-w-full max-h-[320px] shadow-md border border-slate-200" />;
    }

    return <p className="text-[14px] leading-relaxed break-all whitespace-pre-wrap">{m.content}</p>;
  };

  if (activeRoom) {
    return (
      <div className="flex flex-col h-[calc(100vh-13rem)] overflow-hidden">
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl" alt="preview" />
          </div>
        )}

        <div className="flex flex-col mb-4 space-y-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => { navigator.clipboard.writeText(activeRoom); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                className="flex items-center space-x-2 bg-white border border-slate-200/60 px-3 py-2 rounded-2xl shadow-sm hover:shadow-md transition-all"
              >
                <span className="text-xs font-black font-mono tracking-widest text-slate-700">{activeRoom}</span>
                {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-300" />}
              </button>
              <div className="flex items-center space-x-1.5 bg-blue-50 border border-blue-100 px-3 py-2 rounded-2xl text-blue-600">
                <Lock size={12} strokeWidth={3} />
                <span className="text-[10px] font-black uppercase tracking-tight">E2EE ACTIVE</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
               <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                  <QrCode size={20} />
               </button>
               <button onClick={() => { setActiveRoom(''); setCryptoKey(null); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <X size={20} />
               </button>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 space-y-4 pb-4 scroll-smooth">
          {messages.map((m) => (
            <div key={m.id} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="relative px-4 py-3 rounded-[20px] rounded-tl-none border shadow-sm bg-white border-slate-200/80 text-slate-800">
                {renderMessageContent(m)}
              </div>
              <div className="flex items-center mt-1.5 ml-1 space-x-1.5">
                <span className="text-[10px] font-medium text-slate-400">{m.time}</span>
                <Lock size={8} className="text-slate-300" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto px-1 pb-2">
          {showEmoji && (
            <div className="absolute bottom-24 left-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-3xl shadow-2xl z-50 grid grid-cols-8 gap-2">
              {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(prev => prev + e); setShowEmoji(false); }} className="text-xl p-2 hover:bg-slate-100 rounded-xl">{e}</button>)}
            </div>
          )}

          <div className="relative flex flex-col p-2 rounded-[32px] border transition-all duration-300 bg-white border-slate-200 shadow-xl">
            <div className="flex items-center">
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 rounded-full text-slate-400 hover:text-blue-600">
                <Smile size={20} />
              </button>
              
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isRecording ? "Recording encrypted audio..." : "Secure message..."}
                disabled={isRecording}
                className="flex-1 border-none bg-transparent px-3 py-2.5 text-[15px] font-medium focus:ring-0 outline-none text-slate-800"
              />
              
              <div className="flex items-center space-x-1 pr-1">
                <button 
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`p-2.5 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={20} />}
                </button>

                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full text-slate-400 hover:text-slate-600">
                  <ImageIcon size={20} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const type: MessageType = file.type.startsWith('video') ? 'video' : 'image';
                    await sendMessage(ev.target?.result as string, type);
                  };
                  reader.readAsDataURL(file);
                }} />
                
                <button 
                  onClick={() => sendMessage()} 
                  disabled={loading || (!inputMsg.trim() && !isRecording)}
                  className="p-3 rounded-full shadow-lg bg-blue-600 text-white active:scale-90 disabled:opacity-50"
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
    <div className="space-y-6 max-w-md mx-auto">
      {showProtocol && <ProtocolInfo onClose={() => setShowProtocol(false)} />}
      <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-xl shadow-slate-200/50 text-center space-y-6">
         <div className="relative mx-auto bg-gradient-to-br from-slate-900 to-indigo-950 w-20 h-20 rounded-[30px] flex items-center justify-center text-white shadow-2xl">
            <Lock size={36} strokeWidth={2.5} />
            <div className="absolute -top-2 -right-2 bg-blue-500 p-1.5 rounded-full ring-4 ring-white">
              <Zap size={12} className="text-white fill-white" />
            </div>
         </div>
         <div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">Zero-Knowledge Chat</h2>
           <p className="text-slate-400 text-[13px] font-medium mt-1">Deploy an encrypted transient room</p>
         </div>
         <div className="space-y-3">
            <button 
              onClick={async () => { 
                if(!password) { setError('请设置房间密码以派生密钥'); return; }
                setError(null); setLoading(true); 
                const res = await request<any>(apiBase, '/api/create-room'); 
                if (res.code === 200) setActiveRoom(res.roomCode!); 
                setLoading(false); 
              }}
              disabled={loading} 
              className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl"
            >
              {loading ? 'GENERATING...' : 'New Secure Room'}
            </button>
            <button onClick={() => setShowProtocol(true)} className="flex items-center justify-center space-x-2 text-slate-400 text-[11px] font-bold uppercase tracking-widest mx-auto">
              <HelpCircle size={14} />
              <span>Security Protocol</span>
            </button>
         </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] border border-white shadow-sm space-y-4">
         <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex flex-col">
               <label className="text-[9px] font-black text-slate-400 uppercase mb-1">Room Code</label>
               <input type="text" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="6-CHAR ID" className="bg-transparent font-black font-mono tracking-widest outline-none text-slate-800" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex flex-col">
               <label className="text-[9px] font-black text-slate-400 uppercase mb-1">Key Password</label>
               <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="SECRET" className="bg-transparent font-black outline-none text-slate-800" />
            </div>
         </div>
         <button onClick={() => { if(!roomCode || !password) return; setActiveRoom(roomCode.trim().toUpperCase()); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
           <Unlock size={14} className="inline mr-2" /> Access Vault
         </button>
      </div>
    </div>
  );
};

export default RoomView;
