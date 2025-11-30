import { NextResponse } from 'next/server';
import { verifyWebhookSignature, decryptResource, isWechatPayConfigured } from '@/lib/wechat-pay';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    if (!isWechatPayConfigured()) {
      return NextResponse.json({ code: 'FAIL', message: 'Config missing' }, { status: 500 });
    }

    const timestamp = req.headers.get('wechatpay-timestamp') || '';
    const nonce = req.headers.get('wechatpay-nonce') || '';
    const signature = req.headers.get('wechatpay-signature') || '';
    const serial = req.headers.get('wechatpay-serial') || '';
    const body = await req.text(); // Raw body needed for verification

    // Verify Signature
    const isVerified = verifyWebhookSignature(timestamp, nonce, body, signature, serial);

    if (!isVerified) {
      console.error('WeChat Webhook Signature Verification Failed');
      return NextResponse.json({ code: 'FAIL', message: 'Signature error' }, { status: 401 });
    }

    const bodyObj = JSON.parse(body);
    
    // Decrypt Resource
    if (bodyObj.resource) {
      const { ciphertext, nonce: resourceNonce, associated_data } = bodyObj.resource;
      
      try {
        const result = decryptResource(ciphertext, resourceNonce, associated_data);

        if (result.trade_state === 'SUCCESS') {
          const outTradeNo = result.out_trade_no;
          console.log(`Payment Success: ${outTradeNo}`);

          // Call RPC to update order and credits
          const supabase = createAdminClient();
          const { error } = await supabase.rpc('handle_payment_success', {
            p_out_trade_no: outTradeNo
          });

          if (error) {
            console.error('Webhook RPC Error:', error);
            return NextResponse.json({ code: 'FAIL', message: 'DB Update Failed' }, { status: 500 });
          }
        }
      } catch (decryptError) {
        console.error('Decrypt Error:', decryptError);
        return NextResponse.json({ code: 'FAIL', message: 'Decrypt failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ code: 'SUCCESS', message: 'OK' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ code: 'FAIL', message: 'Internal Error' }, { status: 500 });
  }
}
