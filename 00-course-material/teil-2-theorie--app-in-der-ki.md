#  Teil 2 · App in der KI: MCP und MCP Apps

In Teil 1 kam die KI in die App: Die App hostet das Modell, zahlt dafür und bestimmt das Chat-Interface. In Teil 2 dreht sich das Verhältnis um. Der KI-Assistent (Claude, ChatGPT, Claude Code, ...) ist die Oberfläche, und der Webshop stellt seine Funktionen über ein standardisiertes Protokoll bereit: das Model Context Protocol (MCP). Dieselben lokal enthaltenen Tools werden dabei nicht mehr im AI SDK registriert, sondern in einem MCP-Server.

Unterlagen dieses Teils:

| Schritt | Ordner |
|---|---|
| Demo: minimaler Server | [01-hello-mcp/EXERCISE.md](../20-app-in-the-ai/01-hello-mcp/EXERCISE.md) |
| Übung: Webshop als MCP-Server | [02-webshop-mcp-server/README.md](../20-app-in-the-ai/02-webshop-mcp-server/README.md), [EXERCISE.md](../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md) |
| Musterlösung | [02-webshop-mcp-server-solution/README.md](../20-app-in-the-ai/02-webshop-mcp-server-solution/README.md) |
| Übung: MCP-App mit UI | 03-webshop-mcp-app (siehe Abschnitt "MCP Apps") |

## 1. Was MCP ist

MCP ist ein offenes Protokoll (JSON-RPC 2.0), über das ein KI-Assistent externe Fähigkeiten und Daten einbindet. Es wurde im November 2024 von Anthropic veröffentlicht und liegt seit 2025 bei der Linux Foundation (Agentic AI Foundation). Drei Rollen:

- **Host**: die Anwendung, in der das Modell läuft und die Benutzerin oder der Benutzer bedient (Claude Desktop, ChatGPT, Claude Code, Cursor, VS Code, ...). Der Host entscheidet, welche Server verbunden werden, und zeigt Rückfragen und Bestätigungen an.
- **Client**: die Protokoll-Komponente im Host, eine pro verbundenem Server.
- **Server**: ein Programm, das Fähigkeiten anbietet. Im Workshop: der Webshop.

Ein Server stellt drei Arten von Primitiven bereit:

| Primitiv | Wer löst aus | Beispiel im Webshop |
|---|---|---|
| **Tools** | das Modell | `searchProducts`, `addToCart`, `checkout` |
| **Resources** | die Anwendung / der Host (Kontext oder App-UI) | `ui://webshop/cart` |
| **Prompts** | die Benutzerin oder der Benutzer (Vorlagen, z. B. als Slash-Command) | `greet` in Hello MCP |

Zwei Transporte:

- **stdio**: Der Host startet den Server als Kindprozess und spricht über stdin/stdout. Lokal, keine Netzwerkkonfiguration, kein Auth. stdout ist der Protokollkanal; Logs gehören auf stderr.
- **Streamable HTTP**: Der Server ist ein HTTP-Endpunkt (im Workshop `/mcp`). Ein POST pro Request, Antwort als JSON oder bei Bedarf als Server-Sent-Events-Stream. Für entfernte Server, Tunnel, Deployment.

Wer MCP nutzt: Alle grossen Hosts (Claude, ChatGPT, Gemini, Copilot, Cursor, Windsurf, Zed, ...) sprechen es. Unternehmen stellen ihre SaaS-Produkte als MCP-Server bereit (GitHub, Atlassian, Stripe, Notion, ...), und interne Teams binden eigene Systeme an. Für den Webshop heisst das: Ein Server, erreichbar aus jedem Assistenten, ohne eigene Chat-UI und ohne eigene Modellkosten.

## 2. Die Revision 2026-07-28

Die Spezifikation wird jährlich revidiert. Die Revision vom 28. Juli 2026 ist die grösste Änderung seit Bestehen des Protokolls. Hauptziel: ein zustandsloser Kern, der wie gewöhnliche Web-APIs skaliert. Die konkreten Punkte:

