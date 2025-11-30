'use client';

import { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

interface Package {
  id: number;
  name: string;
  price: number;
  credits: number;
  limit_per_user: number | null;
}

const PACKAGES: Package[] = [
  { id: 1, name: '体验套餐', price: 5.90, credits: 2, limit_per_user: 1 },
  { id: 2, name: '标准套餐', price: 39.90, credits: 8, limit_per_user: null },
  { id: 3, name: '尊享套餐', price: 99.90, credits: 25, limit_per_user: null },
];

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<Package>(PACKAGES[1]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);

  // Reset state when closed/opened
  useEffect(() => {
    if (isOpen) {
      setQrCodeUrl(null);
      setOrderNo(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Poll for order status
  useEffect(() => {
    if (!orderNo || !isOpen) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?out_trade_no=${orderNo}`);
        const data = await res.json();
        if (data.status === 'paid') {
          clearInterval(timer);
          onSuccess();
          onClose();
          alert('支付成功！次数已到账。');
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [orderNo, isOpen, onSuccess, onClose]);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/native', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selectedPackage.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '支付请求失败');
      }

      if (data.code_url) {
        const qrDataUrl = await QRCode.toDataURL(data.code_url);
        setQrCodeUrl(qrDataUrl);
        setOrderNo(data.out_trade_no);
      } else if (data.mock_order_id) {
          // Mock mode: 模拟二维码，其实什么都没有，只是为了演示
          setOrderNo(data.out_trade_no || 'mock_order');
          setQrCodeUrl('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MockPayment');
          
          // 模拟后端回调成功 (仅限开发环境)
          setTimeout(async () => {
            if (process.env.NODE_ENV === 'development') {
               await fetch('/api/payment/mock-success', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ out_trade_no: data.out_trade_no })
               });
            }
          }, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl p-6 md:p-8 bg-[#121212] border border-[#333] rounded-2xl shadow-2xl flex flex-col md:flex-row gap-8">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#666] hover:text-[#D4B483] transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Left: Package Selection */}
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#D4B483] font-serif">选择套餐</h2>
            <p className="text-[#666] text-sm mt-2">解锁更深度的手相解析服务</p>
          </div>

          <div className="space-y-4">
            {PACKAGES.map((pkg) => (
              <div 
                key={pkg.id}
                onClick={() => {
                    setSelectedPackage(pkg);
                    setQrCodeUrl(null);
                    setError(null);
                }}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPackage.id === pkg.id 
                    ? 'border-[#D4B483] bg-[#D4B483]/5' 
                    : 'border-[#333] hover:border-[#D4B483]/50'
                }`}
              >
                {selectedPackage.id === pkg.id && (
                  <div className="absolute top-[-2px] right-[-2px] bg-[#D4B483] text-black rounded-bl-lg rounded-tr-lg p-1">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className="flex justify-between items-center">
                   <div>
                     <h3 className="text-[#E0E0E0] font-bold">{pkg.name}</h3>
                     <p className="text-[#666] text-xs mt-1">可测 {pkg.credits} 次 {pkg.limit_per_user ? `(限购 ${pkg.limit_per_user} 次)` : ''}</p>
                   </div>
                   <div className="text-[#D4B483] font-bold text-xl">
                     ¥{pkg.price}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Payment QR */}
        <div className="flex-1 bg-[#000] rounded-xl border border-[#333] flex flex-col items-center justify-center p-8 min-h-[300px]">
           {loading ? (
             <div className="text-center space-y-4">
               <Loader2 className="w-10 h-10 text-[#D4B483] animate-spin mx-auto" />
               <p className="text-[#666] text-sm">正在创建订单...</p>
             </div>
           ) : qrCodeUrl ? (
             <div className="text-center space-y-4 animate-fade-in">
               <p className="text-[#E0E0E0] font-medium">微信扫码支付</p>
               <div className="bg-white p-2 rounded-lg inline-block">
                 <img src={qrCodeUrl} alt="Payment QR" className="w-48 h-48" />
               </div>
               <p className="text-[#D4B483] font-bold text-xl">¥{selectedPackage.price}</p>
               <p className="text-[#666] text-xs">支付成功后自动充值</p>
             </div>
           ) : (
             <div className="text-center space-y-6">
               <div className="space-y-2">
                 <p className="text-[#E0E0E0] text-lg">确认购买</p>
                 <p className="text-[#D4B483] text-3xl font-bold">¥{selectedPackage.price}</p>
               </div>
               
               {error && <p className="text-red-400 text-sm max-w-[200px] mx-auto">{error}</p>}

               <button
                 onClick={handlePay}
                 className="px-8 py-3 bg-[#07C160] hover:bg-[#06ad56] text-white rounded-full font-bold transition-all shadow-lg hover:shadow-[#07C160]/20"
               >
                 立即支付
               </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

