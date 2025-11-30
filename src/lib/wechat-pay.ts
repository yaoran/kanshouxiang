import crypto from 'crypto';

// 微信支付配置
const config = {
  appId: process.env.WECHAT_APP_ID || '',
  mchId: process.env.WECHAT_MCH_ID || '',
  apiV3Key: process.env.WECHAT_API_V3_KEY || '',
  privateKey: process.env.WECHAT_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  serialNo: process.env.WECHAT_SERIAL_NO || '',
};

export const WECHAT_NOTIFY_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`;

// 检查是否配置了微信支付
export function isWechatPayConfigured(): boolean {
  return !!(config.mchId && config.apiV3Key && config.privateKey && config.serialNo);
}

// 生成签名
function generateSignature(method: string, url: string, timestamp: string, nonceStr: string, body: string): string {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(config.privateKey, 'base64');
}

// 生成 Authorization 头
function generateAuthHeader(method: string, url: string, body: string = ''): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const signature = generateSignature(method, url, timestamp, nonceStr, body);
  
  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`;
}

// 验证微信回调签名
export function verifyWebhookSignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  _serial: string
): boolean {
  // 实际生产环境需要用微信平台证书验签
  // 这里简化处理，建议接入微信证书下载接口
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  // TODO: 使用微信平台公钥验证签名
  console.log('[WechatPay] Webhook signature verification - message length:', message.length);
  return true; // 开发阶段暂时返回 true
}

// 解密回调数据
export function decryptResource(ciphertext: string, nonce: string, associatedData: string): any {
  const key = Buffer.from(config.apiV3Key, 'utf-8');
  const iv = Buffer.from(nonce, 'utf-8');
  const authTag = Buffer.from(ciphertext.slice(-24), 'base64'); // 最后 16 字节是 authTag
  const data = Buffer.from(ciphertext.slice(0, -24), 'base64');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, 'utf-8'));
  
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf-8'));
}

// Native 支付下单
export async function createNativeOrder(params: {
  description: string;
  outTradeNo: string;
  totalAmount: number; // 单位：分
  notifyUrl: string;
}): Promise<{ code_url?: string; error?: string }> {
  if (!isWechatPayConfigured()) {
    return { error: 'WeChat Pay not configured' };
  }

  const url = '/v3/pay/transactions/native';
  const fullUrl = `https://api.mch.weixin.qq.com${url}`;
  
  const body = JSON.stringify({
    appid: config.appId,
    mchid: config.mchId,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    amount: {
      total: params.totalAmount,
      currency: 'CNY',
    },
  });

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': generateAuthHeader('POST', url, body),
      },
      body,
    });

    const result = await response.json();
    
    if (response.ok && result.code_url) {
      return { code_url: result.code_url };
    } else {
      console.error('[WechatPay] Native order failed:', result);
      return { error: result.message || 'Payment failed' };
    }
  } catch (error: any) {
    console.error('[WechatPay] Request error:', error);
    return { error: error.message };
  }
}

// 查询订单状态
export async function queryOrder(outTradeNo: string): Promise<any> {
  if (!isWechatPayConfigured()) {
    return { error: 'WeChat Pay not configured' };
  }

  const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${config.mchId}`;
  const fullUrl = `https://api.mch.weixin.qq.com${url}`;

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': generateAuthHeader('GET', url),
      },
    });

    return await response.json();
  } catch (error: any) {
    console.error('[WechatPay] Query error:', error);
    return { error: error.message };
  }
}