1. **Kein `initialize`-Handshake, keine Session.** Bisher öffnete jeder Client eine Session (`initialize`, `notifications/initialized`, Header `Mcp-Session-Id`), und der Server musste sie sich merken. Jetzt ist jeder Request vollständig und unabhängig. Es gibt keinen `Mcp-Session-Id`-Header und keinen GET-Stream mehr (GET auf `/mcp` ergibt 405).
2. **`server/discover`** ersetzt `initialize`: Ein Client fragt Capabilities und unterstützte Versionen ab, ohne etwas zu eröffnen. Die Server-Identität (`serverInfo`) steht in jeder Antwort unter `_meta`.
3. **`_meta`-Envelope in jedem Request:** `params._meta` trägt `io.modelcontextprotocol/protocolVersion` und `io.modelcontextprotocol/clientCapabilities` (Pflicht), optional `clientInfo`. Was früher in der Session stand, reist jetzt mit jedem Aufruf mit.
4. **Pflicht-Header `Mcp-Method` und `Mcp-Name`:** Der HTTP-Header nennt die JSON-RPC-Methode und bei `tools/call`, `resources/read`, `prompts/get` den Namen bzw. die URI. Damit können Load Balancer, Gateways und Auth-Proxys routen und autorisieren, ohne den Body zu parsen. Stimmen Header und Body nicht überein, antwortet der Server mit `-32020`.
5. **`resultType`:** Jedes Resultat sagt, ob es `complete` ist oder `input_required` (siehe Punkt 6).
6. **Multi-Round-Trip-Requests (MRTR)** ersetzen die vom Server ausgelösten Anfragen an den Client (Elicitation, Sampling, Roots). Ein Server, der eine Rückfrage braucht, antwortet mit `resultType: "input_required"` und beschreibt die gewünschte Eingabe (`inputRequests`). Der Client holt sie ein und wiederholt den Aufruf mit `inputResponses`. Ein optionales, signiertes `requestState` lässt den Server Zwischenzustand beim Client parken. Der Server bleibt dabei zustandslos.
7. **`subscriptions/listen`:** Resource-Updates und andere Benachrichtigungen laufen über einen eigenen, explizit geöffneten SSE-Stream statt über den Session-Stream.
8. **Cache-Hinweise auf Listen-Resultaten:** `tools/list`, `resources/list`, `prompts/list` tragen `ttlMs` und `cacheScope` (`private` oder `public`), damit Hosts Listen nicht bei jedem Turn neu laden.
9. **Tasks und Apps sind Extensions:** Lang laufende Aufrufe (Tasks) und Tools mit UI (MCP Apps) sind nicht Teil des Kerns, sondern im Extensions-Framework spezifiziert. Der Kern bleibt klein.
10. **Deprecations:** Roots, Sampling und Logging (`logging/setLevel`, `notifications/message`) sind deprecated. Ersatz: MRTR für Roots/Sampling, stderr oder OpenTelemetry für Logging.
11. **12-Monats-Regel:** Deprecierte Elemente bleiben mindestens zwölf Monate in der Spezifikation. SDKs bedienen beide Generationen; im TypeScript SDK v2 ist das der Default (`legacy: 'stateless'`). Die Webshop-Stufen verwenden den SDK-Default und ergänzen keinen eigenen Legacy-Transport.

In `01-hello-mcp/scripts/curl-demo.sh` sind diese Punkte als rohe HTTP-Requests nachvollziehbar.

## 3. Was "stateless" für das Anwendungsdesign bedeutet

Ein zustandsloser MCP-Transport darf Identität nicht an eine Verbindung koppeln. Der Workshop verwendet deshalb Demo-Konten statt Authentifizierung: kein Passwort und kein Login-Token, sondern eine explizite `loginId` in jedem kontogebundenen MCP-Aufruf. Drei Konsequenzen:

