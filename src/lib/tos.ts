import TOS from '@volcengine/tos-sdk';

// 从环境变量读取配置
const TOS_ACCESS_KEY = process.env.TOS_ACCESS_KEY || '';
const TOS_SECRET_KEY = process.env.TOS_SECRET_KEY || '';
const TOS_REGION = process.env.TOS_REGION || 'cn-beijing';
const TOS_BUCKET = process.env.TOS_BUCKET || '';

// Endpoint host（不含协议），默认 tos-{region}.volces.com
// 参考文档：https://www.volcengine.com/docs/6349/107244
const RAW_ENDPOINT = process.env.TOS_ENDPOINT || `tos-${TOS_REGION}.volces.com`;
const TOS_ENDPOINT_HOST = RAW_ENDPOINT.replace(/^https?:\/\//, '');
const TOS_ENDPOINT_PROTOCOL = 'https';

// 创建 TOS 客户端实例（延迟初始化，避免未配置时报错）
let tosClient: TOS | null = null;

function getTosClient(): TOS {
  if (!tosClient) {
    if (!TOS_ACCESS_KEY || !TOS_SECRET_KEY || !TOS_BUCKET) {
      throw new Error('TOS configuration missing. Please set TOS_ACCESS_KEY, TOS_SECRET_KEY, and TOS_BUCKET.');
    }
    tosClient = new TOS({
      accessKeyId: TOS_ACCESS_KEY,
      accessKeySecret: TOS_SECRET_KEY,
      endpoint: TOS_ENDPOINT_HOST,
      region: TOS_REGION,
    });
  }
  return tosClient;
}

/**
 * 将 Base64 图片上传到火山引擎 TOS
 * @param base64Data - 完整的 data URI (data:image/jpeg;base64,...)
 * @returns 上传后的公开访问 URL
 * 
 * 参考文档：https://www.volcengine.com/docs/6627/159573
 */
export async function uploadImageToTOS(base64Data: string): Promise<string> {
  const client = getTosClient();

  // 解析 MIME 类型和纯 Base64
  const match = base64Data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const mimeType = match?.[1] || 'image/jpeg';
  
  // 处理扩展名
  let extension = mimeType.split('/')[1] || 'jpg';
  if (extension === 'jpeg') extension = 'jpg';
  
  const pureBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

  // 转换为 Buffer
  const buffer = Buffer.from(pureBase64, 'base64');

  // 生成唯一文件名：palm-readings/2024/01/01/时间戳-随机字符串.jpg
  const now = new Date();
  const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const objectKey = `palm-readings/${datePath}/${timestamp}-${randomStr}.${extension}`;

  console.log(`[TOS] Uploading to: ${objectKey}, size: ${buffer.length} bytes`);

  // 上传到 TOS
  const result = await client.putObject({
    bucket: TOS_BUCKET,
    key: objectKey,
    body: buffer,
    contentType: mimeType,
  });

  console.log(`[TOS] Upload success, requestId: ${result.requestId}`);

  // 返回公开访问 URL
  // 格式: https://{bucket}.tos-{region}.volces.com/{key}
  // 参考：https://www.volcengine.com/docs/6627/159573
  const url = `${TOS_ENDPOINT_PROTOCOL}://${TOS_BUCKET}.${TOS_ENDPOINT_HOST}/${objectKey}`;
  
  return url;
}

/**
 * 检查 TOS 配置是否完整
 */
export function isTosConfigured(): boolean {
  return !!(TOS_ACCESS_KEY && TOS_SECRET_KEY && TOS_BUCKET);
}

export { TOS_BUCKET, TOS_ENDPOINT_HOST as TOS_ENDPOINT, TOS_REGION };
