
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { deriveKey, encryptContent, decryptContent } from '../services/crypto';
import { 
  Send, UserPlus, Fingerprint, Lock, Copy, CheckCircle2, Check, 
  Image as ImageIcon, Smile, X, Maximize2, Mic, Square, Play, ShieldAlert, Key
} from 'lucide-react';

const EMOJIS = ['❤️', '✨', '🔥', '😂', '😭', '🤡', '💀', '💯', '👌', '👀', '🤫', '🌹'];

const FriendView: React.FC<{ apiBase: string }> = ({ apiBase }) => {
  const [myCode, setMyCode] = useState<string>(() => localStorage.getItem('anon_my_friend_code') || '');
  const [targetCode, setTargetCode] = useState<string>(() => localStorage.getItem('anon_target_friend_code') || '');
  const [sharedKey, setSharedKey] = useState<string>(() => localStorage.getItem('anon_friend_shared_key') || '');
  const [isPaired, setIsPaired] = useState<boolean>(() => localStorage.getItem('anon_friend_paired') === 'true');
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('anon_my_friend_code', myCode);
    localStorage.setItem('anon_target_friend_code', targetCode);
    localStorage.setItem('anon_friend_shared_key', sharedKey);
    localStorage.setItem('anon_friend_paired', String(isPaired));
    
    if (isPaired && sharedKey) {
      initCrypto();
    }
  }, [myCode, targetCode, isPaired, sharedKey]);

  const initCrypto = async () => {
    try {
      // 私聊密钥使用 双方 ID 排序后的组合 + 共享密码 派生
      const salt = [myCode, targetCode].sort().join(':');
      const key = await deriveKey(salt, sharedKey);
      setCryptoKey(key);
    } catch (e) {
      console.error('Key derivation failed');
    }
  };

  useEffect(() => {
    let interval: any;
    if (isPaired && cryptoKey) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3500);
    }
    return () => clearInterval(interval);
  }, [isPaired, cryptoKey, myCode, targetCode]);

  const fetchMessages = async () => {
    const res = await request<Message[]>(apiBase, `/api/get-friend-msg?myCode=${myCode}&targetCode=${targetCode}`);
    if (res.code === 200 && res.data && cryptoKey) {
      const decryptedMsgs = await Promise.all(res.data.map(async (m) => {
        const decrypted = await decryptContent(cryptoKey, m.content);
        return { ...m, content: decrypted || '🔒 [无法解密的私密内容]' };
      }));
      setMessages(decryptedMsgs);
    }
  };

  const sendMessage = async (content?: string, type: MessageType = 'text') => {
    const payload = content !== undefined ? content : inputMsg;
    if (!payload.trim() || !isPaired || !cryptoKey) return;
    
    const encrypted = await encryptContent(cryptoKey, payload);
    const res = await request<any>(apiBase, '/api/send-friend-msg', 'POST', { 
      myCode, 
      targetCode, 
      msg: encrypted, 
      type
    });
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
      mediaRecorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => sendMessage(reader.result as string, 'audio');
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) { alert('无法访问麦克风'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const renderMessageContent = (m: Message, isMe: boolean) => {
    const content = (m.content || '').trim();
    if (content.includes('[无法解密的私密内容]')) {
      return <div className="text-xs italic opacity-50 flex items-center"><ShieldAlert size={12} className="mr-1"/> 密钥不匹配或已损坏</div>;
    }

    if (m.type === 'audio' || content.startsWith('data:audio/')) {
      return (
        <button onClick={() => new Audio(content).play()} className={`flex items-center space-x-2 p-2 rounded-xl ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
          <Play size={14} fill="currentColor" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Encrypted Voice</span>
        </button>
      );
    }
    
    if (m.type === 'image' || content.startsWith('data:image/')) {
      return <img src={content} className="rounded-2xl max-w-full max-h-[300px] object-cover shadow-md" alt="media" onClick={() => setPreviewImage(content)} />;
    }

    return <p className={`text-[14px] leading-relaxed break-all ${isMe ? 'text-white' : 'text-slate-800'}`}>{m.content}</p>;
  };

  if (isPaired) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl" alt="preview" />
          </div>
        )}

        <div className="flex items-center justify-between px-2 mb-4">
          <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-200/60">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-black text-slate-700 text-xs tracking-widest uppercase">{targetCode}</h3>
          </div>
          <button onClick={() => { setIsPaired(false); setCryptoKey(null); }} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 space-y-6 pb-4">
          {messages.map((m) => {
            const isMe = m.sender === myCode;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-in fade-in`}>
                <div className={`relative px-4 py-3 rounded-[24px] shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200/80 rounded-tl-none'}`}>
                  {renderMessageContent(m, isMe)}
                </div>
                <div className="flex items-center mt-1.5 space-x-1.5 px-1">
                  <span className="text-[9px] font-black text-slate-300 uppercase">{m.time}</span>
                  {isMe && <Check size={10} className={m.read ? "text-emerald-500" : "text-slate-200"} strokeWidth={3}/>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto px-1 pb-2">
          <div className="relative flex flex-col p-2 rounded-[32px] bg-slate-900 border-slate-800 shadow-2xl">
            <div className="flex items-center">
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 text-white/50 hover:text-white"><Smile size={20} /></button>
              <input 
                type="text" 
                value={inputMsg} 
                onChange={e => setInputMsg(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                placeholder={isRecording ? "Recording..." : "Private message..."} 
                className="flex-1 bg-transparent border-none px-3 py-2.5 text-white outline-none" 
              />
              <div className="flex items-center pr-1">
                <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-2.5 rounded-full transition-all ${isRecording ? 'text-red-500' : 'text-white/50 hover:text-white'}`}>
                  {isRecording ? <Square size={20} /> : <Mic size={20} />}
                </button>
                <button onClick={() => sendMessage()} className="p-3 rounded-full bg-blue-600 text-white active:scale-90"><Send size={18} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-xl space-y-6">
        <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2"><Fingerprint className="text-blue-600" /><span>Pair Nodes</span></h2>
        <div className="space-y-4">
          <div className="bg-slate-50 border rounded-2xl p-1 flex items-center">
             <div className="p-3 text-slate-400"><Fingerprint size={18}/></div>
             <input type="text" value={myCode} onChange={e => setMyCode(e.target.value.toUpperCase())} placeholder="MY CODE" className="w-full bg-transparent py-4 font-mono text-xs tracking-widest outline-none" />
          </div>
          <div className="bg-slate-50 border rounded-2xl p-1 flex items-center">
             <div className="p-3 text-slate-400"><Lock size={18}/></div>
             <input type="text" value={targetCode} onChange={e => setTargetCode(e.target.value.toUpperCase())} placeholder="TARGET CODE" className="w-full bg-transparent py-4 font-mono text-xs tracking-widest outline-none" />
          </div>
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-1 flex items-center">
             <div className="p-3 text-blue-400"><Key size={18}/></div>
             <input type="password" value={sharedKey} onChange={e => setSharedKey(e.target.value)} placeholder="SHARED SECRET KEY" className="w-full bg-transparent py-4 font-bold text-xs outline-none text-blue-900" />
          </div>
          <button 
            onClick={async () => { 
              if(!myCode || !targetCode || !sharedKey) return;
              const res = await request<any>(apiBase, '/api/add-friend', 'POST', { myCode, targetCode }); 
              if (res.code === 200) setIsPaired(true); 
            }} 
            className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest active:scale-[0.98] transition-all shadow-lg"
          >
            Establish Secure Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendView;
