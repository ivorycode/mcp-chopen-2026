# Übung 3 · MCP Apps

## Ziel der Übung

Du erweiterst den vorhandenen MCP-Server um zwei interaktive Oberflächen:
Die **Search-App** zeigt Produktkarten mit Mengenwahl und Warenkorbbutton;
die **Cart-App** zeigt den Warenkorb und ermöglicht Entfernen und Bestellen.
Ein MCP-App-fähiger Host stellt sie direkt beim Tool-Resultat dar.

Am Ende kannst du folgenden Ablauf demonstrieren: Du nennst einem Assistenten
`hotel-alpenblick` als Demo-Konto und suchst nach Vollmilch. Zum Suchresultat
erscheint die Search-App. Du legst per Button zwei Verkaufseinheiten in den
Warenkorb, lässt dir den Warenkorb anzeigen und schliesst die Mock-Bestellung
in der Cart-App ab. Der parallel geöffnete Webshop zeigt nach dem Aktualisieren
für dasselbe Konto dieselben Daten und dieselbe Order-ID.

Als **Host** bezeichnen wir das Programm, das die MCP-App anzeigt, zum Beispiel
Claude Desktop oder den lokalen Testhost. Die **Host-Bridge** (englisch für
„Brücke“) ist die Nachrichtenverbindung zwischen dieser eingebetteten App und
dem Host: Über sie erhält die App Daten und kann den Host bitten, ein Tool
aufzurufen. Den genauen Ablauf findest du unten unter **Wie die Teile zusammenarbeiten**.

Dabei lernst du:

- HTML-Oberflächen als MCP-Resources bereitzustellen;
- Tools über `_meta.ui.resourceUri` mit der passenden Oberfläche zu verbinden;
- Tool-Argumente und strukturierte Resultate in einer React-App zu verarbeiten;
- weitere Tools aus der App über die Host-Bridge aufzurufen;
- Konto, Warenkorb und Bestellung über mehrere Oberflächen hinweg zu prüfen.

Die Übung verwendet Demo-Konten und Mock-Bestellungen. `loginId` bezeichnet
das Konto; sie ist kein Passwort und keine OAuth-Anmeldung.

## Was bereits implementiert ist

Dieser Starter ist eine eigenständig installierbare Kopie der vorherigen
MCP-Server-Musterlösung mit vorbereitetem MCP-App-Gerüst. Du musst die früheren
Übungen nicht zuerst in dieses Verzeichnis kopieren.

| Baustein                        | Bereits möglich                                                                                            | Deine Ergänzung                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Webshop und Web-API             | Konto auswählen, Produkte suchen, Warenkorb ändern, Mock-Bestellung abschliessen, Bestellhistorie anzeigen | Keine                                                   |
| Assistant und Workspace `/chat` | Beide Chat-Modi inklusive Tools und Freigabe für vom Modell angeforderten Checkout                         | Keine; echte Chat-Anfragen benötigen einen Provider-Key |
| MCP-Server                      | Alle sechs Tools, Konto-Prüfung, strukturierte Resultate, HTTP und stdio                                   | Metadaten für die App-Zuordnung                         |
| HTML-Build                      | React, Styles und JavaScript werden in zwei einzelne HTML-Dateien gebaut                                   | Keine                                                   |
| Resource-Helfer                 | HTML lesen, MIME-Type und CSP-Metadaten bereitstellen                                                      | Search- und Cart-Resource registrieren                  |
| Search-App                      | Produktkarten, Suchformular, erneute Suche über die Bridge, Resultatparser, Fehleranzeige                  | Konto übernehmen und Hinzufügen verbinden               |
| Cart-App                        | Warenkorbdarstellung, Kontoübernahme, Bestellbestätigung, vorbereitete Aktionsfunktionen                   | Bridge-Aufruf für Entfernen und Checkout ergänzen       |
| Host und Tests                  | Lokaler Host mit Sandbox, Protokolltests und Browser-Tests                                                 | Nach jedem Schritt verwenden                            |

Diese MCP-Tools funktionieren **schon vor der Übung**, auch die schreibenden:

| Tool             | Argumente                                                      | Verhalten                                            |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| `searchProducts` | `term`, optional `loginId`                                     | Produkte suchen; Konto an die Such-App weiterreichen |
| `getCart`        | `loginId`                                                      | Warenkorb lesen                                      |
| `addToCart`      | `loginId`, `articleNumber`, optional `quantity` (Standard `1`) | Verkaufseinheiten hinzufügen                         |
| `removeFromCart` | `loginId`, `articleNumber`                                     | Ganze Warenkorbposition entfernen                    |
| `checkout`       | `loginId`                                                      | Mock-Bestellung erstellen und Warenkorb leeren       |
| `getOrders`      | `loginId`                                                      | Warenkorb samt Bestellverlauf liefern                |

Offen sind die mit `TODO Schritt 1` bis `TODO Schritt 6` markierten Stellen in
vier Dateien. Die Nummerierung unten entspricht diesen Kommentaren. Alle
Dateipfade in den Implementierungsschritten sind relativ zu diesem Starter.

## Wie die Teile zusammenarbeiten

```text
Host (Inspector, lokaler Testhost, Claude Desktop oder ChatGPT)
  │ tools/call: searchProducts { term, loginId }
  ▼
MCP-Server /mcp ──► gemeinsame Shop-Logik ──► Mock-Katalog
  │ Tool-Resultat: content + structuredContent
  │ Tool-Metadaten: _meta.ui.resourceUri
  ▼
Host liest ui://webshop/search-ui.html über resources/read
  │ lädt HTML in eine Sandbox und übergibt Argumente/Resultat
  ▼
Search-App: Produktkarten
  │ Klick → app.callServerTool({ name: 'addToCart', arguments: ... })
  ▼
Host → MCP-Server → aktualisierter Warenkorb → App
```

