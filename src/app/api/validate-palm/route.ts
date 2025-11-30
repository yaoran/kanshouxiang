/**
 * 手掌图片验证 API
 * 用智谱 GLM-4V 多模态模型快速判断上传的图片是否是手掌照片
 */

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';
const ZHIPU_BASE_URL = (process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, '');
const ZHIPU_MODEL = process.env.ZHIPU_VALIDATE_MODEL || 'glm-4.5v'; // 多模态模型

const VALIDATE_PROMPT = `判断这张图片是否是清晰的手掌照片（用于手相分析）。

要求：
1. 必须能清楚看到手掌内侧（有掌纹的那一面）
2. 掌纹要基本清晰可见
3. 手掌要占据图片主要区域

只回复 JSON 格式，不要有其他内容：
{"valid": true或false, "reason": "简短说明原因，10字以内"}

示例回复：
{"valid": true, "reason": "手掌清晰可见"}
{"valid": false, "reason": "这是手背不是手掌"}
{"valid": false, "reason": "图片模糊看不清"}
{"valid": false, "reason": "不是手的照片"}`;

export async function POST(req: Request) {
  try {
    if (!ZHIPU_API_KEY) {
      console.log('[Validate] ZHIPU_API_KEY not configured, skip validation');
      return Response.json({ valid: true });
    }

    const { image } = await req.json();
    if (!image) {
      return Response.json({ valid: false, reason: '缺少图片' }, { status: 400 });
    }

    const url = `${ZHIPU_BASE_URL}/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: ZHIPU_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: VALIDATE_PROMPT },
              { type: 'image_url', image_url: { url: image } }, // 智谱支持直接传 data URI
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!res.ok) {
      console.error('[Validate] API error:', res.status, await res.text());
      return Response.json({ valid: true });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';

    console.log('[Validate] Raw response:', text);

    // 提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        return Response.json({
          valid: !!result.valid,
          reason: result.reason || (result.valid ? '验证通过' : '请上传手掌照片'),
        });
      } catch {
        return Response.json({ valid: true });
      }
    }

    return Response.json({ valid: true });
  } catch (error) {
    console.error('[Validate] Error:', error);
    return Response.json({ valid: true });
  }
}

