import 'server-only'

type Sub = { endpoint: string; p256dh: string; auth: string }
export type PushPayload = { title: string; body: string; url: string }

type WebPushLike = {
  sendNotification: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) => Promise<unknown>
}

let cached: WebPushLike | null | undefined = undefined

// Lazily configure web-push from VAPID env. Returns null when not configured
// (so the feature degrades gracefully without keys).
function getWebPush(): WebPushLike | null {
  if (cached !== undefined) return cached
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) {
    cached = null
    return null
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const wp = require('web-push')
  wp.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@activlifehub.com', pub, priv)
  cached = wp
  return wp
}

export function isWebPushConfigured(): boolean {
  return getWebPush() !== null
}

/** Send a web-push notification to each subscription. Failures are swallowed. */
export async function sendWebPush(subs: Sub[], payload: PushPayload): Promise<void> {
  const wp = getWebPush()
  if (!wp) return
  await Promise.all(
    subs.map((s) =>
      wp
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        )
        .catch(() => {
          /* expired/invalid subscription — ignore in v1 */
        }),
    ),
  )
}
