import { defineConfig, loadEnv, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

async function fetchIceCredentials(turnApiKey: string) {
  try {
    const res = await fetch(
      'https://rtc.live.cloudflare.com/v1/turn/keys/f9c1f8fafb2f096e0fa80c18e1a76ae6/credentials/generate-ice-servers',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${turnApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: 21600 }),
      }
    )

    if (!res.ok) {
      console.warn('[vite] local ICE injection failed:', res.status, res.statusText)
      return null
    }

    return await res.json()
  } catch (error) {
    console.warn('[vite] local ICE injection error:', error)
    return null
  }
}

const mode = process.env.MODE || process.env.NODE_ENV || 'production'
const env = loadEnv(mode, process.cwd(), '')
const turnApiKey = env.TURN_API_KEY || env.VITE_TURN_API_KEY

const iceInjectionPlugin: Plugin = {
  name: 'vite:local-ice-servers',
  apply: 'build' as const,
  async transformIndexHtml() {
    if (!turnApiKey) {
      return undefined
    }

    const iceData = await fetchIceCredentials(turnApiKey)
    if (!iceData) return undefined

    return [
      {
        tag: 'script',
        injectTo: 'head-prepend' as const,
        children: `window.__ICE_SERVERS__=${JSON.stringify(iceData)}`,
      },
    ]
  },
}

export default defineConfig({
  plugins: [vue(), iceInjectionPlugin],
  base: '/',
})