- **Explizite Identität.** Das Modell nennt beispielsweise `hotel-alpenblick` bei `getCart`, `addToCart`, `removeFromCart`, `checkout` und `getOrders`. `searchProducts` akzeptiert die `loginId` optional. Es gibt kein `createCart`-Tool.
- **Cart→Order-Lifecycle.** Das erste Hinzufügen erzeugt intern einen aktiven Cart. Checkout übernimmt dessen ID als `orderId`, speichert einen Snapshot in der Bestellhistorie und entfernt den aktiven Cart; das nächste Hinzufügen erzeugt eine neue ID. Die letzten zwanzig Orders bleiben pro Demo-Konto im Speicher.
- **Skalierung.** Weil kein Request vom vorherigen abhängt, kann jeder Request auf einer anderen Instanz landen. Der Zustand selbst (die Warenkörbe) muss dann in einem gemeinsamen Speicher liegen (Datenbank, Redis); im Workshop ist es eine In-Memory-Map pro Prozess.
- **Load Balancer und Gateways** sehen in `Mcp-Method`/`Mcp-Name`, was ein Request tut, und können `tools/call checkout` anders behandeln als `tools/list` (Rate-Limits, Auth-Scopes, Audit).

Browser, Chat, HTTP-MCP und MCP Apps teilen im selben Serverprozess den kontogebundenen In-Memory-State. Ein separat gestarteter stdio-Server hat eigenen Zustand. Teil 3 verwendet für WebMCP das im Browser ausgewählte Demo-Konto; dort ist keine `loginId` im Tool-Schema nötig.

## 4. Tool-Design für Modelle

Das Schema eines Tools ist das User Interface gegenüber dem Modell. Regeln, die sich in der Übung bewähren:

- **Beschreibungen** sagen, was das Tool tut, was es zurückgibt und wann es (nicht) aufgerufen werden soll (`toolDescriptions` in lokalen Shop-Core; `checkout` verlangt ausdrückliche Bestätigung). Jeder Parameter bekommt eine `describe()`-Erklärung.
- **Kleine Resultate.** `searchProducts` liefert fünf Treffer mit den Feldern, die das Modell für eine Antwort braucht, nicht die ganze Katalog-Antwort. Tokens kosten Geld und Aufmerksamkeit.
- **Duale Resultate.** `content` (Text-JSON) ist für das Modell, `structuredContent` für Code und UI. Mit `outputSchema` validiert das SDK die Struktur und der Host kann sie typisiert weiterverwenden (Teil 2c baut darauf die UI).
- **Fehler als Werte.** `{ ok: false, error }` plus `isError: true` statt Exceptions: Das Modell liest den Fehler und korrigiert sich (z. B. eine falsche Artikelnummer).
- **Annotations** (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) sind Hinweise an den Host: Lesende Tools darf er ohne Nachfrage ausführen, destruktive bestätigen lassen. Sie sind nicht verbindlich und ersetzen keine Sicherheitsmassnahme im Server.

## 5. Human-in-the-loop mit MRTR

Für Seiteneffekte wie `checkout` reicht die Tool-Beschreibung nicht: Das Modell könnte den Aufruf trotzdem absetzen. Mit einem Multi-Round-Trip-Request erzwingt der Server die Rückfrage. Ablauf (Musterlösung, `src/tools/checkout.ts`):

1. Runde 1: Der Handler findet in `ctx.mcpReq.inputResponses` keine Antwort und liefert `inputRequired({ inputRequests: { confirm: inputRequired.elicit({ message, requestedSchema }) } })`. Auf dem Draht: `resultType: "input_required"`.
2. Der Host zeigt die Rückfrage als Formular an (Inspector) oder als Dialog (Claude).
3. Runde 2: Der Client wiederholt den Aufruf mit `inputResponses.confirm`. `acceptedContent(...)` liefert die validierte Antwort; bei `confirm: true` wird bestellt, sonst ein Fehler-Resultat zurückgegeben. `inputResponse(...)` unterscheidet `accept`, `decline` und `cancel`.

Der Client muss die Capability `elicitation` deklarieren; der SDK-Client beantwortet Rückfragen über einen Handler für `elicitation/create` und wiederholt den Aufruf automatisch. Mit `inputRequired.createMessage()` und `inputRequired.listRoots()` funktionieren Sampling und Roots nach demselben Muster. Für Hosts der alten Generation übersetzt das SDK (`legacyShim`) die Rückfrage in die frühere Server-zu-Client-Anfrage.