`content` enthält eine Kurzmeldung und die JSON-Ergebnisdaten als Text für das
Modell; `structuredContent` enthält dieselben Daten für die App. Damit kann das
Modell auch dann mit Artikelnummern weiterarbeiten, wenn der Host nur `content`
in seinen Kontext übernimmt. Die Resource-URI ist eine MCP-Adresse und keine Browser-URL.
Die App ruft Tools über den Host auf. Für einen Buttonklick ist kein neuer
Modellentscheid erforderlich. Der Server prüft weiterhin Konto und Warenkorbregeln.

### Was macht die Bridge konkret?

Die Search-App läuft als kleine Webseite in einem **iframe**, einem abgegrenzten
Bereich innerhalb des Hosts. Die **Sandbox** schränkt ein, worauf diese Webseite
zugreifen darf. App und Host tauschen deshalb Nachrichten über einen vorgesehenen
Kanal aus. Technisch verwendet dieser Kanal die Browser-Funktion `postMessage`.
Das MCP-Apps-SDK übernimmt das Nachrichtenformat und die Zuordnung von Antworten.
Siehe die [MCP-Apps-Architektur](https://modelcontextprotocol.io/extensions/apps/overview).

Beim Klick auf **In den Warenkorb** passiert Folgendes:

1. Die Search-App ruft `app.callServerTool(...)` mit Tool-Name, Konto,
   Artikelnummer und Menge auf. Das ist eine Bitte an den Host.
2. Die Bridge übermittelt diese Nachricht an den Host.
3. Der Host ruft das MCP-Tool `addToCart` auf dem Webshop-Server auf.
4. Der Server prüft die Argumente, ändert den Warenkorb und liefert das Resultat.
5. Der Host gibt das Resultat über die Bridge an die Search-App zurück.
   Das `await` endet; die App kann den neuen Warenkorb anzeigen.

```text
Search-App im iframe ⇄ Bridge (Nachrichten) ⇄ Host ⇄ HTTP /mcp ⇄ Webshop-Server
```

In diesem Projekt stellt `useApp(...)` das Objekt `app` bereit. Im lokalen
Testhost ist die Gegenseite bereits mit `AppBridge` in
[test/support/mcp-host/host.ts](test/support/mcp-host/host.ts) implementiert.
Du musst keine eigene Bridge bauen, sondern die vorbereitete Verbindung benutzen.

Diese Namen wirst du im Code wiederfinden:

| API                           | Richtung und Aufgabe                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `ontoolinput`                 | Host → App: Argumente des ursprünglichen Tool-Aufrufs empfangen, etwa die `loginId`    |
| `ontoolresult`                | Host → App: Resultat des ursprünglichen Tool-Aufrufs empfangen und anzeigen            |
| `app.callServerTool(...)`     | App → Host → Server: weiteres Tool aufrufen; die Antwort kommt als Rückgabewert zurück |
| `app.updateModelContext(...)` | App → Host: dem Modell zusätzliche Informationen über die Aktion bereitstellen         |
| `app.sendMessage(...)`        | App → Host: eine Nachricht für das Gespräch senden                                     |

Eine **Capability** ist eine vom Host angekündigte unterstützte Funktion.
Nicht jeder Host unterstützt etwa Kontextmeldungen oder Gesprächsnachrichten.
Deshalb prüfen die vorbereiteten Funktionen diese Capabilities, bevor sie
`updateModelContext` oder `sendMessage` verwenden. Die eigentliche
Warenkorbänderung erfolgt durch `callServerTool`.

### Gemeinsamer Zustand über HTTP

Wir verwenden durchgehend **Streamable HTTP** unter
`http://localhost:3043/mcp`. Webshop und HTTP-MCP verwenden denselben
Prozessspeicher. `npm run start:stdio` startet dagegen einen separaten Prozess
mit eigenem Zustand. Bei einem Server-Neustart gehen Warenkörbe und Bestellungen
dieses Prozesses verloren; bereits geöffnete Ansichten bei Bedarf neu laden.

## Vorbereitung und erster Start

### Voraussetzungen und Arbeitsverzeichnis

Du brauchst Node.js **ab 22.19** und npm, einen Editor und einen Browser.
Damit erfüllst du auch die Node-Anforderung von Vite 8. Prüfe im Terminal:

```bash
node --version
npm --version
```

Für Webshop, MCP Inspector, lokalen Host und automatisierte Tests brauchst du
keinen LLM-API-Key. Ein Key ist nur für echte Chat-Anfragen im Webshop nötig;
Claude Desktop und ChatGPT verwenden ihre eigenen Zugänge.

Die folgenden `cd`-Befehle beginnen jeweils im **Repository-Root
`mcp-chopen-2026`**. Öffne dafür separate Terminals. Befehle ohne `cd` führst du
anschliessend im Starter-Verzeichnis `20-app-in-the-ai/03-webshop-mcp-app` aus.

### Terminal 1: Mock-Katalog starten

```bash
cd 01-mock-api
npm ci
npm start
```

Lass dieses Terminal laufen. Der Katalog liefert die Produktdaten auf Port
**4040**. Läuft er bereits aus einer früheren Übung, kannst du ihn weiterverwenden.

### Terminal 2: Starter installieren und starten

```bash
cd 20-app-in-the-ai/03-webshop-mcp-app
npm ci
```

Kopiere die Beispielkonfiguration **nur, wenn du hier noch keine `.env` hast**:

```bash
cp .env.example .env
```

Kontrolliere in `.env` diese bereits vorbereiteten Werte:

```dotenv
CATALOG_MODE=mock
MOCK_CATALOG_ORIGIN=http://localhost:4040
ENABLE_PUBLIC_MCP_GUARDS=false
```

Die Provider-Einstellungen kannst du für die MCP-App-Übung unverändert lassen.
Starte den Shop:

```bash
npm run dev
```

Der Befehl baut zuerst beide App-HTML-Dateien und startet danach Vite auf Port
**3043**. Lass auch dieses Terminal laufen. Prüfe in einem weiteren Terminal:

```bash
curl --fail http://localhost:4040/health
curl --fail http://localhost:3043/health
```

Beide Aufrufe müssen erfolgreich sein. Öffne den
[Webshop](http://localhost:3043), wähle `hotel-alpenblick`, suche nach `Vollmilch`
und probiere Hinzufügen und Entfernen aus. Warenkorb und Bestellhistorie sind
bereits bedienbar. Weitere Demo-Konten sind `restaurant-baeren` und
`kantine-campus`.

Der **Assistant** und der **Workspace** unter
[http://localhost:3043/chat](http://localhost:3043/chat) sind bereits implementiert.
Für einen echten Chat ergänze einen Provider-Key gemäss
[Setup-Anleitung](../../00-setup-check/README.md) und starte den Shop neu.
Ein fehlender Key verhindert die folgenden MCP-Schritte nicht.

### Terminal 3: MCP Inspector verbinden und Ausgangszustand prüfen

Ausgehend vom Repository-Root:

```bash
cd 20-app-in-the-ai/03-webshop-mcp-app
npm run inspector
```

Das Skript startet `npx @modelcontextprotocol/inspector@latest --web --config inspector.json`.
Beim ersten Start lädt `npx` das Paket nach; bestätige eine eventuelle
Installationsfrage. Öffne die im Terminal ausgegebene Browser-URL.

1. Wähle den vorbereiteten Server **webshop-local** und verbinde dich.
   Die Datei [inspector.json](inspector.json) enthält Transport **HTTP**,
   URL `http://localhost:3043/mcp` und `protocolEra: "modern"`.
   Bei manueller Einrichtung wähle HTTP / Streamable HTTP, nicht SSE oder stdio.
   Der zweite Eintrag **webshop-remote** zeigt auf die öffentliche Demo
   <https://mcp-webshop-demo.fly.dev/mcp>. Dort sind die MCP-Apps dieser Übung
   bereits fertig; verbinde ihn zum Vergleich, wenn du sehen willst, wie die
   Resources und `_meta.ui`-Angaben am Ende aussehen sollen.
2. Öffne **Tools** und liste die Tools auf (`tools/list`). Du solltest alle
   sechs oben genannten Tools sehen.
3. Wähle `searchProducts`. Trage die folgenden Argumente im Formular oder
   JSON-Editor ein und führe das Tool aus (`tools/call`):

   ```json
   {
     "term": "Vollmilch",
     "loginId": "hotel-alpenblick"
   }
   ```

4. Prüfe `content` und `structuredContent`: Die Suche liefert Produkte mit
   Artikelnummern sowie die übergebene `loginId`. Eine verknüpfte MCP-App
   erscheint im unveränderten Starter noch nicht.
5. Rufe `getCart` mit `{"loginId":"hotel-alpenblick"}` auf. Du erhältst
   den aktuellen Warenkorb des zuvor im Browser verwendeten Kontos.
6. Unter **Resources** liefert `resources/list` zunächst eine leere Liste.
   Das ist die erste Lücke, die du schliesst.

Die Bezeichnungen der Inspector-Ansichten können sich mit `@latest` ändern;
als Orientierung stehen deshalb die MCP-Methoden in Klammern. Details zur
Konfiguration stehen in der
[offiziellen Inspector-Anleitung](https://github.com/modelcontextprotocol/inspector/blob/main/docs/mcp-server-configuration.md).

### Terminal 4: Lokalen MCP-App-Host starten

Ausgehend vom Repository-Root:

```bash
cd 20-app-in-the-ai/03-webshop-mcp-app
npm run dev:mcp-host
```

Öffne [http://127.0.0.1:43552](http://127.0.0.1:43552). Der Status sollte
**Verbunden** anzeigen. Der Host verwendet zusätzlich Port **43553** für die
Sandbox und verbindet sich über einen Proxy mit deinem MCP-Server auf 3043.

Das Formular simuliert den ersten Tool-Aufruf eines Assistenten. Wähle
**Produktsuche**, setze **Login-ID** auf `hotel-alpenblick` und **Suchbegriff**
auf `Vollmilch`. **App laden** meldet vor Schritt 2 erwartungsgemäss
`Tool hat keine MCP-App-Ressource.` Der Host ist bereit, die App-Zuordnung fehlt noch.

Die Login-ID im **Host-Formular** simuliert das Konto aus einem Gespräch.
Die eingebettete **Search-App selbst** bekommt bewusst keine Kontoauswahl.

### Arbeitsrhythmus während der Übung

Bearbeite den Quellcode im Editor. Nutze für einmalige Befehle ein zusätzliches
Terminal im Starter-Verzeichnis. Nach Änderungen an `SearchApp.tsx` oder
`CartApp.tsx` führe aus:

```bash
npm run build:apps
npm run typecheck
```

`build:apps` erzeugt `dist/search-ui.html` und `dist/cart-ui.html`, jeweils
inklusive JavaScript und CSS. Der Host liest diese Dateien; Vites Hot Reload
für den normalen Shop aktualisiert eine bereits eingebettete App nicht.
Klicke danach im lokalen Host erneut **App laden**. Im Inspector lade die
App neu beziehungsweise führe den Tool-Aufruf erneut aus.

Nach Resource- oder Tool-Metadaten-Änderungen verbinde den Inspector neu und
lade die Tool-/Resource-Liste erneut. Falls der Server noch alte Metadaten
liefert, beende `npm run dev` mit `Ctrl+C` und starte es erneut.

## Schritt 1: Die Search-Resource registrieren

**Datei:** [src/features/mcp-apps/register-ui-resources.ts](src/features/mcp-apps/register-ui-resources.ts)

Der Helfer `registerUiResource` ist fertig: Er registriert eine URI, liest bei
`resources/read` die HTML-Datei aus `dist` und setzt den MIME-Type
`text/html;profile=mcp-app` sowie die CSP-Metadaten. Du ergänzt seine Verwendung.

Erweitere den bestehenden Import aus `./resource-meta.ts`:

```ts
import { SEARCH_UI_URI, uiResourceMeta } from './resource-meta.ts'
```

Ersetze die leere Funktion am Dateiende durch:

```ts
export function registerUiResources(server: McpServer): void {
  registerUiResource(
    server,
    'Webshop Produktsuche',
    SEARCH_UI_URI,
    'search-ui.html',
  )
}
```

`server` ersetzt den bisherigen unbenutzten Parameter `_server`.
`SEARCH_UI_URI` ist bereits als `ui://webshop/search-ui.html` definiert.
Die Server-Factory ruft `registerUiResources(server)` schon auf.

Der vorhandene Helfer verwendet die native Registrierung des MCP SDK v2.
Behalte ihn bei: Die ext-apps-Registrierungshelfer sind in dieser Workshop-Version
gegen SDK v1 typisiert. MIME-Type und Metadaten für das Protokoll sind bereits
im Helfer umgesetzt. Die CSP erlaubt die von den Apps verwendeten Produktbilder
von `https://webshop.transgourmet.ch`.

**Prüfen:**

```bash
npm run build:apps
npm run typecheck
```

Verbinde den Inspector neu. `resources/list` muss genau die Search-Resource
zeigen. Wähle sie aus und lies sie mit `resources/read`. Erwartet werden
`contents[0].text` mit HTML, der genannte MIME-Type und CSP-Metadaten.
Der Suchaufruf hat noch keine zugeordnete Oberfläche; das folgt jetzt.

## Schritt 2: Das Suchtool mit der Search-App verbinden

**Datei:** [src/features/mcp/server.ts](src/features/mcp/server.ts)

Ergänze bei den Imports:

```ts
import { SEARCH_UI_URI, uiToolMeta } from '../mcp-apps/resource-meta.ts'
```

Suche die Registrierung von `searchProducts`. Ersetze dort den Kommentar
`TODO Schritt 2` durch diese Eigenschaft im Konfigurationsobjekt:

```ts
_meta: uiToolMeta(SEARCH_UI_URI),
```

Der relevante Ausschnitt innerhalb des Objekts sieht danach so aus:

```ts
inputSchema: searchProductsInput.extend({
  loginId: loginIdInput.optional(),
}),
annotations: { readOnlyHint: true, idempotentHint: true },
_meta: uiToolMeta(SEARCH_UI_URI),
```

Titel, Beschreibung und Callback bleiben erhalten. `uiToolMeta` liefert
`_meta.ui.resourceUri` und zusätzlich den kompatiblen flachen Schlüssel
`ui/resourceUri`. Die Metadaten gehören zur **Tool-Definition**, nicht in
`structuredContent` oder in den Callback.

**Prüfen:** Führe `npm run typecheck` aus, verbinde den Inspector neu und
kontrolliere in `tools/list` bei `searchProducts`:

```json
{
  "_meta": {
    "ui": {
      "resourceUri": "ui://webshop/search-ui.html"
    },
    "ui/resourceUri": "ui://webshop/search-ui.html"
  }
}
```

Rufe die Suche mit den Argumenten aus der Vorbereitung erneut auf und öffne
die App-Ansicht des Inspectors. Im lokalen Host klicke **App laden**. Jetzt
sollten **App bereit** und Produktkarten erscheinen. Suche innerhalb der App
nach `Kaffee`: Die erneute Suche über die Bridge ist bereits implementiert.
Die Warenkorbbuttons bleiben bis Schritt 3 deaktiviert.

## Schritt 3: Das Konto aus Tool-Argumenten und Resultaten übernehmen

**Datei:** [src/features/mcp-apps/search/SearchApp.tsx](src/features/mcp-apps/search/SearchApp.tsx)

Die Search-App muss das vom Host übermittelte Konto kennen, bevor sie etwas
hinzufügen kann. Ergänze dafür drei Stellen.

**a. State-Setter bereitstellen.** Ersetze die bisherige `loginId`-State-Zeile:

```tsx
const [loginId, setLoginId] = useState<string | null>(null)
```

**b. Konto aus dem Suchresultat übernehmen.** Ersetze `showSearchResult` durch:

```tsx
const showSearchResult = (data: SearchPayload) => {
  setPayload(data)
  setQuery(data.searchTerm)
  setLoginId(data.loginId)
  setMessage(null)
}
```

`getSearchPayload` bereitet `data.loginId` bereits als `string | null` auf.
Diese Funktion wird sowohl für Host-Resultate als auch nach einer erneuten
Suche innerhalb der App verwendet.

**c. Konto aus den initialen Argumenten übernehmen.** Ersetze innerhalb von
`onAppCreated` nur den Callback `createdApp.ontoolinput`:

```tsx
createdApp.ontoolinput = (params) => {
  const term = params.arguments?.term
  const login = params.arguments?.loginId
  if (typeof term === 'string') setQuery(term)
  setLoginId(typeof login === 'string' ? login : null)
}
```

Der Host liefert zuerst die Tool-Argumente und später das Resultat. Beide
Wege sollen den Konto-State aktualisieren. Bei fehlender Login-ID setzt du
explizit `null`, damit kein Konto aus einem früheren Aufruf stehen bleibt.
Die serverseitige Prüfung auf ein gültiges Demo-Konto existiert bereits.

**Prüfen:**

```bash
npm run build:apps
npm run typecheck
```

Lade im lokalen Host die **Produktsuche** mit leerem Feld **Login-ID**:
Produkte und Suche funktionieren, **In den Warenkorb** bleibt deaktiviert.
Lade danach mit `hotel-alpenblick`: Die Warenkorbbuttons werden aktiv.
Ein Klick zeigt bis Schritt 4 noch `Noch nicht implementiert.`

Im Inspector entspricht die anonyme Suche `{"term":"Vollmilch"}`;
für die Suche mit Konto ergänzt du `"loginId":"hotel-alpenblick"`.

## Schritt 4: Hinzufügen über die Host-Bridge ausführen

**Datei:** weiterhin `src/features/mcp-apps/search/SearchApp.tsx`

Suche die Funktion `addToCart`. Ersetze **nur** den TODO-Kommentar und das
darauffolgende Stub-Objekt `const toolResult = { ... }` durch:

```tsx
const toolResult = await app.callServerTool({
  name: 'addToCart',
  arguments: { loginId, articleNumber, quantity },
})
```

Dieser Code bleibt innerhalb des vorhandenen `try`-Blocks. Die Prüfung
`if (!app || !loginId) return` und die Lade-/Fehlerbehandlung bleiben erhalten.
`getCartPayload(toolResult)` liest die Antwort, `setCart(updated)` aktualisiert
die Warenkorbzusammenfassung unter den Produktkarten.

Der Aufruf verwendet dieselben Argumente wie ein manueller Tool-Aufruf im
Inspector. Du ergänzt keine neue Web-API und keine zweite Warenkorblogik.
Die bereits vorbereitete `updateModelContext`-Meldung informiert einen
geeigneten Host über die Aktion. Sie wird nur bei vorhandener Capability
versendet; ein Fehler dieser Meldung macht das erfolgreiche Hinzufügen nicht rückgängig.

**Prüfen:** Baue mit `npm run build:apps` neu und führe `npm run typecheck` aus.
Lade die **Produktsuche** für `hotel-alpenblick` mit `Vollmilch` neu. Setze
bei einem Produkt die **Menge** auf `2` und klicke **In den Warenkorb**.
Die App zeigt sofort den Warenkorb. Bei einem zuvor leeren Konto enthält er
zwei Verkaufseinheiten; wiederholtes Hinzufügen erhöht die bestehende Menge.

Rufe im Inspector `getCart` mit derselben Login-ID auf und aktualisiere den
Webshop. Artikelnummer, Menge und Betrag müssen übereinstimmen. Im lokalen
Host erscheint zusätzlich eine Meldung unter **Modellkontext**. Die
Zusammenfassung in der Search-App hat keine Entfernen-/Checkout-Buttons;
diese Aktionen gehören zur Cart-App.

## Schritt 5: Cart-Resource registrieren und fünf Tools zuordnen

**Datei 1:** `src/features/mcp-apps/register-ui-resources.ts`

Erweitere den Import aus Schritt 1 und die Registrierungsfunktion. Dies ist
der vollständige Endzustand dieser beiden Stellen:

```ts
import { CART_UI_URI, SEARCH_UI_URI, uiResourceMeta } from './resource-meta.ts'
```

```ts
export function registerUiResources(server: McpServer): void {
  registerUiResource(
    server,
    'Webshop Produktsuche',
    SEARCH_UI_URI,
    'search-ui.html',
  )
  registerUiResource(server, 'Webshop Warenkorb', CART_UI_URI, 'cart-ui.html')
}
```

**Datei 2:** `src/features/mcp/server.ts`

Erweitere den Import aus Schritt 2:

```ts
import {
  CART_UI_URI,
  SEARCH_UI_URI,
  uiToolMeta,
} from '../mcp-apps/resource-meta.ts'
```

Ersetze jeden der fünf Kommentare `TODO Schritt 5` durch:

```ts
_meta: uiToolMeta(CART_UI_URI),
```

Das betrifft `getCart`, `addToCart`, `removeFromCart`, `checkout` und
`getOrders`. `searchProducts` behält `SEARCH_UI_URI`.
Alle fünf Cart-Tools liefern bereits Daten, die die Cart-App versteht:
Warenkorb, Konto und Bestellverlauf beziehungsweise eine Checkout-Bestätigung
mit dem danach leeren Warenkorb. Deshalb teilen sie sich eine Oberfläche.

**Prüfen:**

```bash
npm run build:apps
npm run typecheck
```

Im Inspector müssen `resources/list` und `resources/read` nun **beide**
HTML-Resources liefern. Kontrolliere in `tools/list` die URI-Zuordnung aller
sechs Tools. Rufe `getCart` und `getOrders` jeweils mit
`{"loginId":"hotel-alpenblick"}` auf und öffne die Cart-App.

Im lokalen Host wähle **Warenkorb**, dieselbe Login-ID und **App laden**.
Erwartet werden der zuvor gefüllte Warenkorb, das Demo-Konto und die Anzahl
Bestellungen im Verlauf. Entfernen und Checkout zeigen vor Schritt 6 noch
den vorbereiteten Fehler; Konto- und Resultatübernahme sind bereits fertig.

## Schritt 6: Entfernen und Checkout über die Bridge verbinden

**Datei:** [src/features/mcp-apps/cart/CartApp.tsx](src/features/mcp-apps/cart/CartApp.tsx)

Suche `callCartTool`. Benenne die Parameter `_name` und `_args` in `name` und
`args` um und ersetze den TODO samt Stub-Resultat durch den Bridge-Aufruf.
Die vollständige Funktion sieht danach so aus:

```tsx
const callCartTool = useCallback(
  async (name: string, args: Record<string, unknown>) => {
    if (!app || !loginId) return null
    setBusy(true)
    setMessage(null)
    try {
      const toolResult = await app.callServerTool({
        name,
        arguments: { loginId, ...args },
      })
      const error = getToolError(toolResult)
      if (error) setMessage(error)
      return error ? null : toolResult
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : 'Tool-Aufruf fehlgeschlagen.',
      )
      return null
    } finally {
      setBusy(false)
    }
  },
  [app, loginId],
)
```

Die Funktion ergänzt das Konto zu den aktionsspezifischen Argumenten.
`removeLine` ruft sie bereits mit `removeFromCart` und `{ articleNumber }`
auf; `checkout` verwendet `checkout` und `{}`. Beide verarbeiten das Resultat
und aktualisieren die Oberfläche. Behalte diese Funktionen und ihre
Capability-Prüfungen bei.

`busy` sperrt Buttons während eines Aufrufs. `getToolError` behandelt
fachliche Tool-Fehler, der `catch`-Block auch fehlgeschlagene Bridge-Aufrufe.
`finally` gibt die Bedienung wieder frei. Beim Checkout werden Order-ID und
leerer Warenkorb angezeigt. Der Klick auf **Bestellung abschliessen** löst
die Mock-Bestellung direkt aus. Wird der Checkout durch ein Modell angefordert,
soll es gemäss Tool-Beschreibung zuvor die ausdrückliche Bestätigung einholen.

**Prüfen:**

```bash
npm run build:apps
npm run typecheck
```

1. Lade im lokalen Host den **Warenkorb** für `hotel-alpenblick`. Klicke bei
   einer Position auf **Entfernen**. Sie verschwindet; der Inspector-Aufruf
   `getCart` und der aktualisierte Webshop bestätigen dies.
2. Lade die **Produktsuche**, füge wieder einen Artikel hinzu und lade danach
   erneut den **Warenkorb**.
3. Klicke **Bestellung abschliessen**. Erwartet werden
   **Bestellung abgeschickt (Mock)** mit Order-ID und ein leerer Warenkorb.
4. Rufe `getOrders` im Inspector auf und öffne die Bestellhistorie im Webshop
   für dasselbe Konto. Vergleiche die Order-ID. Die Cart-App zeigt die Anzahl
   Bestellungen; das vollständige Resultat enthält den Verlauf.
5. Unter **Nachrichten der App** zeigt der lokale Host die `sendMessage`-Meldung.
   Er protokolliert sie, erzeugt selbst aber keine LLM-Antwort.

## Schritt 7: Abschlussprüfung und Abnahme

### Automatisierte Prüfungen

Beende zuerst den **manuell gestarteten lokalen Host** mit `Ctrl+C`.
Die Browser-Tests benötigen seine Ports **43552/43553** und starten zusätzlich
Shop und Katalog auf **43554/43555** selbst. Shop 3043 und Katalog 4040 können
weiterlaufen. Führe die Tests nacheinander im Starter-Verzeichnis aus.

Installiere beim ersten Browser-Test Chromium für Playwright:

```bash
npx playwright install chromium
```

Prüfe die vorhandenen Funktionen und danach die fertige Übung:

```bash
npm test
npm run typecheck
npm run build
npm run test:browser
npm run test:exercise
npm run test:e2e:mcp-apps
```

| Befehl                      | Was du damit überprüfst                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm test`                  | Shop-Regeln, Katalog, Events, MCP-Tools über echte HTTP-/stdio-Clients; baut vorher die App-Dateien                |
| `npm run typecheck`         | TypeScript-Verträge einschliesslich deiner Ergänzungen                                                             |
| `npm run build`             | Build des Webshops und der beiden HTML-Resources                                                                   |
| `npm run test:browser`      | Vorherige Webshop- und Chat-Funktionen im Browser, mit simulierten Chat-Streams                                    |
| `npm run test:exercise`     | Abschlussprüfung der Resource-Registrierung und ausgewählter Tool-Metadaten sowie MCP-Verträge                     |
| `npm run test:e2e:mcp-apps` | Search-/Cart-Interaktion auf Desktop und Mobile, Kontofehler, anonyme Suche und unterschiedliche Host-Capabilities |

Die ersten vier Befehle können auch am unveränderten Starter erfolgreich sein:
Sie prüfen die gelösten Vorstufen. Die normale MCP-Prüfung erlaubt während der
Übung noch fehlende Resources. **Die letzten beiden Befehle sind vor dem
Ausfüllen absichtlich rot.** `test:exercise` baut die HTML-Dateien nicht selbst;
führe bei einem einzelnen Wiederholungslauf vorher `npm run build:apps` aus.

Für einen kürzeren MCP-Durchlauf steht `npm run test:mcp` bereit. Echte
LLM-Evaluationen sind optional und benötigen einen Provider-Key; siehe
[docs/MCP-TESTING.md](docs/MCP-TESTING.md).

### Manueller Durchlauf im MCP Inspector

Lass Katalog und `npm run dev` laufen und starte gegebenenfalls erneut
`npm run inspector`. Prüfe nach dem Neuverbinden:

1. `resources/list`: genau Search- und Cart-Resource.
2. `resources/read`: beide Resources enthalten HTML und
   `text/html;profile=mcp-app`.
3. `tools/list`: Search-URI bei `searchProducts`, Cart-URI bei allen fünf
   übrigen Tools. Diese vollständige Zuordnung prüfst du hier manuell.
4. `searchProducts` ohne Login-ID: Karten sichtbar, Hinzufügen gesperrt.
5. `searchProducts` mit `hotel-alpenblick`: Hinzufügen in der App möglich.
6. `getCart` mit demselben Konto: Cart-App mit aktuellem Inhalt. Entferne eine
   Position per Button und prüfe mit erneutem `getCart` nach.
7. Füge erneut ein Produkt hinzu, lade `getCart` und bestelle per Button.
   Vergleiche die Order-ID über `getOrders` und im Webshop.
8. `getCart` mit `{"loginId":"unbekanntes-konto"}`: verständlicher Fehler
   statt einer erfolgreichen Warenkorbaktion. Prüfe zusätzlich eines der
   anderen gültigen Konten: Es hat seinen eigenen Warenkorb.

Nutze die **App-Ansicht** des Inspectors für die eingebettete UI. Ein reines
Text-/JSON-Resultat zeigt noch nicht, dass die Buttons funktionieren. Falls
deine Inspector-Version die App-Ansicht anders anbietet, verwende ergänzend
den lokalen Host. Siehe
[Inspector: MCP-App-Prüfung](https://github.com/modelcontextprotocol/inspector/blob/main/docs/mcp-app-review.md).

### Host-Benachrichtigungen gezielt prüfen

Starte den lokalen Host nach den Browser-Tests wieder mit
`npm run dev:mcp-host`. Teste Hinzufügen, Entfernen und Checkout auch unter:

- [Host ohne Benachrichtigungs-Capabilities](http://127.0.0.1:43552/?notifications=unsupported)
- [Host mit absichtlich fehlschlagenden Benachrichtigungen](http://127.0.0.1:43552/?notifications=reject)

Erwartung: Die Shop-Aktionen funktionieren trotzdem. Bei `unsupported` bleiben
die Meldungsbereiche leer; bei `reject` dürfen Konsolenwarnungen erscheinen.
Eine fehlgeschlagene Kontextmeldung darf keine bereits erfolgreiche Bestellung
als fehlgeschlagen darstellen. Die vorhandenen Browser-Tests decken diese Fälle ab.

## HTTPS-Endpunkt für Claude Desktop und ChatGPT vorbereiten

Für die folgenden Einbindungen verwenden wir einen HTTPS-Tunnel zu **Port 3043**.
Damit bleibt der laufende Webshop-Server samt Warenkorbzustand derselbe wie
beim lokalen Test. Katalog und Shop bleiben gestartet; der lokale Testhost
ist für Claude Desktop und ChatGPT nicht erforderlich.

Auch in Claude Desktop verbindet sich ein **Custom Connector** aus Anthropics
Cloud mit deinem Server. Für diesen Einrichtungsweg reicht eine
`localhost`-Adresse deshalb nicht. Lokale Desktop-Server über stdio sind ein
anderer Einrichtungsweg. Siehe die
[Claude-Netzwerkanforderungen](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

Das folgende Beispiel setzt installiertes und für dein Konto eingerichtetes
**ngrok** voraus. Installation und Anmeldung stehen im
[ngrok-Quickstart](https://ngrok.com/docs/getting-started). Prüfe:

```bash
ngrok version
```

Lege im Starter-Verzeichnis eine lokale Datei `ngrok-policy.yml` an:

```yaml
on_http_request:
  - actions:
      - type: add-headers
        config:
          headers:
            host: localhost:3043
```

Diese Policy setzt den Host-Header für den lokalen Vite-Server. Starte im
selben Verzeichnis in einem weiteren Terminal:

```bash
ngrok http 3043 --traffic-policy-file ngrok-policy.yml
```

Kopiere die ausgegebene HTTPS-Adresse und ergänze `/mcp`, beispielsweise
`https://deine-adresse.ngrok.app/mcp`. Ersetze diese Beispieladresse durch
deine eigene. Verbinde zuerst den Inspector per HTTP mit dieser URL
und prüfe `tools/list` sowie eine Suche. So prüfst du die Verbindung unabhängig
von der Einrichtung in Claude Desktop oder ChatGPT. Der Tunnel macht den laufenden Demo-Server
vorübergehend von aussen erreichbar; beende ihn nach dem Test mit `Ctrl+C`.
Die Host-Header-Konfiguration ist in der
[ngrok-Dokumentation](https://ngrok.com/docs/gateway/endpoints/http#rewriting-the-host-header)
beschrieben.

## In Claude Desktop einbinden

Verwende eine aktuelle, angemeldete **Claude-Desktop-App** und öffne dort den
**Chat**. Claude Desktop kann MCP Apps als interaktive Oberflächen im Gespräch
anzeigen. Du prüfst hier die Produktkarten und Warenkorbbuttons direkt im
Desktop-Chat. Siehe
[interaktive Connectors in Claude](https://support.claude.com/en/articles/13454812-use-interactive-connectors-in-claude).

### Custom Connector hinzufügen

Bereite zuerst den HTTPS-Endpunkt wie oben beschrieben vor. Die folgenden
Menübezeichnungen entsprechen der Dokumentation vom **7. September 2026**.

1. Öffne in Claude Desktop **Customize → Connectors**. Je nach Version findest
   du den Bereich unter **Settings → Connectors**.
2. Wähle **+ → Add custom connector**. Verwende als Namen beispielsweise
   **Webshop MCP Apps** und als Server-URL deine HTTPS-Adresse inklusive `/mcp`.
3. Bestätige mit **Add** und verbinde den Connector, falls **Connect** angeboten
   wird. Die Demo benötigt keine OAuth-Zugangsdaten; `loginId` bleibt ein Tool-Argument.
4. Öffne einen neuen Chat. Aktiviere den Connector über **+ → Connectors**
   für diese Unterhaltung.

Bei Team-/Enterprise-Konten muss ein Owner den Custom Connector zuerst für
die Organisation hinzufügen. Falls dir der Eintrag fehlt, kläre die Freigabe
mit der Workshop-Leitung. Die lokale Abnahme bleibt möglich.
Quelle: [Claude: Custom Connectors einrichten](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

### Search- und Cart-App im Desktop-Chat prüfen

Schreibe in den neuen Chat:

```text
Verwende Webshop MCP Apps. Suche mit searchProducts nach Vollmilch
und übergib loginId "hotel-alpenblick". Zeige die interaktive Produktsuche.
```

1. Prüfe, dass **Produktkarten im Claude-Chat** erscheinen. Eine Textliste mit
   Produkten allein reicht für diese Prüfung nicht aus.
2. Setze in einer Produktkarte die Menge auf `2` und klicke **In den Warenkorb**.
   Die eingebettete App soll den aktualisierten Warenkorb zeigen.
3. Fordere die Cart-App mit diesem Prompt an:

   ```text
   Zeige mit getCart den Warenkorb für hotel-alpenblick als interaktive App.
   ```

4. Entferne eine Position **per Button in Claude Desktop**. Füge über eine
   erneute Produktsuche wieder einen Artikel hinzu und lasse die Cart-App
   nochmals anzeigen.
5. Klicke **Bestellung abschliessen**. Diese Übung simuliert eine Bestellung;
   es erfolgt kein echter Kauf. Prüfe Bestellbestätigung und leeren Warenkorb.
6. Aktualisiere den Webshop auf `http://localhost:3043`, wähle dasselbe Konto
   und vergleiche die Order-ID in der Bestellhistorie.
7. Teste in einem neuen Chat mit aktiviertem Connector eine Suche ausdrücklich
   **ohne `loginId`**: Produkte erscheinen, Hinzufügen ist gesperrt.

### Änderungen übernehmen und Verbindung beenden

Nach App-Änderungen führe im Starter-Verzeichnis aus:

```bash
npm run build:apps
```

Starte bei geänderten Resource-/Tool-Metadaten den Webshop-Server neu.
Öffne einen neuen Chat und rufe das Tool erneut auf. Falls die Oberfläche
weiterhin fehlt, prüfe, ob der Connector für den Chat aktiviert ist, und
trenne/verbinde ihn erneut. Siehe
[Claude: Fehlerbehebung bei interaktiven Connectors](https://support.claude.com/en/articles/13454812-use-interactive-connectors-in-claude).

Ändert sich die Tunnel-URL, entferne den Custom Connector und füge ihn mit
der neuen URL hinzu. Nach der Prüfung kannst du ihn unter **Connectors**
über **… → Remove** entfernen. Beende den Tunnel mit `Ctrl+C`, sobald du ihn
auch für den folgenden ChatGPT-Test nicht mehr brauchst.

## In ChatGPT einbinden

Verwende den oben vorbereiteten HTTPS-Endpunkt. Alternativ unterstützt
ChatGPT einen Secure MCP Tunnel; der folgende Ablauf verwendet die HTTPS-URL.

### Verbindung anlegen und interaktiv testen

Die folgenden Menüpunkte entsprechen der offiziellen OpenAI-Dokumentation
vom **7. September 2026**; Verfügbarkeit und Beschriftungen können vom Konto
und Workspace abhängen.

1. Aktiviere **Settings → Security and login → Developer mode**.
2. Öffne [ChatGPT Plugins](https://chatgpt.com/plugins), wähle **+**, vergib
   Name und Beschreibung und trage die HTTPS-URL inklusive `/mcp` ein.
   Die Workshop-Demo verwendet keine OAuth-Anmeldung; `loginId` ist ein
   Tool-Argument. Wähle ohne Authentifizierung, falls dies abgefragt wird.
3. Erstelle die Verbindung und prüfe die sechs erkannten Tools.
4. Füge die Verbindung über das Werkzeugmenü einer neuen Unterhaltung hinzu.

Quelle für Verbindung und Aktualisierung:
[offizielle OpenAI-Dokumentation](https://developers.openai.com/plugins/deploy/connect-chatgpt).

Starte den fachlichen Durchlauf mit:

```text
Suche in der Webshop-App nach Vollmilch. Verwende das Demo-Konto
hotel-alpenblick und übergib diese loginId auch bei searchProducts.
```

Zum Suchresultat soll die Search-App erscheinen. Füge **per Produktkarte**
zwei Verkaufseinheiten hinzu. Schreibe anschliessend:

```text
Zeige mit getCart meinen Warenkorb für hotel-alpenblick.
```

Entferne in der Cart-App eine Position. Füge erneut ein Produkt hinzu, lasse
den Warenkorb wieder anzeigen und klicke **Bestellung abschliessen**.
Vergleiche die angezeigte Order-ID mit dem Webshop auf deinem Rechner.
Teste in einer neuen Unterhaltung auch eine Suche ohne Konto: Die Karten
sollen erscheinen, das Hinzufügen bleibt gesperrt.

Nach Änderungen: `npm run build:apps` ausführen, den Server bei geänderten
Metadaten neu starten, in ChatGPT bei der Verbindung **Refresh** wählen und
in einer neuen Unterhaltung erneut testen. Fehlt der Entwicklermodus, führe
die lokale Abnahme vollständig durch und halte den externen ChatGPT-Test
als noch offen fest.

## Häufige Probleme

| Beobachtung                                             | Prüfen und beheben                                                                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ECONNREFUSED`, Suche schlägt fehl                      | Katalog auf 4040 und Shop auf 3043 gestartet? Beide `/health`-URLs prüfen; `.env` kontrollieren.                                                                  |
| Im Browser unter `/mcp` erscheint keine Shop-Seite      | `/mcp` ist ein Protokoll-Endpunkt. Shop unter `/`, MCP über Inspector/Host öffnen.                                                                                |
| `Tool hat keine MCP-App-Ressource.`                     | Schritt 2 beziehungsweise 5: `_meta` am richtigen Tool ergänzen und Tool-Liste neu laden.                                                                         |
| `search-ui.html` oder `cart-ui.html` nicht gefunden     | Im Starter-Verzeichnis `npm run build:apps` ausführen.                                                                                                            |
| Alte UI trotz geändertem React-Code                     | App-Dateien neu bauen und die eingebettete App neu laden.                                                                                                         |
| Search-App hat weiterhin deaktivierte Buttons           | Nichtleere gültige Login-ID übergeben; alle drei Ergänzungen aus Schritt 3 prüfen.                                                                                |
| `Noch nicht implementiert.` beim Klicken                | Bridge-Stub aus Schritt 4 beziehungsweise 6 ist noch vorhanden oder die HTML-Datei ist veraltet.                                                                  |
| Inspector, Host und Shop zeigen verschiedene Warenkörbe | Dieselbe `loginId` und denselben HTTP-Endpunkt verwenden; Ansichten neu laden. stdio hat eigenen Zustand.                                                         |
| Produktdaten vorhanden, Bilder fehlen                   | MCP Apps laden Bilder von `webshop.transgourmet.ch`; Netzwerk und CSP aus `resource-meta.ts` prüfen. Die Browser-Tests leiten diese Bildanfragen auf den Mock um. |
| Browser-Test meldet belegte Ports                       | Manuellen Host beenden; 43552–43555 müssen für den Testlauf frei sein.                                                                                            |
| Claude Desktop oder ChatGPT erreicht den Server nicht   | Tunnel läuft noch? Richtige HTTPS-URL mit `/mcp`? Host-Header-Policy aktiv? Dieselbe URL zuerst im Inspector testen.                                              |

## Fertig, wenn …

- beide HTML-Resources lesbar und alle sechs Tools korrekt zugeordnet sind;
- anonyme Suche möglich ist und schreibende Aktionen ein gültiges Konto verwenden;
- Hinzufügen, Entfernen und Checkout in den Apps funktionieren;
- HTTP-Clients und Webshop für dasselbe Konto Menge, Betrag und Order-ID teilen;
- die automatisierten Prüfungen erfolgreich sind;
- du die externe Einbindung mit Host, Prompt und Ergebnis dokumentiert hast
  beziehungsweise einen mangels Zugang offenen Test benennst.

Vergleiche bei Bedarf gezielt die vier bearbeiteten Dateien mit der
[Musterlösung](../03-webshop-mcp-app-solution/README.md). Sie läuft auf Port
**3044** und hat ihren eigenen Prozessspeicher. Kopiere nicht das gesamte
Projekt über deinen Starter.

Als Bonus kannst du die Texte von `updateModelContext` und `sendMessage`
erweitern und die beiden Host-Testvarianten erneut ausführen.
