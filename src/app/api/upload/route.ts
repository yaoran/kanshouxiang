import TOS from '@volcengine/tos-sdk';

/**
 * 生成 TOS 预签名上传 URL
 * 前端可以直接使用这个 URL 进行 PUT 上传，无需暴露 AK/SK
 * 
 * 参考文档：https://www.volcengine.com/docs/6349/127695
 */

const TOS_ACCESS_KEY = process.env.TOS_ACCESS_KEY || '';
const TOS_SECRET_KEY = process.env.TOS_SECRET_KEY || '';
const TOS_REGION = process.env.TOS_REGION || 'cn-beijing';
const TOS_BUCKET = process.env.TOS_BUCKET || '';
const RAW_ENDPOINT = process.env.TOS_ENDPOINT || `tos-${TOS_REGION}.volces.com`;
const TOS_ENDPOINT_HOST = RAW_ENDPOINT.replace(/^https?:\/\//, '');
const TOS_ENDPOINT_PROTOCOL = 'https';

export async function POST(req: Request) {
  try {
    // 检查配置
    if (!TOS_ACCESS_KEY || !TOS_SECRET_KEY || !TOS_BUCKET) {
      return Response.json({ error: 'TOS not configured' }, { status: 500 });
    }

    const { contentType = 'image/jpeg' } = await req.json();

    // 生成唯一文件名
    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    
    // 根据 contentType 确定扩展名
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('gif')) extension = 'gif';
    
    const objectKey = `palm-readings/${datePath}/${timestamp}-${randomStr}.${extension}`;

    // 创建 TOS 客户端
    const client = new TOS({
      accessKeyId: TOS_ACCESS_KEY,
      accessKeySecret: TOS_SECRET_KEY,
      endpoint: TOS_ENDPOINT_HOST,
      region: TOS_REGION,
    });

    // 生成预签名 PUT URL（有效期 10 分钟）
    const signedUrl = client.getPreSignedUrl({
      bucket: TOS_BUCKET,
      key: objectKey,
      method: 'PUT',
      expires: 600, // 10 分钟
    });

    // 生成访问 URL（上传成功后可以用这个 URL 访问图片）
    const accessUrl = `${TOS_ENDPOINT_PROTOCOL}://${TOS_BUCKET}.${TOS_ENDPOINT_HOST}/${objectKey}`;

    return Response.json({
      uploadUrl: signedUrl,
      accessUrl,
      objectKey,
    });
  } catch (error) {
    console.error('[TOS] Generate presigned URL error:', error);
    return Response.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}

