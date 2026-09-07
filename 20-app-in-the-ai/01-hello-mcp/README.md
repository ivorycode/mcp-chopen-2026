# 02-01 · Hello MCP

Minimaler MCP-Server nach Spezifikation 2026-07-28: ein Tool mit `structuredContent`, ein Tool mit Rückfrage (Multi-Round-Trip-Request), ein Resource, ein Prompt. TypeScript SDK v2 (`@modelcontextprotocol/server`), Transport wahlweise Streamable HTTP oder stdio.

## Starten

```bash
cd 20-app-in-the-ai/01-hello-mcp
npm ci
cp .env.example .env  # optional: Katalog-Origin und HTTP-Port
npm run dev            # Streamable HTTP auf http://localhost:3040/mcp
npm run client         # SDK-Client: Tools auflisten, add, confirm-demo, Resource, Prompt
npm run curl           # rohe HTTP-Requests mit Pflicht-Headern und _meta-Envelope
npm run inspector      # MCP Inspector (Web-UI), Konfiguration in inspector.json
npm run start:stdio    # stdio-Variante (für Host-Konfigurationen)
npm test               # öffentlicher MCP-Smoke-Test
```

Die lokale `.env` steuert ausschließlich `TRANSGOURMET_API_ORIGIN` und `PORT`; für die Hello-Tools ist kein LLM-Key nötig.

## Übung

Die Anleitung zum Erkunden von Tools, Resource und Prompt sowie zum Prüfen einer Host-Verbindung steht in [EXERCISE.md](EXERCISE.md).

## In Claude Desktop und ChatGPT einbinden

Für diese Einbindung verwenden wir **Streamable HTTP über ngrok**. Der lokale
Endpunkt `http://localhost:3040/mcp` erhält dadurch eine öffentliche HTTPS-Adresse,
die die Cloud-Dienste von Claude und ChatGPT erreichen können. Starte dafür
`npm run dev`; die oben aufgeführte stdio-Variante wird hier nicht verwendet.

### 1. Server starten und mit ngrok erreichbar machen

