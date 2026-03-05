import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

console.log('[upload.service] AWS_REGION:', process.env.AWS_REGION || '(não definido, usando us-east-1)')
console.log('[upload.service] AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✓ definido' : '✗ AUSENTE')
console.log('[upload.service] AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✓ definido' : '✗ AUSENTE')
console.log('[upload.service] AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET || '✗ AUSENTE')

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function generatePresignedUrl(
  folder: string,
  mimeType: string,
  expiresIn = 300
): Promise<{ url: string; key: string; publicUrl: string }> {
  const bucket = process.env.AWS_S3_BUCKET!
  const region = process.env.AWS_REGION || 'us-east-1'
  console.log('[upload.service] generatePresignedUrl | folder:', folder, '| mimeType:', mimeType, '| bucket:', bucket, '| region:', region)

  const ext = mimeType.split('/')[1] || 'jpg'
  const key = `${folder}/${randomUUID()}.${ext}`
  console.log('[upload.service] key gerada:', key)

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
  })

  try {
    const url = await getSignedUrl(s3, command, { expiresIn })
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`
    console.log('[upload.service] presigned URL gerada (primeiros 120 chars):', url.slice(0, 120))
    console.log('[upload.service] publicUrl:', publicUrl)
    return { url, key, publicUrl }
  } catch (e: any) {
    console.error('[upload.service] ✗ erro ao gerar presigned URL:', e.message, e.code)
    throw e
  }
}

export function getPublicUrl(key: string): string {
  const bucket = process.env.AWS_S3_BUCKET!
  const region = process.env.AWS_REGION || 'us-east-1'
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}
