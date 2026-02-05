
import React from 'react';
import { X, ShieldCheck, Lock, Zap, EyeOff, Globe, ServerOff } from 'lucide-react';

interface ProtocolInfoProps {
  onClose: () => void;
}

const ProtocolInfo: React.FC<ProtocolInfoProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="text-blue-600" size={24} />
            <h2 className="text-xl font-black text-slate-900">安全协议说明</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <section className="space-y-3">
            <div className="flex items-center space-x-2 text-indigo-600">
              <Lock size={18} strokeWidth={2.5} />
              <h3 className="font-black text-sm uppercase tracking-wider">端到端加密 (E2EE)</h3>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              您的消息在离开设备前，会使用浏览器原生的 <b>AES-256-GCM</b> 算法进行加密。房间密码仅存在于您的本地内存中，永不上传。即使服务器被入侵，黑客也只能看到无意义的随机字符。
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center space-x-2 text-emerald-600">
              <ServerOff size={18} strokeWidth={2.5} />
              <h3 className="font-black text-sm uppercase tracking-wider">零知识存储</h3>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              系统不设数据库，所有数据存储在 Cloudflare 全球边缘网络的临时缓存中。由于我们无法解密内容，我们对您的聊天内容保持“零知识”。
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center space-x-2 text-amber-600">
              <EyeOff size={18} strokeWidth={2.5} />
              <h3 className="font-black text-sm uppercase tracking-wider">完全匿名性</h3>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              无需注册、无需手机号、无需邮箱。房间号和密码是唯一的访问凭证。退出房间或清除缓存后，您的身份指纹将彻底消失。
            </p>
          </section>

          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
            <h4 className="text-blue-900 font-bold text-sm mb-2">💡 安全建议</h4>
            <ul className="text-blue-800/80 text-xs space-y-2 list-disc pl-4">
              <li>建议使用包含字母、数字和符号的复杂密码。</li>
              <li>不同房间请使用不同的密码以实现物理隔离。</li>
              <li>请确保在隐私窗口或受信任的浏览器中进行会话。</li>
            </ul>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-slate-200"
          >
            我已了解
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProtocolInfo;
