'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { User, CreditCard, LogOut } from 'lucide-react';

interface UserStatusProps {
  onLoginClick: () => void;
  onRechargeClick: () => void;
  refreshTrigger: number; // Increment to force refresh
}

export default function UserStatus({ onLoginClick, onRechargeClick, refreshTrigger }: UserStatusProps) {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
      setCredits(data?.credits ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, [refreshTrigger]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCredits(null);
    window.location.reload();
  };

  if (loading) return null;

  if (!user) {
    return (
      <button 
        onClick={onLoginClick}
        className="fixed top-6 right-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-[#121212]/80 border border-[#333] text-[#D4B483] hover:bg-[#D4B483] hover:text-[#121212] transition-all backdrop-blur-sm"
      >
        <User className="w-4 h-4" />
        <span className="text-sm font-medium">登录</span>
      </button>
    );
  }

  return (
    <div className="fixed top-6 right-6 z-40 flex items-center gap-3">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#121212]/80 border border-[#333] backdrop-blur-sm">
        <div className="flex flex-col items-end">
           <span className="text-[#666] text-[10px] uppercase tracking-wider">Credits</span>
           <span className="text-[#D4B483] font-bold leading-none">{credits ?? '-'}</span>
        </div>
        <div className="w-[1px] h-6 bg-[#333]" />
        <button 
          onClick={onRechargeClick}
          className="p-1.5 rounded-full hover:bg-[#333] text-[#E0E0E0] transition-colors"
          title="充值"
        >
          <CreditCard className="w-4 h-4" />
        </button>
        <button 
          onClick={handleLogout}
          className="p-1.5 rounded-full hover:bg-[#333] text-[#666] hover:text-red-400 transition-colors"
          title="退出"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


