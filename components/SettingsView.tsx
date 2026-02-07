
import React from 'react';
import { Info, ShieldCheck, Trash2, RefreshCw, ChevronRight } from 'lucide-react';

interface SettingsViewProps {
  apiBase: string;
  setApiBase: (url: string) => void;
  defaultApi: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ setApiBase, defaultApi }) => {
  
  const handleReset = () => {
    if (window.confirm('Wipe all local data and configurations? Current link will be terminated.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center py-4 space-y-2">
         <div className="inline-block bg-white p-4 rounded-[28px] shadow-xl border border-slate-200 shadow-slate-200/50 mb-2">
            <ShieldCheck size={40} className="text-blue-600" strokeWidth={2.5} />
         </div>
         <h2 className="text-2xl font-black text-slate-900 tracking-tight">Privacy Vault</h2>
         <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">System Compliance: v1.3.0</p>
      </div>

      {/* Info Cards */}
      <div className="space-y-3">
        {[
          { title: "Stateless Node", desc: "No identity logs or IP tracking.", color: "text-blue-600", icon: Info },
          { title: "Global Vanish", desc: "Messages auto-deleted within 12h.", color: "text-emerald-600", icon: Info },
          { title: "Tunnel Encryption", desc: "End-to-end transport protocol.", color: "text-indigo-600", icon: Info }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-5 rounded-[28px] border border-slate-200/60 shadow-sm flex items-start space-x-4">
            <div className={`mt-1 ${item.color}`}><item.icon size={18} strokeWidth={2.5}/></div>
            <div>
              <h4 className="text-[13px] font-black uppercase text-slate-800 tracking-tighter">{item.title}</h4>
              <p className="text-slate-500 text-[12px] font-medium leading-snug mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Management */}
      <div className="bg-slate-900 rounded-[40px] p-2 shadow-2xl shadow-slate-900/30 overflow-hidden">
        <button 
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-[32px] transition-all text-white active:scale-95"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl text-blue-400"><RefreshCw size={20} /></div>
            <span className="font-bold text-[13px] tracking-tight">Synchronize Cloud Node</span>
          </div>
          <ChevronRight size={18} className="text-white/20" />
        </button>

        <div className="h-1 bg-white/5 mx-6" />

        <button 
          onClick={handleReset}
          className="w-full flex items-center justify-between p-5 bg-transparent hover:bg-red-500/10 rounded-[32px] transition-all text-red-400 active:scale-95"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/10 rounded-xl"><Trash2 size={20} /></div>
            <span className="font-bold text-[13px] tracking-tight text-red-400">Wipe Local Cache</span>
          </div>
          <ChevronRight size={18} className="text-red-500/20" />
        </button>
      </div>

      <div className="text-center pt-4 opacity-20 select-none">
         <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900">End Transmission</p>
      </div>
    </div>
  );
};

export default SettingsView;
