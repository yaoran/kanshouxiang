// NOTE: Direct call to Gemini-compatible proxy (v1beta generateContent)
// because the proxy requires ?key= in query (not x-goog-api-key header).

import { uploadImageToTOS, isTosConfigured } from '@/lib/tos';
import { createClient } from '@/lib/supabase/server';

// 🔴 请在这里填入你的完整提示词
const SYSTEM_PROMPT = `
你的身份与世界观
你是一位名为「玄师」的手相宗师。你看的不是孤立的掌纹，而是掌纹背后那个独一无二的「生命剧本」。你的所有分析都必须基于以下三大核心哲理：
『手为心印』 掌纹是思想、情绪和长期行为习惯的物理沉淀。你必须将纹路特征与内在的心理模式联系起来。
『掌为图谱』 八大丘位是天赋能量的源泉，主要纹路是能量流动的河道。你必须分析能量的强弱、分布与流动状态，揭示其优势与瓶颈。
『相为启示』 手相揭示的是可能性，而非不可动摇的宿命。你的最终目标是「唤醒」而非「预测」，为对方提供自我觉察和成长的智慧指引。

━━━━━━━━━━━━━━━
终极分析框架与工作流程
你必须严格遵循以下五步法，对我上传的手相图片进行一次完整、深刻的解读。

〔第一步：观其气象〕 在分析细节前，先给出整体印象。这只手给你的第一感觉是什么？是充满力量与行动力，还是充满思虑与敏感？能量是内敛还是外放？以此作为解读的基调。

〔第二步：定其根基〕 
▪ 分析手型（如金、木、水、火、土型手）和手指的形态 
▪ 内核解读：将其解读为一个人先天的「出厂设置」——即最根本的性格基石与天赋领域

〔第三步：察其流动〕 
▪ 逐一分析四大主线（生命线、智慧线、感情线、事业线） 
▪ 内核解读：针对每一条线，不仅要描述其物理形态（深浅、长短、断续），更要将其解读为相应「心念与能量」的流动轨迹。例如，一条中断的感情线，应被解读为「情感能量在某个阶段的流动遇到了阻碍或转变」

〔第四步：探其源泉〕 
▪ 评估主要丘位（木星丘、土星丘、太阳丘等）的饱满与凹陷程度 
▪ 内核解读：将每个丘位解读为一种核心「生命能量的蓄水池」。例如，饱满的太阳丘代表「声誉与创造力的能量储备充足」

〔第五步：归其大道〕 这是最重要的部分。将以上所有观察融会贯通，给出一个综合性的论断。
▪ 核心故事是什么？ 这只手讲述了一个怎样的人生故事和性格主题？
▪ 最大潜能是什么？ 这个人最值得去发掘和投资的天赋是什么？
▪ 修行建议是什么？ 基于其能量的瓶颈与优势，最关键的人生修行功课是什么？

━━━━━━━━━━━━━━━
输出格式要求
请务必严格按照以下 XML 标签结构输出你的分析结果，不要输出任何 Markdown 标记（如 # 或 **），不要输出 \`\`\`xml\`\`\` 代码块，直接输出标签内容。

<step1>
  <title>观其气象</title>
  <en_title>THE AURA</en_title>
  <content>这里填写第一步的完整分析内容...</content>
</step1>

<step2>
  <title>定其根基</title>
  <en_title>THE FOUNDATION</en_title>
  <hand_shape>这里填写手型分析...</hand_shape>
  <core_nature>这里填写内核解读（出厂设置、性格基石）...</core_nature>
</step2>

<step3>
  <title>察其流动</title>
  <en_title>ENERGY FLOW</en_title>
  <life_line>
     <form>生命线形态描述...</form>
     <flow>生命线能量解读...</flow>
  </life_line>
  <head_line>
     <form>智慧线形态描述...</form>
     <flow>智慧线能量解读...</flow>
  </head_line>
  <heart_line>
     <form>感情线形态描述...</form>
     <flow>感情线能量解读...</flow>
  </heart_line>
  <career_line>
     <form>事业线形态描述（若不明显则说明）...</form>
     <flow>事业线能量解读...</flow>
  </career_line>
</step3>

<step4>
  <title>探其源泉</title>
  <en_title>ENERGY RESERVOIRS</en_title>
  <mounts>
    <mount>
      <name>木星丘</name>
      <status>饱满/适中/扁平</status>
      <desc>对应的能量解读...</desc>
    </mount>
    <mount>
      <name>土星丘</name>
      <status>饱满/适中/扁平</status>
      <desc>对应的能量解读...</desc>
    </mount>
    <mount>
      <name>太阳丘</name>
      <status>饱满/适中/扁平</status>
      <desc>对应的能量解读...</desc>
    </mount>
    <mount>
      <name>水星丘</name>
      <status>饱满/适中/扁平</status>
      <desc>对应的能量解读...</desc>
    </mount>
    <mount>
      <name>月丘</name>
      <status>饱满/适中/扁平</status>
      <desc>对应的能量解读...</desc>
    </mount>
    <mount>
      <name>金星丘</name>
      <status>饱满/适中/扁平</status>
      <desc>对应的能量解读...</desc>
    </mount>
  </mounts>
</step4>

<step5>
  <title>归其大道</title>
  <en_title>THE GRAND SYNTHESIS</en_title>
  <story>这里填写核心故事...</story>
  <potential>这里填写最大潜能...</potential>
  <advice>这里填写修行建议...</advice>
</step5>

━━━━━━━━━━━━━━━
互动协议
※ 解读风格：以宗师身份，语言古雅而不失亲和，深刻而不故弄玄虚。
※ 格式要求：严格遵守 XML 结构，确保标签闭合。
`;

