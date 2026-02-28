import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET!

export async function generatePresignedUrl(
  folder: string,
  mimeType: string,
  expiresIn = 300
): Promise<{ url: string; key: string }> {
  const ext = mimeType.split('/')[1] || 'jpg'
  const key = `${folder}/${randomUUID()}.${ext}`

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mimeType,
  })

  const url = await getSignedUrl(s3, command, { expiresIn })

  return { url, key }
}

export function getPublicUrl(key: string): string {
  return `https://${BUCKET}.s3.amazonaws.com/${key}`
}
