import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { logger } from '../../infrastructure/logger'

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

  const ext = mimeType.split('/')[1] || 'jpg'
  const key = `${folder}/${randomUUID()}.${ext}`

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
  })

  try {
    const url = await getSignedUrl(s3, command, { expiresIn })
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`
    return { url, key, publicUrl }
  } catch (e: any) {
    logger.error('Erro ao gerar presigned URL S3', { error: e.message, folder, bucket })
    throw e
  }
}

export function getPublicUrl(key: string): string {
  const bucket = process.env.AWS_S3_BUCKET!
  const region = process.env.AWS_REGION || 'us-east-1'
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}
