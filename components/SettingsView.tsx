
import React from 'react';
import { Settings, ExternalLink, ShieldCheck, Database, HelpCircle } from 'lucide-react';

interface SettingsViewProps {
  apiBase: string;
  setApiBase: (url: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ apiBase, setApiBase }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-700">
          <Settings size={20} />
          <h2 className="text-lg font-bold">接口配置</h2>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500">Cloudflare Worker 地址</label>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://your-worker.dev"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
          />
          <p className="text-[10px] text-slate-400">
            如果您部署了专属后端，请在此处填入 Worker 访问地址。
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-700">
          <HelpCircle size={20} />
          <h2 className="text-lg font-bold">关于本程序</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="bg-green-100 p-2 rounded-lg text-green-600 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">100% 匿名隐私</h4>
              <p className="text-xs text-slate-500 mt-1">
                无任何用户信息收集，无需注册，所有通讯基于随机编码标识。
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
              <Database size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">自动清理技术</h4>
              <p className="text-xs text-slate-500 mt-1">
                利用 Cloudflare KV 的 TTL 特性，过期数据将被物理移除，无痕迹残留。
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-600 shrink-0">
              <ExternalLink size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">开源与原生</h4>
              <p className="text-xs text-slate-500 mt-1">
                基于 Cloudflare 免费原生服务，支持 Pages、Workers 和 KV 快速部署。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center p-4">
        <p className="text-[10px] text-slate-400 font-medium">VERSION 1.0.0 (STABLE)</p>
        <p className="text-[10px] text-slate-300">Powered by Cloudflare Pages & Workers</p>
      </div>
    </div>
  );
};

export default SettingsView;
