import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  // 仅限开发环境使用
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const { out_trade_no } = await req.json();

  if (!out_trade_no) {
    return NextResponse.json({ error: 'Missing out_trade_no' }, { status: 400 });
  }

  const supabase = createAdminClient();
  
  // 模拟回调成功的 RPC 调用
  const { error } = await supabase.rpc('handle_payment_success', {
    p_out_trade_no: out_trade_no
  });

  if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Mock payment processed' });
}