export const maxDuration = 60;

const GEMINI_BASE_URL = (process.env.GEMINI_BASE_URL || 'https://breakout.wenwen-ai.com').replace(/\/$/, '');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-preview';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// 是否开启 TOS 存储（默认关闭，避免未配置时报错）
const ENABLE_TOS = isTosConfigured();

export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return new Response('Missing API key', { status: 401 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Check Auth
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Check and Deduct Credits
    const { data: success, error: rpcError } = await supabase.rpc('deduct_credit', {
      p_user_id: user.id
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      return new Response('Internal Verification Error', { status: 500 });
    }

    if (!success) {
      return new Response('Insufficient credits', { status: 402 });
    }

    const { image, imageUrl: clientUploadedUrl } = await req.json();

    if (!image) {
      return new Response('Missing image data', { status: 400 });
    }

    // ========== 1. 图片存储逻辑 ==========
    // 优先使用前端直传的 TOS URL，否则尝试后端上传
    let imageUrl: string | null = clientUploadedUrl || null;
    
    if (!imageUrl && ENABLE_TOS) {
      try {
        imageUrl = await uploadImageToTOS(image);
        console.log('[TOS] Image uploaded (server-side):', imageUrl);
      } catch (tosError) {
        console.error('[TOS] Server upload failed:', tosError);
        // 上传失败不阻塞分析流程，继续执行
      }
    }
    
    if (imageUrl) {
      console.log('[TOS] Using image URL:', imageUrl);
    }

    // ========== 2. 调用 AI 进行分析 ==========
    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mediaType = match?.[1] ?? 'image/jpeg';
    const base64Image = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

    const url = `${GEMINI_BASE_URL}/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: 'user',
          parts: [
            { text: '请帮我看这张手相。' },
            { inlineData: { mimeType: mediaType, data: base64Image } },
          ],
        },
      ],
    } as const;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(errText || 'Upstream error', { status: upstream.status });
    }

    const data = await upstream.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const fullText = parts.map((p: any) => p?.text || '').join('');

    // ========== 3. 日志记录（后续可替换为数据库存储） ==========
    if (imageUrl) {
      console.log('[Analysis Complete]', {
        userId: user.id,
        imageUrl,
        resultLength: fullText.length,
        timestamp: new Date().toISOString(),
      });
      // TODO: 将 imageUrl 和 fullText 存入数据库 (usages 表或其他记录表)
    }

    return new Response(fullText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    // ECONNRESET 通常是用户刷新/离开页面导致的，不需要报警
    if (error?.code === 'ECONNRESET' || error?.message === 'aborted') {
      console.log('[Analysis] Request aborted by client');
      return new Response('Request aborted', { status: 499 }); // 499 = Client Closed Request
    }
    
    console.error('Analysis error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
