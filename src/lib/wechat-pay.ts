import fs from 'fs';
import path from 'path';
// @ts-ignore
import WxPay from 'wechatpay-node-v3';

const PRIVATE_KEY_PATH = process.env.WECHAT_PRIVATE_KEY_PATH 
  ? path.resolve(process.cwd(), process.env.WECHAT_PRIVATE_KEY_PATH)
  : undefined;

// Use content from env var or file
const privateKey = process.env.WECHAT_PRIVATE_KEY 
  ? process.env.WECHAT_PRIVATE_KEY.replace(/\\n/g, '\n')
  : (PRIVATE_KEY_PATH && fs.existsSync(PRIVATE_KEY_PATH) ? fs.readFileSync(PRIVATE_KEY_PATH) : undefined);

// Initialize WeChat Pay client
let wxPay: any = null;

if (process.env.WECHAT_MCH_ID && process.env.WECHAT_API_V3_KEY && privateKey) {
  try {
    wxPay = new WxPay({
      appid: process.env.WECHAT_APP_ID,
      mchid: process.env.WECHAT_MCH_ID,
      publicKey: privateKey, // V3 SDK might use this field name for the private key in some versions, or privateKey
      privateKey: privateKey,
      key: process.env.WECHAT_API_V3_KEY,
    });
  } catch (e) {
    console.error('WeChat Pay init failed:', e);
  }
}

export default wxPay;

export const WECHAT_NOTIFY_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`;


