
import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { request } from '../services/api';
import { Send, UserPlus, Fingerprint, Lock, Copy, CheckCircle2 } from 'lucide-react';

interface FriendViewProps {
  apiBase: string;
}

const FriendView: React.FC<FriendViewProps> = ({ apiBase }) => {
  const [myCode, setMyCode] = useState<string>(() => localStorage.getItem('anon_my_friend_code') || '');
  const [targetCode, setTargetCode] = useState<string>('');
  const [isPaired, setIsPaired] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (myCode) localStorage.setItem('anon_my_friend_code', myCode);
  }, [myCode]);

  useEffect(() => {
    let interval: any;
    if (isPaired && myCode && targetCode) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [isPaired, myCode, targetCode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const res = await request<Message[]>(apiBase, `/api/get-friend-msg?myCode=${myCode}&targetCode=${targetCode}`);
    if (res.code === 200 && res.data) {
      setMessages(res.data);
    }
  };

  const createMyCode = async () => {
    const res = await request<any>(apiBase, '/api/create-friend-code');
    if (res.code === 200 && res.friendCode) {
      setMyCode(res.friendCode);
    } else {
      alert(res.msg || '生成失败');
    }
  };

  const startChat = async () => {
    if (!myCode || !targetCode) return alert('请输入双方编码');
    const res = await request<any>(apiBase, '/api/add-friend', 'POST', { myCode, targetCode });
    if (res.code === 200) {
      setIsPaired(true);
      fetchMessages();
    } else {
      alert(res.msg || '添加失败');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendMessage = async () => {
    if (!inputMsg.trim() || !isPaired) return;
    const res = await request<any>(apiBase, '/api/send-friend-msg', 'POST', {
      myCode,
      targetCode,
      msg: inputMsg,
    });
    if (res.code === 200) {
      setInputMsg('');
      fetchMessages();
    } else {
      alert(res.msg || '发送失败');
    }
  };

  if (isPaired) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="bg-white p-3 rounded-t-xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock size={16} className="text-blue-600" />
            <h3 className="font-semibold text-slate-700 text-sm truncate max-w-[150px]">
              对私密好友: {targetCode}
            </h3>
          </div>
          <button 
            onClick={() => setIsPaired(false)} 
            className="text-xs text-slate-400 hover:text-slate-600 font-medium"
          >
            断开连接
          </button>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 bg-white border-x border-slate-200 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <Lock size={32} strokeWidth={1.5} />
              <p className="text-sm">点对点加密隧道已建立</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="flex flex-col items-start max-w-[90%]">
                <div className="bg-blue-50 rounded-2xl rounded-tl-none p-3 shadow-sm border border-blue-100">
                  <p className="text-slate-800 text-sm whitespace-pre-wrap">{m.content}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 ml-1">{m.time}</span>
              </div>
            ))
          )}
        </div>

        <div className="bg-white p-3 rounded-b-xl border border-slate-200 flex items-center space-x-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="私密发送..."
            className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors shadow-md active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-blue-600">
          <Fingerprint size={20} />
          <h2 className="text-lg font-bold">我的唯一编码</h2>
        </div>
        
        {myCode ? (
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-slate-700 flex justify-center items-center">
              {myCode}
            </div>
            <button 
              onClick={copyCode}
              className="bg-slate-100 p-3 rounded-xl text-slate-500 hover:text-blue-600 transition-colors"
            >
              {copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}
            </button>
          </div>
        ) : (
          <button
            onClick={createMyCode}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-semibold hover:bg-slate-900 transition-all"
          >
            点击生成我的编码
          </button>
        )}
        <p className="text-[11px] text-slate-400 text-center italic">将此编码发送给对方，对方填入后即可开始 1v1 私聊。</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-700">
          <UserPlus size={20} />
          <h2 className="text-lg font-bold">添加好友聊天</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">我的编码</label>
            <input
              type="text"
              value={myCode}
              onChange={(e) => setMyCode(e.target.value)}
              placeholder="请输入或先生成你的编码"
              className="w-full bg-slate-100 border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">对方编码</label>
            <input
              type="text"
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value)}
              placeholder="输入对方分享的编码"
              className="w-full bg-slate-100 border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={startChat}
            disabled={!myCode || !targetCode}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-40 disabled:shadow-none"
          >
            开始私密对话
          </button>
        </div>
      </div>
      
      <div className="bg-slate-800 text-slate-300 p-4 rounded-xl text-xs space-y-2">
         <p className="flex items-center space-x-2 text-blue-400 font-bold uppercase tracking-tighter">
           <Lock size={14} /> <span>Security Notice</span>
         </p>
         <p>
           1v1 聊天关系基于临时键值对。好友关系有效期 7 天。消息记录 12 小时后由 Cloudflare KV TTL 自动物理删除，任何人都无法恢复。
         </p>
      </div>
    </div>
  );
};

export default FriendView;
