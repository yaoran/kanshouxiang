'use client';

import { useState } from 'react';
import { X, MessageCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleWeChatLogin = () => {
    setLoading(true);
    // 直接跳转到后端微信登录接口
    window.location.href = '/api/auth/wechat/login';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-8 bg-[#121212] border border-[#333] rounded-2xl shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#666] hover:text-[#D4B483] transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#D4B483] font-serif">登录账号</h2>
            <p className="text-[#666] text-sm mt-2">登录以保存您的测算记录和额度</p>
          </div>

          <button
            onClick={handleWeChatLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-[#07C160] hover:bg-[#06ad56] text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-[#07C160]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-6 h-6 fill-current" />
            {loading ? '正在跳转微信...' : '微信扫码登录'}
          </button>

          <p className="text-xs text-[#444]">
            登录即代表您同意我们的服务条款和隐私政策<br/>
            (将为您创建关联的影子账号)
          </p>
        </div>
      </div>
    </div>
  );
}