1. Starte den Server wie unter **Starten** beschrieben und lasse das Terminal offen.
2. Erstelle ein [ngrok-Konto und installiere ngrok](https://ngrok.com/docs/start).
   Hinterlege einmalig deinen Authtoken aus dem ngrok-Dashboard:

   ```bash
   ngrok config add-authtoken DEIN_NGROK_AUTHTOKEN
   ```

3. Starte in einem zweiten Terminal den Tunnel:

   ```bash
   ngrok http http://localhost:3040 --host-header=localhost
   ```

   Bei einem anderen `PORT` in `.env` passe `3040` entsprechend an.
   `--host-header=localhost` ist hier nötig, weil `createMcpExpressApp()` nur lokale
   Hostnamen akzeptiert. Ohne Umschreibung kann die ngrok-Domain mit HTTP 403
   abgewiesen werden. ngrok unterstützt den Schalter weiterhin, kennzeichnet ihn
   aber als veraltet; siehe [ngrok CLI](https://ngrok.com/docs/gateway/agent/cli#ngrok-http).

4. Kopiere die von ngrok angezeigte **HTTPS-Adresse** und ergänze `/mcp`. Beispiel:

   ```text
   https://deine-domain.ngrok-free.app/mcp
   ```

   Verwende in allen folgenden Schritten deine tatsächliche URL inklusive `/mcp`.
   Server und Tunnel müssen während der Nutzung weiterlaufen. Falls sich die
   ngrok-Adresse ändert, aktualisiere auch die Verbindung im jeweiligen Client.

Der Demo-Server hat keine Authentifizierung: Wähle beim Verbinden gegebenenfalls
**No Authentication / Keine Authentifizierung**. Der ngrok-Authtoken gehört nur
zur Tunnel-Einrichtung und wird nicht in Claude oder ChatGPT eingetragen.
Beende nach der Übung den Tunnel mit `Ctrl+C`; solange er läuft, ist die Demo
öffentlich erreichbar.

### 2. Claude Desktop

Claude ruft Remote-Connectors auch in der Desktop-App über die Anthropic-Cloud
auf. Daher wird hier die öffentliche ngrok-URL benötigt.

1. Öffne in Claude Desktop **Customize → Connectors** (je nach Version unter
   **Settings → Connectors**).
2. Wähle **+ → Add custom connector**. Trage als Namen `Hello MCP` und als
   **Remote MCP server URL** deine ngrok-URL mit `/mcp` ein.
3. Lasse die optionalen OAuth-Felder unter **Advanced settings** leer und
   schliesse die Einrichtung mit **Add** ab; verbinde den Connector, falls angeboten.
4. Öffne einen neuen Chat und aktiviere `Hello MCP` über **+ → Connectors**.
5. Sende den Testprompt aus Abschnitt 4.

Bei Team und Enterprise muss ein Owner den Connector zuerst unter
**Organization settings → Connectors → Add → Custom → Web** hinzufügen.
Mitglieder können ihn danach unter **Customize → Connectors** verbinden.
Fehlt die Einrichtung in deiner Desktop-Version, füge den Connector auf
[claude.ai](https://claude.ai) mit demselben Konto hinzu und öffne die Desktop-App erneut.
Remote-Connectors sind mit demselben Konto auf den Claude-Oberflächen verfügbar.
Siehe [Claude: Custom Connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
und [Desktop- und Web-Connectors](https://support.claude.com/en/articles/11725091-when-to-use-desktop-and-web-connectors).

### 3. ChatGPT Web und Desktop

**ChatGPT Web:** Die offizielle Anleitung nennt den Entwicklermodus für Plus,
Pro, Business, Enterprise und Education im Web. Die Freigabe hängt zusätzlich
von den Workspace-Einstellungen ab.

1. Öffne [ChatGPT](https://chatgpt.com) im Browser und wähle das gewünschte Konto
   beziehungsweise den Workshop-Workspace.
2. Aktiviere **Settings → Security and login → Developer mode**.
3. Öffne [ChatGPT Plugins](https://chatgpt.com/plugins) und wähle **+**.
4. Trage als Namen `Hello MCP` und als Beschreibung beispielsweise
   `MCP-Workshop: zwei Zahlen addieren` ein. Wähle unter **Connection** die
   Verbindung über eine öffentliche URL und trage deine HTTPS-ngrok-URL mit
   `/mcp` ein. Wähle **No Authentication**.
5. Erstelle die Verbindung und prüfe die eingelesenen Tools; `add` muss dabei sein.
6. Starte einen neuen Chat, wähle über **+ → Developer mode** die Verbindung
   `Hello MCP` und sende den Testprompt aus Abschnitt 4.

Die Schritte folgen der [OpenAI-Anleitung zum Verbinden eines MCP-Servers](https://developers.openai.com/plugins/deploy/connect-chatgpt)
und der [Dokumentation zum Entwicklermodus](https://developers.openai.com/api/docs/guides/developer-mode).
Falls Menüs fehlen, prüfe Konto, Tarif und Workspace-Freigabe.

**ChatGPT Desktop:** Richte die Verbindung zunächst im Browser wie oben ein.
Melde dich in der Desktop-App mit demselben Konto und Workspace an. Falls die
App im Chat-Menü **+ → Developer mode** die Verbindung `Hello MCP` anbietet,
wähle sie und verwende denselben Testprompt. Fehlt diese Auswahl, führe die
Übung in ChatGPT Web durch. Die offizielle Entwicklermodus-Anleitung belegt
die Verfügbarkeit für Web; eine identische Unterstützung in jeder Desktop-Version
ist damit nicht zugesichert. Die ngrok-URL bleibt für beide Oberflächen gleich.

### 4. Verbindung testen

Verwende in Claude oder ChatGPT diesen Prompt:

> Verwende das Tool `add` des Servers `Hello MCP` mit `a = 20` und `b = 22`.

Prüfe den tatsächlichen Tool-Aufruf und das Ergebnis `{"sum":42}`; eine nur vom
Modell ausgerechnete Antwort bestätigt die MCP-Verbindung noch nicht.

Zum Prüfen des Tunnels unabhängig vom Chat-Client kannst du im Projektverzeichnis
das vorhandene HTTP-Demoskript gegen deine öffentliche URL ausführen:

```bash
npm run curl -- https://deine-domain.ngrok-free.app/mcp
```

Das Skript enthält absichtlich auch einen Fehlerfall mit fehlendem `Mcp-Method`-
Header. Ein Aufruf von `/mcp` in der Browser-Adresszeile ersetzt diesen Test nicht.
Bei HTTP 403 prüfe den Host-Header-Schalter im ngrok-Befehl; bei 404 den Pfad
`/mcp`; bei Verbindungsfehlern den laufenden Server, den Tunnel und den Port.

Für den ersten Host-Test eignet sich `add`. `confirm-demo`, Resources und Prompts
hängen zusätzlich von den MCP-Fähigkeiten des Hosts ab; die vollständige Demo
kannst du mit `npm run client` beziehungsweise dem MCP Inspector durchspielen.

## Was zu sehen ist

- `src/server.ts`: die Factory `buildServer()` mit `registerTool`, `registerResource`, `registerPrompt`. Das Tool `confirm-demo` liefert in Runde 1 `resultType: "input_required"` und führt erst in Runde 2 aus.
- `src/client.ts`: ein Client, der auf `2026-07-28` festgelegt ist (`versionNegotiation: { mode: { pin } }`), `elicitation` als Capability deklariert und die Rückfrage per Handler beantwortet.
- `scripts/curl-demo.sh`: `server/discover` statt `initialize`, Header `Mcp-Method` und `Mcp-Name`, `_meta`-Envelope mit `protocolVersion` und `clientCapabilities`, die zwei Runden von `confirm-demo` als einzelne Requests sowie die eingebaute Kompatibilität mit einem 2025-era `initialize`.
- `inspector.json`: `protocolEra: "modern"` ist nötig, weil der Inspector standardmässig als 2025-Client spricht.

**Erkenntnis:** Jeder Request ist vollständig und unabhängig. Es gibt keinen Handshake und keine Session-ID; der Server kann hinter einem Load Balancer beliebig skaliert werden.

## Was nicht zu sehen ist

- Kein Webshop, keine Domain-Logik: nur der Mechanismus.
- Keine Authentifizierung (siehe [Theorieunterlagen, Abschnitt Authorization](../../00-course-material/teil-2-theorie--app-in-der-ki.md#8-authorization-überblick)).
- Kein eigener Legacy-Transport: HTTP und stdio verwenden ausschließlich die eingebaute Versionsaushandlung des SDK. Ein zusätzlicher, projektspezifischer Kompatibilitäts-Layer ist nicht vorgesehen.