## 6. Testen

- **MCP Inspector 2.x** (`npx @modelcontextprotocol/inspector@latest`): Web-UI (`--web`), CLI (`--cli`) und TUI. Standard-Ära ist `legacy`; gegen einen 2026-07-28-only-Server muss in der Server-Konfiguration `protocolEra: "modern"` stehen (`inspector.json` in jedem Package). Die CLI kann MRTR-Tools nicht beantworten; Rückfragen in der Web-UI testen. Dokumentation: https://github.com/modelcontextprotocol/inspector
- **curl**: `01-hello-mcp/scripts/curl-demo.sh` zeigt die Pflicht-Header, den `_meta`-Envelope, beide MRTR-Runden und zwei Fehlerfälle.
- **SDK-Client** (`@modelcontextprotocol/client`): `src/client.ts` in jedem Package. Wichtig: `versionNegotiation: { mode: { pin: '2026-07-28' } }`, sonst spricht der Client als 2025-Client und wird mit `-32022` abgewiesen.

## 7. Abnahme in Claude, ChatGPT und Goose

Claude und ChatGPT sind verpflichtende manuelle Abnahmen: Toolliste, Suche, kontogebundener Warenkorb und Checkout müssen funktionieren; bei MCP Apps müssen Search- und Cart-UI rendern. Goose wird mit demselben modernen HTTP-Endpunkt best effort geprüft und das Ergebnis protokolliert. Für Goose wird kein eigener Legacy-Transport gebaut.

- **Remote-URL (empfohlen)**: Derselbe Streamable-HTTP-Endpunkt funktioniert in Claude Desktop, Claude Web und ChatGPT Web. Der Server muss öffentlich erreichbar sein, z. B. per Tunnel (`ngrok http 3042`, `cloudflared tunnel --url http://localhost:3042`), und die Connector-URL muss den Pfad `/mcp` enthalten. Auch Claude Desktop ruft Remote-Connectoren aus der Anthropic-Cloud auf; `localhost` funktioniert deshalb nur mit dem alternativen lokalen Transport. In Claude wird der Server unter `Customize > Connectors > Add custom connector` hinzugefügt. In ChatGPT zuerst unter `Settings > Security and login` den Developer Mode aktivieren und danach auf der Plugins-Seite eine Developer-App mit der MCP-URL erstellen. `createMcpExpressApp({ host, allowedHosts })` muss den Tunnel-Host erlauben (DNS-Rebinding-Schutz).
- **stdio (Alternative für Claude Desktop)**: Eintrag in `claude_desktop_config.json` mit `command: "node"` und dem absoluten Pfad zu `src/stdio.ts`; für Claude Code `claude mcp add`. Dafür ist kein Tunnel nötig. Die getrennten Abnahmeschritte stehen in [Übung 2b](../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md).
- **Privater Remote-Zugang**: ChatGPT unterstützt als Alternative zu einer öffentlichen URL den OpenAI Secure MCP Tunnel. Für Claude ist der lokale `stdio`-Weg die einfache Variante ohne öffentliche Freigabe.
- **Sicherheit**: Der Workshop-Server hat keine Authentifizierung. Öffentliche Entwicklungstunnel nur mit Mock-Daten verwenden und nach der Demo stoppen.
- Unterstützt ein Host die Revision 2026-07-28 noch nicht, `legacy: 'reject'` entfernen; das SDK bedient dann beide Generationen über denselben Endpunkt.

## 8. Authorization (Überblick)

Remote-Server schützen sich mit OAuth 2.1: Der Server ist eine Protected Resource, veröffentlicht unter `/.well-known/oauth-protected-resource`, welcher Authorization Server zuständig ist, und verlangt Bearer-Tokens. Der Host führt die Benutzerin oder den Benutzer durch den Login. Neu seit 2025-11 und in 2026-07-28 der Standardweg: **Client ID Metadata Documents** (CIMD) ersetzen die Dynamic Client Registration. Ein Client identifiziert sich über eine HTTPS-URL, unter der seine Metadaten liegen, statt sich bei jedem Server einzeln zu registrieren. Das SDK bringt `requireBearerAuth` und die Metadata-Helfer mit; im Workshop bleibt der Server ohne Auth.

