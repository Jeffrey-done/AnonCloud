
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { request } from '../services/api';
import { Send, PlusCircle, Copy, CheckCircle2, Image as ImageIcon, Smile, X, Maximize2 } from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '🤔', '😎', '🙄', '🔥', '✨', '👍', '🙏', '❤️', '🎉', '👋', '👀', '🌚', '🤡'];

const RoomView: React.FC<{ apiBase: string }> = ({ apiBase }) => {
  const [roomCode, setRoomCode] = useState<string>(() => localStorage.getItem('anon_last_room_input') || '');
  const [activeRoom, setActiveRoom] = useState<string>(() => localStorage.getItem('anon_active_room') || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('anon_active_room', activeRoom);
    localStorage.setItem('anon_last_room_input', roomCode);
  }, [activeRoom, roomCode]);

  useEffect(() => {
    let interval: any;
    if (activeRoom) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3500);
    }
    return () => clearInterval(interval);
  }, [activeRoom, apiBase]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchMessages = async () => {
    const res = await request<Message[]>(apiBase, `/api/get-msg?roomCode=${activeRoom}`);
    if (res.code === 200 && res.data) {
      setMessages(res.data);
    } else if (res.code === 404) {
      setActiveRoom('');
    }
  };

  const sendMessage = async (content?: string, type: MessageType = 'text') => {
    const payload = content !== undefined ? content : inputMsg;
    if (!payload.trim() || !activeRoom) return;
    
    const res = await request<any>(apiBase, '/api/send-msg', 'POST', { 
      roomCode: activeRoom, 
      msg: payload, 
      type
    });
    
    if (res.code === 200) {
      if (content === undefined) setInputMsg('');
      fetchMessages();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const type: MessageType = file.type.startsWith('video') ? 'video' : 'image';
      await sendMessage(base64, type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderMessageContent = (m: Message) => {
    const content = (m.content || '').trim();
    const isImageData = content.startsWith('data:image/');
    const isVideoData = content.startsWith('data:video/');

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
      <div className="flex flex-col h-[calc(100vh-13rem)] overflow-hidden">
        {previewImage && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl ring-1 ring-white/10" alt="preview" />
            <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
              <X size={24} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between px-2 mb-4">
          <button 
            onClick={() => { navigator.clipboard.writeText(activeRoom); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
            className="group flex items-center space-x-2 bg-white border border-slate-200/60 px-3 py-2 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-black font-mono tracking-widest text-slate-700">{activeRoom}</span>
            {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-300 group-hover:text-slate-500" />}
          </button>
          <button onClick={() => setActiveRoom('')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 space-y-4 pb-4 scroll-smooth" onClick={() => {setShowEmoji(false);}}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-30 select-none">
              <div className="p-4 bg-slate-100 rounded-full"><PlusCircle size={32} className="text-slate-400" /></div>
              <p className="text-xs font-bold uppercase tracking-widest">Waiting for messages...</p>
            </div>
          )}
          
          {messages.map((m) => (
            <div key={m.id} className="flex flex-col items-start group animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-visible transition-all">
              <div className="flex items-end space-x-2 max-w-[85%] relative">
                <div className="relative px-4 py-3 rounded-[20px] rounded-tl-none border shadow-sm transition-all overflow-hidden bg-white border-slate-200/80 text-slate-800">
                  {renderMessageContent(m)}
                </div>
              </div>
              <span className="text-[10px] font-medium text-slate-400 mt-1.5 ml-1">{m.time}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto px-1 pb-2">
          {showEmoji && (
            <div className="absolute bottom-24 left-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-3xl shadow-2xl z-50 grid grid-cols-8 gap-2 animate-in slide-in-from-bottom-4">
              {EMOJIS.map(e => <button key={e} onClick={() => { setInputMsg(prev => prev + e); setShowEmoji(false); }} className="text-xl p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-90">{e}</button>)}
            </div>
          )}

          <div className="relative flex flex-col p-2 rounded-[32px] border transition-all duration-300 bg-white border-slate-200 shadow-xl shadow-slate-200/50">
            <div className="flex items-center">
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 rounded-full transition-all text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                <Smile size={20} />
              </button>
              
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Say something..."
                className="flex-1 border-none bg-transparent px-3 py-2.5 text-[15px] font-medium focus:ring-0 outline-none transition-colors text-slate-800 placeholder:text-slate-400"
              />
              
              <div className="flex items-center space-x-1 pr-1">
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <ImageIcon size={20} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                
                <button 
                  onClick={() => sendMessage()} 
                  className="p-3 rounded-full shadow-lg transition-all active:scale-90 bg-blue-600 text-white hover:bg-blue-700"
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
      <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-xl shadow-slate-200/50 text-center space-y-6">
         <div className="mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 w-20 h-20 rounded-[30px] flex items-center justify-center text-blue-600 shadow-inner">
            <PlusCircle size={36} strokeWidth={2.5} />
         </div>
         <div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Room</h2>
           <p className="text-slate-400 text-[13px] font-medium mt-1">Start a fresh encrypted conversation</p>
         </div>
         <button 
           onClick={async () => { setLoading(true); const res = await request<any>(apiBase, '/api/create-room'); if (res.code === 200) setActiveRoom(res.roomCode!); setLoading(false); }}
           disabled={loading} 
           className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
         >
           {loading ? 'Generating Node...' : 'Secure Launch'}
         </button>
      </div>

      <div className="bg-white/60 backdrop-blur-sm p-4 rounded-[32px] border border-white shadow-sm flex items-center space-x-2">
         <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center px-4">
            <input 
              type="text" 
              value={roomCode} 
              onChange={e => setRoomCode(e.target.value.toUpperCase())} 
              placeholder="ENTER ROOM CODE" 
              className="w-full bg-transparent py-4 text-center font-black font-mono tracking-[0.3em] outline-none text-slate-800 placeholder:text-slate-300" 
            />
         </div>
         <button 
           onClick={() => setActiveRoom(roomCode.trim().toUpperCase())} 
           className="bg-blue-600 text-white h-full px-8 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all"
         >
           Join
         </button>
      </div>
    </div>
  );
};

export default RoomView;
