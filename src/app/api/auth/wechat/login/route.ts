import { NextResponse } from 'next/server';

const WECHAT_APP_ID = process.env.WECHAT_APP_ID;
// 回调地址必须在微信开放平台配置过
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/wechat/callback`;

export async function GET() {
  if (!WECHAT_APP_ID) {
    return NextResponse.json({ error: 'WeChat App ID not configured' }, { status: 500 });
  }

  // PC 网站应用扫码登录 (测试号适配版)
  // 测试号使用的是公众号 OAuth 流程
  const params = new URLSearchParams({
    appid: WECHAT_APP_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'snsapi_userinfo', // 测试号必须用 userinfo
    state: 'STATE',
  });

  // 注意：测试号使用 oauth2/authorize 接口
  const url = `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;

  return NextResponse.redirect(url);
}