## 9. MCP versus CLI + Skills

Eine Alternative zu MCP ist, dem Agenten ein Kommandozeilenwerkzeug und eine Anleitung ("Skill") zu geben, wie er es bedient. Trade-off:

| | MCP-Server | CLI + Skill |
|---|---|---|
| Integration | jeder Host, typisierte Schemas, Annotationen, Rückfragen | nur Hosts mit Shell-Zugriff (Coding-Agenten) |
| Kontextkosten | Tool-Schemas belegen Kontext bei jedem Turn | Skill wird nur bei Bedarf geladen |
| Sicherheit | abgegrenzte Operationen, Auth pro Server | Shell-Rechte des Agenten |
| Benutzer ohne Terminal | ja (Claude Desktop, ChatGPT) | nein |
| UI | MCP Apps | keine |

Faustregel: Für Endbenutzer-Integrationen in Assistenten MCP; für Entwickler-Workflows in Coding-Agenten oft CLI + Skill. Beides kann denselben Core nutzen.

## 10. MCP Apps: Tools mit eingebetteter Oberfläche

Demo und Übung: [03-webshop-mcp-app/README.md](../20-app-in-the-ai/03-webshop-mcp-app/README.md), [03-webshop-mcp-app/EXERCISE.md](../20-app-in-the-ai/03-webshop-mcp-app/EXERCISE.md), Musterlösung [03-webshop-mcp-app-solution/README.md](../20-app-in-the-ai/03-webshop-mcp-app-solution/README.md).

### Was eine MCP-App ist

Ein MCP-Tool liefert Text und `structuredContent`; was der Host daraus macht, entscheidet der Host. MCP Apps erweitern das: Ein Tool verweist über `_meta.ui.resourceUri` auf eine Resource mit dem Schema `ui://` und dem MIME-Typ `text/html;profile=mcp-app`. Der Host liest die Resource (ein einzelnes, in sich geschlossenes HTML-Dokument), rendert sie in einem sandboxed iframe neben der Chat-Antwort und verbindet sie über eine Bridge mit dem Gespräch.

Bausteine:

- **Tool mit UI-Metadaten**: `_meta: { ui: { resourceUri: 'ui://webshop/search-ui.html' } }`. Der flache Schlüssel `"ui/resourceUri"` ist die ältere Form und wird für ältere Hosts zusätzlich gesetzt.
- **`ui://`-Resource**: normale MCP-Resource (`resources/list`, `resources/read`), Inhalt ist das gebaute HTML. Im Workshop erzeugt Vite mit `vite-plugin-singlefile` pro App eine Datei `dist/*.html`, der Server liefert sie im Resource-Callback aus.
- **iframe-Sandbox**: Die App läuft isoliert vom Host. Netzwerkzugriffe sind durch eine Content-Security-Policy eingeschränkt, die der Server in `_meta.ui.csp` deklariert (`resourceDomains` für Bilder und Fonts, `connectDomains` für fetch/XHR, `frameDomains`, `baseUriDomains`). Weitere Berechtigungen (z. B. Kamera, Mikrofon, Clipboard) stehen in `_meta.ui.permissions`.
- **Host-Bridge**: Host und App kommunizieren per `postMessage` mit JSON-RPC. Der Host schickt Tool-Input, Tool-Resultat und Kontextänderungen (Theme, Grösse, Sprache); die App schickt Tool-Aufrufe, Nachrichten und Grössenänderungen.
- **`visibility`**: `_meta.ui.visibility: ['model']` (Standard: nur das Modell ruft das Tool auf), `['app']` (nur die App darf es aufrufen, das Modell sieht es nicht), `['model', 'app']` (beide).

**Erkenntnis:** Im Demo-Server ist der Unterschied zwischen einem reinen Tool und seiner MCP-App-Darstellung der `_meta`-Eintrag mit `ui://`-Resource. Die Tool-Logik und explizite `loginId` bleiben identisch.

