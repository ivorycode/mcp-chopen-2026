# Minimales Setup vor dem Workshop

Diese Schritte vor dem Workshop ausführen. Zeitbedarf: etwa 15 Minuten. Der [Setup-Check](00-setup-check/README.md) prüft Node.js/npm und deinen API-Zugang mit einer kurzen echten API-Anfrage.

## 1. Software und Konten

- Node.js 22.18 oder neuer (empfohlen: aktuelle LTS) – `node --version`
- Git
- Ein Editor mit TypeScript-Unterstützung (VS Code, WebStorm, ...)
- Chrome oder Edge in aktueller Version (für Block 3, WebMCP; siehe [Blockunterlagen](00-course-material/30-webmcp.md))
- Für Block 2: Claude Desktop, Claude Code oder ChatGPT Desktop installieren und anmelden – [Anleitung](00-setup-check/README.md#4-für-den-zweiten-teil-installieren)
- Für Block 2 ausserdem: eine **Subscription bei Claude oder ChatGPT** (z. B. Claude Pro oder ChatGPT Plus). Das Einbinden eigener MCP-Server über Custom Connectors bzw. den Developer Mode ist in den kostenlosen Plänen nicht verfügbar. Diese Subscription ist unabhängig vom API-Zugang aus Schritt 3 und ersetzt ihn nicht.

## 2. Repository einrichten

```bash
git clone https://github.com/ivorycode/mcp-chopen-2026.git mcp-chopen-2026
cd mcp-chopen-2026
```

Jedes Projekt im Repository wird ausschliesslich in seinem eigenen Verzeichnis mit `npm ci` installiert. Seine `.env.example` wird dort nach `.env` kopiert, sofern das Projekt Laufzeitkonfiguration benötigt. Es gibt keine gemeinsame Installation im Wurzelverzeichnis.

## 3. AI-Provider-API-Zugang einrichten und prüfen

Im ersten Teil des Webshops bauen wir ein LLM in unsere Applikation ein. Dazu rufen wir ein Modell direkt über die API von Google, OpenAI oder Anthropic auf. Dafür brauchst du **einen** API-Key mit Guthaben; eine AI-Subscription (Claude Pro, ChatGPT Plus, ...) kann dafür nicht verwendet werden.

Folge der [Setup-Check-Anleitung](00-setup-check/README.md). Sie erklärt Accounts, API-Keys, die vorbereiteten günstigen Modelle und die separate API-Abrechnung. Kurzfassung:

```bash
cd 00-setup-check
npm ci
cp .env.example .env    # Windows PowerShell: Copy-Item .env.example .env
# In .env genau einen Provider-Block aktivieren und den API-Key eintragen
npm run check
```

Der Check muss mit `✓ Modell hat eine Textantwort geliefert` enden. Den gewählten Provider-Block überträgst du im Workshop in die `.env` des jeweiligen Webshop-Projekts.
