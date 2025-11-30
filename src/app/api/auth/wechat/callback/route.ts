import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const WECHAT_APP_ID = process.env.WECHAT_APP_ID;
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET;

// 生成一个确定的密码，通过 OpenID 和服务端密钥计算
// 这样我们不需要存储密码也能帮用户登录
const generatePassword = (openid: string) => {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret';
  return crypto.createHmac('sha256', secret).update(openid).digest('hex');
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(`${origin}?error=no_code`);
  }

  if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
    return NextResponse.json({ error: 'WeChat config missing' }, { status: 500 });
  }

  try {
    // 1. 用 Code 换取 Access Token 和 OpenID
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`;
    
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.errcode) {
      console.error('WeChat Token Error:', tokenData);
      return NextResponse.redirect(`${origin}?error=wechat_token_error`);
    }

    const { openid, access_token } = tokenData;
    
    // (可选) 获取微信用户信息，如昵称头像
    // const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`;
    // const userInfoRes = await fetch(userInfoUrl);
    // const userInfo = await userInfoRes.json();

    // 2. Supabase 用户处理 (使用 Admin Client)
    const adminSupabase = createAdminClient();
    
    // 构造虚拟邮箱
    const email = `${openid}@wechat.kanshouxiang.com`;
    const password = generatePassword(openid);

    // 检查用户是否存在
    // 这里的逻辑是：尝试用 Email 获取用户，如果没有则创建
    // 也可以用 adminSupabase.auth.admin.listUsers() 但效率较低，直接操作简单点
    
    // 尝试直接登录（验证用户是否存在且密码正确）
    // 我们需要用普通的 Auth Client 来登录以获取 Session，但需要先确保用户存在
    
    // 先尝试创建用户（如果已存在会报错，我们就知道是登录）
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        wechat_openid: openid,
        // nickname: userInfo.nickname,
        // avatar_url: userInfo.headimgurl
      }
    });

    if (createError && !createError.message.includes('already been registered')) {
       console.error('Create User Error:', createError);
       return NextResponse.redirect(`${origin}?error=create_user_failed`);
    }

    // 3. 登录用户并设置 Cookie (使用 Server Client)
    // 注意：我们需要在这里模拟登录，以便设置 HTTP Only Cookie 到客户端浏览器
    const supabase = await createClient();
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Sign In Error:', signInError);
      return NextResponse.redirect(`${origin}?error=signin_failed`);
    }

    // 登录成功，Supabase Client 会自动处理 Cookie 的设置
    // 重定向回首页，带上 success 参数
    return NextResponse.redirect(`${origin}?login_success=true`);

  } catch (error) {
    console.error('Callback Error:', error);
    return NextResponse.redirect(`${origin}?error=internal_error`);
  }
}