### Geschichte und Stand

- 2025: Mehrere Vorläufer nebeneinander: **MCP-UI** (Community, `ui://`-Resources mit eingebettetem HTML oder Remote-DOM), **OpenAI Apps SDK** (ChatGPT, `window.openai`-Bridge, eigene `_meta`-Schlüssel).
- November 2025: **MCP Apps** als gemeinsamer Vorschlag von Anthropic, OpenAI und den MCP-UI-Autoren (SEP-1865), offizielle Extension seit Januar 2026, Referenz-SDK `@modelcontextprotocol/ext-apps`.
- Spezifikation 2026-07-28: Apps sind Teil des neuen Extensions-Frameworks (Extension-ID `io.modelcontextprotocol/ui`); Hosts melden ihre Unterstützung in den Client-Capabilities, Server können darauf reagieren.
- Hosts, die Apps rendern (Stand August 2026): Claude (Web, Desktop), ChatGPT, VS Code GitHub Copilot, Microsoft 365 Copilot, Goose, Postman, Cursor; zum Entwickeln MCP Inspector 2.x, der `basic-host` aus dem ext-apps-Repository und der MCPJam-Inspector.
- Verteilung nach dem "App-Store"-Modell: Claude Connectors (Custom Connector per URL oder Verzeichnis), ChatGPT Apps Directory (Review-Prozess), Plattformen wie alpic.ai für Hosting und Veröffentlichung. Ein MCP-Server mit Apps ist damit ein Verteilkanal ohne eigene Frontend-Infrastruktur.

### Das App-API (ext-apps)

In der UI (`@modelcontextprotocol/ext-apps/react`):

```tsx
const { app, error } = useApp({
  appInfo: { name: 'Webshop Warenkorb', version: '1.0.0' },
  capabilities: {},
  onAppCreated: (app) => {
    app.ontoolinput = (params) => { /* params.arguments, vor dem Resultat */ }
    app.ontoolresult = (result) => { /* CallToolResult: content, structuredContent, isError */ }
    app.onhostcontextchanged = (ctx) => { /* theme, displayMode, containerDimensions, locale */ }
  },
})
useHostStyles(app) // CSS-Variablen und Fonts des Hosts übernehmen
```

Methoden der App:

| Methode | Wirkung |
|---|---|
| `app.callServerTool({ name, arguments })` | Tool-Aufruf auf dem MCP-Server, über den Host geleitet |
| `app.readServerResource`, `app.listServerResources` | Resources lesen |
| `app.sendMessage({ role: 'user', content })` | Nachricht in den Chat; das Modell antwortet |
| `app.updateModelContext({ content })` | Kontext für das Modell nachführen, ohne Antwort |
| `app.openLink`, `app.downloadFile`, `app.requestDisplayMode` | Host-Funktionen (Link, Download, Inline/Fullscreen) |
| `app.getHostContext()` | Theme, Sprache, Abmessungen, Host-Capabilities |

Auf dem Server (SDK v2, nativ):

```ts
server.registerTool('getCart', {
  inputSchema: z.object({ loginId: z.string().min(1) }),
  outputSchema: cartOutput,
  _meta: { ui: { resourceUri: CART_UI_URI }, 'ui/resourceUri': CART_UI_URI },
}, handler)

server.registerResource('Webshop Warenkorb', CART_UI_URI,
  { mimeType: RESOURCE_MIME_TYPE, _meta: { ui: { csp: { resourceDomains: ['https://webshop.transgourmet.ch'] } } } },
  async () => ({ contents: [{ uri: CART_UI_URI, mimeType: RESOURCE_MIME_TYPE, text: html, _meta: { ui: { csp: ... } } }] }))
```

**Erkenntnis:** Der Ablauf beim Tool-Aufruf ist im Inspector nachvollziehbar: `tools/call` -> Host liest `ui://` -> iframe -> `ui/notifications/tool-input` -> `ui/notifications/tool-result`. Klicks in der App erzeugen weitere `tools/call`-Einträge in der History, obwohl das Modell nichts aufgerufen hat.

