export function getHlsUrl(videoId: string): string {
  return `https://videodelivery.net/${videoId}/manifest/video.m3u8`
}

export function getThumbnailUrl(videoId: string): string {
  return `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg?height=640&fit=crop`
}

export async function createDirectUpload(): Promise<{ uploadURL: string; uid: string }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare credentials not configured')
  }

  const expiry = new Date(Date.now() + 3600 * 1000).toISOString()

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: 300,
        expiry,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cloudflare upload URL creation failed: ${err}`)
  }

  const json = await res.json()
  return {
    uploadURL: json.result.uploadURL,
    uid: json.result.uid,
  }
}
