import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}))

vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('fixed-uuid-1234'),
}))

import { generatePresignedUrl, getPublicUrl } from '../modules/upload/upload.service'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

describe('getPublicUrl', () => {
  beforeEach(() => {
    process.env.AWS_S3_BUCKET = 'my-bucket'
    process.env.AWS_REGION = 'sa-east-1'
  })

  it('monta URL pública correta para uma chave S3', () => {
    const url = getPublicUrl('profile/foto.jpg')
    expect(url).toBe('https://my-bucket.s3.sa-east-1.amazonaws.com/profile/foto.jpg')
  })

  it('usa us-east-1 como região padrão se AWS_REGION não definido', () => {
    delete process.env.AWS_REGION
    const url = getPublicUrl('driver_license/doc.jpg')
    expect(url).toBe('https://my-bucket.s3.us-east-1.amazonaws.com/driver_license/doc.jpg')
  })
})

describe('generatePresignedUrl', () => {
  beforeEach(() => {
    process.env.AWS_S3_BUCKET = 'my-bucket'
    process.env.AWS_REGION = 'sa-east-1'
  })

  it('gera chave com formato folder/uuid.ext', async () => {
    vi.mocked(getSignedUrl).mockResolvedValueOnce('https://signed-url.example.com')

    const result = await generatePresignedUrl('profile', 'image/jpeg')

    expect(result.key).toBe('profile/fixed-uuid-1234.jpeg')
  })

  it('extrai extensão do mimeType corretamente', async () => {
    vi.mocked(getSignedUrl).mockResolvedValueOnce('https://signed-url.example.com')

    const result = await generatePresignedUrl('driver_license', 'image/png')

    expect(result.key).toContain('.png')
  })

  it('usa "jpg" como extensão padrão se mimeType não tem sub-tipo', async () => {
    vi.mocked(getSignedUrl).mockResolvedValueOnce('https://signed-url.example.com')

    const result = await generatePresignedUrl('vehicle_doc', 'image')

    expect(result.key).toContain('.jpg')
  })

  it('retorna url presignada do S3', async () => {
    vi.mocked(getSignedUrl).mockResolvedValueOnce('https://presigned.aws.com/key?X-Amz=...')

    const result = await generatePresignedUrl('profile', 'image/jpeg')

    expect(result.url).toBe('https://presigned.aws.com/key?X-Amz=...')
  })

  it('retorna publicUrl montada corretamente', async () => {
    vi.mocked(getSignedUrl).mockResolvedValueOnce('https://signed.example.com')

    const result = await generatePresignedUrl('profile', 'image/jpeg')

    expect(result.publicUrl).toBe('https://my-bucket.s3.sa-east-1.amazonaws.com/profile/fixed-uuid-1234.jpeg')
  })

  it('propaga erro se getSignedUrl falhar', async () => {
    vi.mocked(getSignedUrl).mockRejectedValueOnce(new Error('S3 error'))

    await expect(generatePresignedUrl('profile', 'image/jpeg')).rejects.toThrow('S3 error')
  })
})
