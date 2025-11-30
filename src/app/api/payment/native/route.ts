import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNativeOrder, isWechatPayConfigured, WECHAT_NOTIFY_URL } from '@/lib/wechat-pay';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageId } = await req.json();
    if (!packageId) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
    }

    // 1. Check Limit
    const { data: isAllowed, error: rpcError } = await supabase.rpc('check_purchase_limit', {
      p_user_id: user.id,
      p_package_id: packageId
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      return NextResponse.json({ error: 'Internal Check Error' }, { status: 500 });
    }

    if (!isAllowed) {
      return NextResponse.json({ error: '此套餐每人限购一次' }, { status: 403 });
    }

    // 2. Get Package Info
    const { data: pkg } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();
      
    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // 3. Create Order (Pending)
    const outTradeNo = `ORDER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        package_id: packageId,
        amount: pkg.price,
        status: 'pending',
        out_trade_no: outTradeNo
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order Create Error:', orderError);
      return NextResponse.json({ error: 'Order creation failed' }, { status: 500 });
    }

    // 4. Check if WeChat Pay is configured
    if (!isWechatPayConfigured()) {
      // Development Mock if Wechat Pay is not configured
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ 
          code_url: 'https://example.com/mock_qr_code', 
          mock_order_id: order.id,
          message: 'Mock Mode: Wechat Pay not configured' 
        });
      }
      return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
    }

    // 5. Call WeChat Native Pay
    const result = await createNativeOrder({
      description: `手相分析 - ${pkg.name}`,
      outTradeNo,
      totalAmount: Math.round(pkg.price * 100), // 转为分
      notifyUrl: WECHAT_NOTIFY_URL,
    });
    
    if (result.code_url) {
      return NextResponse.json({ code_url: result.code_url, out_trade_no: outTradeNo });
    } else {
      console.error('WeChat Pay Error:', result.error);
      return NextResponse.json({ error: result.error || 'Payment initialization failed' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Payment API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