### ext-apps und SDK v2

`@modelcontextprotocol/ext-apps` 1.7.x deklariert `@modelcontextprotocol/sdk` (v1) als Peer-Dependency; seine Helfer `registerAppTool`/`registerAppResource` sind gegen die v1-Typen geschrieben. Die Migration auf `@modelcontextprotocol/server` v2 ist offen (ext-apps#702). Für den Server im Workshop heisst das: SDK v2 verwenden, Tools und Resources nativ registrieren, aus ext-apps nur Konstanten (`RESOURCE_MIME_TYPE`, `RESOURCE_URI_META_KEY`) und Typen (`McpUiToolMeta`, `McpUiResourceMeta`) importieren. Das v1-SDK wird von npm als Peer mitinstalliert, bleibt aber ungenutzt. Das Browser-API (`useApp`) ist vom Server-SDK unabhängig.

### Entwurfsüberlegungen

- **Daten für das Modell vs. Daten für die UI.** Beide kommen aus demselben Tool-Resultat: `content` ist kompakter Text für das Modell (Token-Kosten), `structuredContent` ist das vollständige Objekt für die App (z. B. `celumId` für Produktbilder). `outputSchema` beschreibt den zweiten Kanal.
- **Die UI ist Renderer und Client zugleich.** Sie empfängt `ontoolresult` und ruft über `callServerTool` selbst Tools auf. Damit ist ein "Zwischenstand" möglich, den das Modell nicht sieht.
- **Das Modell weiss nur, was ihm gesagt wird.** UI-Aktionen sind für das Modell unsichtbar, bis die App `updateModelContext` (stiller Kontext) oder `sendMessage` (löst eine Antwort aus) verwendet. Beides bewusst und sparsam einsetzen.
- **Identität im Input, nicht in der Verbindung.** Die `loginId` wandert als Tool-Argument und im strukturierten Resultat; die App übernimmt sie in ihren React-State.
- **Sicherheit.** Die App läuft in einer Sandbox mit serverseitig deklarierter CSP; alle Netzwerkzugriffe ausser den deklarierten Domains sind blockiert. Tool-Aufrufe aus der App laufen über den Host, der sie wie Modell-Aufrufe behandeln und bestätigen lassen kann.
- **Eine App pro Tool-Familie.** Such- und Warenkorb-App sind zwei Resources; mehrere Tools dürfen auf dieselbe Resource zeigen. Die App unterscheidet anhand von `ontoolinput`/`ontoolresult`, was sie anzeigt.

### Links

- Extension-Übersicht: https://modelcontextprotocol.io/extensions/apps/overview
- API-Referenz ext-apps: https://apps.extensions.modelcontextprotocol.io/api/
- Repository (Beispiele, basic-host): https://github.com/modelcontextprotocol/ext-apps
- OpenAI Apps SDK (ChatGPT-Hosting, Apps Directory): https://developers.openai.com/apps-sdk
- Client-Matrix (welche Hosts Apps rendern): https://modelcontextprotocol.io/extensions/client-matrix

## 11. Ausblick

- **Tasks** (Extension): lang laufende Aufrufe mit Status-Abfrage, z. B. eine Bestellung, die auf Freigabe wartet.
- **Registry und Distribution**: das offizielle MCP-Registry und die App-Verzeichnisse der Hosts.
- **Ende der Übergangsfrist**: Ab Mitte 2027 können Hosts die 2025-Generation abschalten; Server, die heute `legacy: 'stateless'` nutzen, sollten bis dahin geprüft sein.

## Quellen

- Spezifikation, Changelog 2026-07-28: https://modelcontextprotocol.io/specification/2026-07-28/changelog
- Release-Blog: https://blog.modelcontextprotocol.io/posts/2026-07-28/
- TypeScript SDK v2: https://ts.sdk.modelcontextprotocol.io/v2/ (Migration 2026-07-28: https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28)
- MCP Inspector: https://github.com/modelcontextprotocol/inspector (Server-Konfiguration: https://github.com/modelcontextprotocol/inspector/blob/main/docs/mcp-server-configuration.md)
- Authorization: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
