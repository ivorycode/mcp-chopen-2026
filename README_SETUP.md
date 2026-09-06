# Minimales Setup vor dem Workshop

Führe zuerst den [Setup-Check](00-setup-check/README.md) aus. Er prüft Node.js/npm und deinen API-Zugang. Die folgenden Schritte prüfen zusätzlich das klassische Web-Interface mit Mock-API und 1b-Starter; dafür ist kein weiterer LLM-Aufruf nötig.

Diese Schritte vor dem Workshop ausführen. Zeitbedarf: etwa 15 Minuten.

## 1. Software

- Node.js 22.18 oder neuer (empfohlen: aktuelle LTS) – `node --version`
- Git
- Ein Editor mit TypeScript-Unterstützung (VS Code, WebStorm, ...)
- Chrome oder Edge in aktueller Version (für Block 3, WebMCP; siehe [Blockunterlagen](00-course-material/30-webmcp.md))
- Für Block 2: Claude Desktop oder ChatGPT Desktop installieren und anmelden – [Anleitung](00-setup-check/README.md#4-für-den-zweiten-teil-installieren)

## 2. API-Zugang vorab prüfen

Konfiguriere einen Provider und führe `npm run check` im Ordner `00-setup-check` aus. Die [Setup-Check-Anleitung](00-setup-check/README.md) erklärt Accounts, API-Keys, günstige Modelle und die separate API-Abrechnung. Für Teil 2 installierst du ausserdem einen der dort genannten KI-Assistenten.

## 3. Repository einrichten

```bash
git clone <repo-url> mcp-chopen-2026
cd mcp-chopen-2026/01-mock-api
npm ci
npm test
npm start
```

In einem zweiten Terminal den Chatbot-Starter eigenständig installieren:

```bash
cd mcp-chopen-2026/10-ai-in-the-app/02-chatbot-vercel-ai-sdk
npm ci
cp .env.example .env
npm run dev
```

Öffne http://localhost:3031, wähle ein Demo-Konto, suche nach `Reis`, lege einen Artikel in den Warenkorb und schliesse den Checkout ab. Suche, Warenkorb und Bestellhistorie müssen sichtbar funktionieren. Der Chat darf wegen des noch nicht gesetzten Provider-Keys als nicht konfiguriert erscheinen.

Jedes weitere Projekt wird später ausschließlich in seinem eigenen Verzeichnis mit `npm ci` installiert. Seine `.env.example` wird dort nach `.env` kopiert, sofern das Projekt Laufzeitkonfiguration benötigt.
