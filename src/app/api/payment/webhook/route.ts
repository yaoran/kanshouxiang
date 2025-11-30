import { NextResponse } from 'next/server';
import wxPay from '@/lib/wechat-pay';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    if (!wxPay) {
        return NextResponse.json({ code: 'FAIL', message: 'Config missing' }, { status: 500 });
    }

    const headers = Object.fromEntries(req.headers.entries());
    const timestamp = headers['wechatpay-timestamp'];
    const nonce = headers['wechatpay-nonce'];
    const signature = headers['wechatpay-signature'];
    const serial = headers['wechatpay-serial'];
    const body = await req.text(); // Raw body needed for verification

    // Verify Signature
    const isVerified = await wxPay.verifySign({
      timestamp,
      nonce,
      signature,
      serial,
      body,
    });

    if (!isVerified) {
      console.error('WeChat Webhook Signature Verification Failed');
      return NextResponse.json({ code: 'FAIL', message: 'Signature error' }, { status: 401 });
    }

    const bodyObj = JSON.parse(body);
    
    // Decrypt Resource
    if (bodyObj.resource) {
      const { ciphertext, nonce: resourceNonce, associated_data } = bodyObj.resource;
      const decrypted = wxPay.decipher_gcm(ciphertext, associated_data, resourceNonce, process.env.WECHAT_API_V3_KEY);
      const result = JSON.parse(decrypted);

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
    }

    return NextResponse.json({ code: 'SUCCESS', message: 'OK' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ code: 'FAIL', message: 'Internal Error' }, { status: 500 });
  }
}


