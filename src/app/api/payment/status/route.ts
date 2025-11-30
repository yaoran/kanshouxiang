import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');
  const outTradeNo = searchParams.get('out_trade_no');

  if (!orderId && !outTradeNo) {
    return NextResponse.json({ error: 'Missing order identifier' }, { status: 400 });
  }

  const supabase = await createClient();
  let query = supabase.from('orders').select('status').single();
  
  if (orderId) query = query.eq('id', orderId);
  else if (outTradeNo) query = query.eq('out_trade_no', outTradeNo);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ status: data.status });
}


