import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { pathToFileURL } from 'node:url'

const providers = {
  google: { key: 'GOOGLE_GENERATIVE_AI_API_KEY', model: 'gemini-3.1-flash-lite' },
  openai: { key: 'OPENAI_API_KEY', model: 'gpt-4.1-mini' },
  anthropic: { key: 'ANTHROPIC_API_KEY', model: 'claude-haiku-4-5' },
}

export function supportsNode(version) {
  const [major, minor] = version.split('.').map(Number)
  return major > 22 || (major === 22 && minor >= 18)
}

export function configuration(env) {
  const provider = env.AI_PROVIDER?.trim()
  if (!Object.hasOwn(providers, provider)) {
    throw new Error('AI_PROVIDER muss google, openai oder anthropic sein. Siehe .env.example.')
  }
  const { key, model } = providers[provider]
  const apiKey = env[key]?.trim()
  if (!apiKey || apiKey === 'DEIN_API_KEY') {
    throw new Error(`${key} fehlt. Trage deinen API-Key in der lokalen .env ein (siehe README.md).`)
  }
  return { provider, modelId: env.AI_MODEL?.trim() || model, apiKey }
}

export function apiFailure(error) {
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return 'Zeitlimit von 20 Sekunden erreicht. Prüfe Internet, VPN oder Proxy und versuche es erneut.'
  }
  switch (error.statusCode) {
    case 401: return 'API-Key abgelehnt. Erstelle einen gültigen Key beim gewählten Provider.'
    case 403: return 'Zugriff verweigert. Prüfe API-Key-Berechtigungen, Projekt und Modellzugriff.'
    case 404: return 'Modell nicht verfügbar. Prüfe AI_MODEL und den Modellzugriff deines Accounts.'
    case 429: return 'Kontingent oder Rate-Limit erreicht. Prüfe API-Guthaben und Limits; versuche es später erneut.'
    case 400: return 'Anfrage abgelehnt. Prüfe API-Key, AI_MODEL und API-Guthaben beim Provider.'
    default: return 'API-Aufruf fehlgeschlagen. Prüfe Netzwerk/Proxy, Provider-Status, Modell und API-Abrechnung.'
  }
}

export async function requestModel({ provider, modelId, apiKey }) {
  const { generateText } = await import('ai')
  const factories = {
    google: async () => (await import('@ai-sdk/google')).createGoogle({ apiKey }),
    openai: async () => (await import('@ai-sdk/openai')).createOpenAI({ apiKey }),
    anthropic: async () => (await import('@ai-sdk/anthropic')).createAnthropic({ apiKey }),
  }
  const factory = await factories[provider]()
  return generateText({
    model: factory(modelId),
    prompt: 'Antworte kurz mit OK.',
    maxOutputTokens: 128,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(20_000),
    ...(provider === 'google' ? { providerOptions: { google: { thinkingConfig: { thinkingLevel: 'minimal' } } } } : {}),
  })
}

export async function main() {
  try {
    if (!supportsNode(process.versions.node)) {
      throw new Error('Node.js ist zu alt. Installiere Node.js >=22.18 und öffne ein neues Terminal.')
    }
    console.log(`✓ Node.js ${process.versions.node}`)
    try {
      // npm run liefert den CLI-Pfad auch unter Windows (npm.cmd ist keine ausführbare Datei).
      const npmVersion = process.env.npm_execpath
        ? execFileSync(process.execPath, [process.env.npm_execpath, '--version'], { encoding: 'utf8', timeout: 5000 })
        : execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], {
          encoding: 'utf8', timeout: 5000, shell: process.platform === 'win32',
        })
      console.log(`✓ npm ${npmVersion.trim()}`)
    } catch {
      throw new Error('npm nicht verfügbar. Installiere Node.js inklusive npm und öffne ein neues Terminal.')
    }

    let localEnv
    try {
      localEnv = parseEnv(readFileSync(new URL('.env', import.meta.url), 'utf8'))
    } catch {
      throw new Error('Lokale .env fehlt oder ist nicht lesbar. Kopiere .env.example nach .env (siehe README.md).')
    }
    // Die lokale Workshop-Konfiguration hat Vorrang vor vorhandenen Shell-Variablen.
    const config = configuration({ ...process.env, ...localEnv })
    console.log(`✓ Provider: ${config.provider} / ${config.modelId}`)
    console.log('✓ API-Key vorhanden (wird nicht ausgegeben)')
    console.log('Prüfe Modellzugriff mit einer kurzen API-Anfrage …')
    let result
    try {
      result = await requestModel(config)
    } catch (error) {
      // Keine rohen SDK-Fehler ausgeben: sie können Request-Daten enthalten.
      throw new Error(error.code === 'ERR_MODULE_NOT_FOUND' ? 'Abhängigkeiten fehlen. Führe npm ci aus.' : apiFailure(error))
    }
    if (!result.text?.trim()) {
      throw new Error('Das Modell lieferte keine Textantwort. Prüfe AI_MODEL und versuche es erneut.')
    }
    console.log('✓ Modell hat eine Textantwort geliefert')
    console.log('\nDein Node.js/npm- und API-Setup ist bereit für den Workshop.')
  } catch (error) {
    console.error(`✗ ${error.message}`)
    process.exitCode = 1
  } finally {
    console.log('\nFür Teil 2 des Workshops:')
    console.log('Installiere Claude Desktop oder ChatGPT Desktop und melde dich dort an.')
    console.log('Anleitung und Download-Links stehen in README_SETUP.md im Wurzelverzeichnis.')
    console.log('Die Installation dieser Programme wird hier nicht automatisch geprüft.')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
