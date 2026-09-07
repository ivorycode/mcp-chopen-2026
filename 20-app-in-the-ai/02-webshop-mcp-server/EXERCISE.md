# Übung 2 · Webshop über MCP bedienen

## Ziel der Übung

Du machst einen bestehenden Webshop für externe AI-Assistenten bedienbar. Am Ende
kann ein MCP-Client Produkte suchen, den Warenkorb eines Demo-Kontos lesen und
verändern, eine Bestellung abschliessen und die Bestellhistorie anzeigen.
Du prüfst diese Funktionen zuerst direkt im MCP Inspector und anschliessend in
Claude Code oder ChatGPT mit natürlichsprachlichen Aufträgen.

In der vorherigen Stufe steckt die AI **in der Anwendung**: Der Chat im Webshop
ruft Shop-Funktionen auf. Jetzt wird die **Anwendung für eine externe AI**
zugänglich. MCP (Model Context Protocol) liefert dafür ein gemeinsames Protokoll:
Der Client entdeckt Tools mit Namen, Beschreibungen und Eingabeschemas und ruft
sie mit strukturierten Argumenten auf.

Nach dieser Übung kannst du:

- bestehende Fachlogik als MCP-Tools zugänglich machen;
- erklären, wie Eingabeschema, Kontoauswahl, Callback und Tool-Ergebnis zusammenwirken;
- lesende und schreibende Tools anhand ihrer Annotationen unterscheiden;
- Textantworten, strukturierte Daten und fachliche Fehler korrekt zurückgeben;
- denselben MCP-Server über Streamable HTTP und stdio testen und die Unterschiede
  beim gespeicherten Zustand erklären.

Der Übungscode wird ausschliesslich in
[`src/features/mcp/server.ts`](src/features/mcp/server.ts) ergänzt. Du implementierst
sechs Callbacks und einen kleinen Hilfsbaustein. Neue Pakete, eine Datenbank oder
ein eigener Transport sind dafür nicht nötig. Eine eingebettete MCP-App-Oberfläche
kommt erst in der nächsten Übung.

## Was ist bereits implementiert?

Dieser Ordner ist ein eigenständig installierbarer Starter. Du musst keine Dateien
aus der vorherigen Übung kopieren und den AI-Chat nicht nochmals implementieren.

| Bereich                          | Bereits vorhanden                                                                                                         | Deine Aufgabe                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Klassischer Shop unter `/`       | Produktsuche, Artikeldetails, Demo-Login, Warenkorb, Mengenänderung, Entfernen, Checkout und Bestellungen                 | Als Vergleich für die MCP-Aufrufe verwenden                             |
| AI-Chat                          | **Assistant** im Shop und **Workspace** unter `/chat`; Tool-Aufrufe und Freigabe eines vom Modell angeforderten Checkouts | Optional ausprobieren; nur hierfür ist ein Modell-API-Key im Shop nötig |
| Web-API                          | Routen für Suche, Session, Warenkorb und Bestellungen                                                                     | Bleibt der Zugang der Browser-Oberfläche                                |
| Fachlogik                        | Kontoabhängige Warenkörbe und Bestellungen in `src/lib/shop.server.ts` und `shop-state.ts`                                | Wiederverwenden                                                         |
| Gemeinsame Tool-Handler          | Suche, Lesen, Hinzufügen, Entfernen und Checkout in `src/lib/tools/handlers.server.ts`                                    | Aus den MCP-Callbacks aufrufen                                          |
| MCP-Registrierung                | Sechs Tools mit Namen, Beschreibungen, Zod-Schemas und Annotationen                                                       | Die vorbereiteten Callback-Lücken ausfüllen                             |
| Konto-Prüfung und Ergebnisformat | `withAccount`, `invalidLogin` und `toolResult` in `server.ts`                                                             | Beibehalten und verwenden                                               |
| MCP-Transporte                   | HTTP-Endpunkt `/mcp` und separater stdio-Einstieg; beide verwenden `buildMcpServer()`                                     | Verbinden und testen                                                    |
| Prüfungen                        | Tests für Shop, MCP, Browser und die fertige Übung                                                                        | Schrittweise ausführen                                                  |

**Noch nicht implementiert:** Die sechs MCP-Callbacks geben bei gültigen Eingaben
`ok: false`, `error: 'Noch nicht implementiert.'` und den Hinweis
`Siehe EXERCISE.md.` zurück. Dass ein Client die Toolliste schon laden kann,
beweist deshalb noch nicht, dass er einkaufen kann.

### Wie die Zugänge zusammenhängen

```text
Browser / eingebauter Chat ── Web-API / Chat-Adapter ─┐
                                                   ├─ Shop-Logik ─ Katalog auf :4040
Inspector / Claude Code / ChatGPT ─ HTTP /mcp ───────┘
                         ein Shop-Prozess auf :3041

MCP-Client ─ stdio ─ separater Node-Prozess ─ Shop-Logik ─ Katalog auf :4040
```

Browser, Chat und HTTP-MCP teilen pro Konto denselben Zustand im Shop-Prozess.
Ein stdio-Server hat einen **eigenen** Prozessspeicher. Bei einem Server-Neustart
gehen dessen Warenkörbe und Bestellungen verloren; auch Neuladen von Servercode
während der Entwicklung kann den Zustand zurücksetzen. Ein Browser-Reload allein
löscht ihn nicht.

Im Browser stammt das Konto aus einem Session-Cookie. Ein externer MCP-Client
übernimmt dieses Cookie nicht und übergibt deshalb `loginId` als Tool-Argument.
Die drei gültigen IDs sind `restaurant-baeren`, `hotel-alpenblick` und
`kantine-campus`. Das ist eine Demo-Kontoauswahl, keine Authentifizierung.
Auch der Checkout ist simuliert: Er speichert eine Bestellung im Prozess,
ohne einen realen Einkauf oder eine Zahlung auszulösen.

## 1. Umgebung vorbereiten und Starter starten

### 1.1 Voraussetzungen und Arbeitsverzeichnis

Du brauchst das geklonte Workshop-Repository, einen Editor, einen Browser und
Node.js mit npm. Verwende Node **22.19 oder neuer**, beispielsweise Node 24.
Der Shop verlangt mindestens 22.18; der aktuelle
[MCP Inspector](https://github.com/modelcontextprotocol/inspector) verlangt 22.19.

Prüfe in einem Terminal:

```bash
node --version
npm --version
```

Die folgenden Shell-Befehle sind für macOS, Linux oder WSL mit Bash/Zsh gedacht.
Ersetze `/pfad/zu/mcp-chopen-2026` jeweils durch deinen lokalen Repository-Pfad.
Lass die Server in getrennten Terminals laufen:

| Terminal | Aufgabe                             | Läuft während der Übung weiter? |
| -------- | ----------------------------------- | ------------------------------- |
| A        | Katalog-Mock auf Port 4040          | Ja                              |
| B        | Webshop und HTTP-MCP auf Port 3041  | Ja                              |
| C        | Tests, Inspector oder Claude Code   | Je nach Schritt                 |
| D        | Optionaler HTTPS-Tunnel für ChatGPT | Während des ChatGPT-Tests       |

### 1.2 Terminal A: Katalog starten

```bash
cd /pfad/zu/mcp-chopen-2026/01-mock-api
npm ci
npm start
```

`npm ci` installiert die im Lockfile festgelegten Abhängigkeiten. `npm start`
startet den Katalog auf `http://localhost:4040`. Er liefert vorbereitete
Produktdaten und Bilder; du brauchst keinen Zugang zur echten Katalog-API.
Für die Standardkonfiguration ist hier keine `.env` nötig.

### 1.3 Terminal B: Webshop installieren und starten

```bash
cd /pfad/zu/mcp-chopen-2026/20-app-in-the-ai/02-webshop-mcp-server
npm ci
```

Lege beim ersten Einrichten die lokale Konfiguration an. Falls schon eine `.env`
vorhanden ist, behalte sie und prüfe ihre Einstellungen, statt sie zu überschreiben:

```bash
cp .env.example .env
```

Diese Werte müssen in `.env` stehen:

```dotenv
CATALOG_MODE=mock
MOCK_CATALOG_ORIGIN=http://localhost:4040
ENABLE_PUBLIC_MCP_GUARDS=false
```

Die Vorlage enthält sie bereits. Für Shop, MCP Inspector und automatische Tests
dürfen die Modell-API-Keys leer bleiben. Für den eingebauten AI-Chat aktivierst
du genau einen Provider-Block aus `.env.example` und trägst den passenden Key
ein; siehe [Setup-Check](../../00-setup-check/README.md). Die Anmeldung in Claude
Code beziehungsweise ChatGPT erfolgt separat vom Provider des Shop-Chats.

Starte den Webshop:

```bash
npm run dev -- --strictPort
```

`--strictPort` verhindert, dass Vite bei einem belegten Port unbemerkt auf einen
anderen Port ausweicht. Du verwendest:

- Shop: <http://localhost:3041>
- Chat-Workspace: <http://localhost:3041/chat>
- MCP-Endpunkt: `http://localhost:3041/mcp`

### 1.4 Terminal C: Erreichbarkeit prüfen

```bash
cd /pfad/zu/mcp-chopen-2026/20-app-in-the-ai/02-webshop-mcp-server
curl --fail-with-body http://localhost:4040/health
curl --fail-with-body http://localhost:3041/health
curl --fail-with-body 'http://localhost:3041/api/search?term=Milch'
```

Die Health-Aufrufe müssen erfolgreich antworten. Die Suche liefert JSON mit
Produktdaten. Schlägt bereits die Suche fehl, prüfe Terminal A und
`MOCK_CATALOG_ORIGIN`, bevor du MCP-Code ergänzt.

### 1.5 Was kannst du jetzt schon im Browser tun (bestehende Webshop Funktionalität)?

1. Öffne <http://localhost:3041> und suche nach `Milch`.
2. Öffne die Details eines Treffers und betrachte Artikelnummer, Preis und Einheit.
3. Öffne den Demo-Login, wähle `restaurant-baeren` und klicke **Anmelden**.
4. Lege ein Produkt in den Warenkorb, ändere seine Menge und entferne es wieder.
5. Füge erneut ein Produkt hinzu und schliesse die Demo-Bestellung ab.
6. Prüfe die Bestellnummer und die Bestellhistorie. Der aktive Warenkorb ist leer.
7. Falls ein Modell-API-Key eingerichtet ist, öffne den **Assistant** oder `/chat`
   und probiere: `Suche Milch und zeige mir den Warenkorb.`

Das funktioniert bereits ohne deine MCP-Ergänzungen. Verwende für die späteren
MCP-Tests `hotel-alpenblick`, damit die Browser-Probe nicht mit dem Testablauf
vermischt wird.

### 1.6 MCP Inspector mit dem Starter verbinden

Starte in Terminal C:

```bash
npm run inspector
```

Das Script führt diesen Befehl aus:

```bash
npx @modelcontextprotocol/inspector@latest --web --config inspector.json
```

Beim ersten Aufruf kann npm die Installation des Inspectors bestätigen lassen.
Öffne die im Terminal ausgegebene Browser-Adresse. Wähle den vorkonfigurierten
Server **webshop-local** und verbinde ihn. Die Datei `inspector.json` enthält
bereits den Transport `http` und `http://localhost:3041/mcp`; daneben ist
**webshop-remote** mit der öffentlichen Demo
`https://mcp-webshop-demo.fly.dev/mcp` eingetragen (siehe 1.7).
In der Oberfläche kann der Transport als **HTTP** oder **Streamable HTTP**
bezeichnet sein. Die Konfiguration wird mit `--config` als schreibgeschützte
Sitzung geladen. Siehe den
[Inspector-Launcher](https://github.com/modelcontextprotocol/inspector/blob/main/clients/launcher/README.md).

Öffne **Tools**, lade bei Bedarf die Toolliste und wähle `searchProducts`.
Trage `Milch` als `term` ein und lasse `loginId` weg. Falls der Inspector einen
JSON-Editor anbietet, entspricht das dieser Eingabe:

```json
{ "term": "Milch" }
```

Führe das Tool aus. **Erwartung vor der Implementierung:** Sechs Tools sind
sichtbar, der Aufruf liefert jedoch `isError: true` und in `structuredContent`
den Fehler `Noch nicht implementiert.`. Das ist der beabsichtigte Startpunkt.
Ein direktes Öffnen von `/mcp` in der Browser-Adresszeile ersetzt diesen Test
nicht: Der Endpunkt erwartet MCP-Protokollnachrichten.

### 1.7 Zum Vergleich: die fertige Demo unter webshop-remote

Damit du siehst, wie sich ein **fertig implementierter** Server verhält, enthält
`inspector.json` zusätzlich den Eintrag **webshop-remote** mit der öffentlichen
Demo `https://mcp-webshop-demo.fly.dev/mcp`. Sie läuft im Internet und braucht
weder deinen lokalen Shop noch den Katalog auf Port 4040.

Verbinde im Inspector zusätzlich **webshop-remote** und rufe dort dasselbe
`searchProducts` auf:

```json
{ "term": "Milch", "loginId": "hotel-alpenblick" }
```

**Erwartung:** dieselbe Toolliste wie lokal, aber ein Ergebnis mit `ok: true`
und Produktdaten statt `Noch nicht implementiert.`. Genau dieses Verhalten
stellst du in den nächsten Schritten lokal her. Beim Wechsel zwischen beiden
Servern lohnt sich der Blick auf Beschreibungen und Eingabeschemas: Sie sind
identisch, weil beide dieselbe Registrierung aus `server.ts` verwenden.

Auf der Demo gelten dieselben drei Demo-Konten wie lokal: `hotel-alpenblick`,
`restaurant-baeren` und `kantine-campus`. Bei `searchProducts` ist `loginId`
optional, bei den übrigen fünf Tools verlangt das Schema es. Probiere deshalb
zusätzlich `getCart` mit `{ "loginId": "hotel-alpenblick" }` aus – auch dieser
Aufruf antwortet auf der Demo mit `ok: true`, lokal dagegen noch mit
`Noch nicht implementiert.`.

Zwei Einschränkungen: Die Demo ist die Abschlusslösung des ganzen Workshops und
zeigt deshalb auch Resources der MCP-Apps aus der nächsten Übung. Und ihr
Zustand liegt im Prozessspeicher **einer** öffentlichen Instanz – Warenkörbe und
Bestellungen teilst du dort mit allen anderen Teilnehmenden und sie gehen bei
einem Neustart verloren. Für deine eigenen Tests bleibt `webshop-local`
massgebend; ist die Demo nicht erreichbar, überspringe diesen Vergleich.

## 2. Suche implementieren

### 2.1 Registrierung und Ergebnisformat verstehen

Öffne [`src/features/mcp/server.ts`](src/features/mcp/server.ts) im Editor.
Jeder Aufruf von `server.registerTool(...)` enthält drei Teile:

1. den Namen, etwa `searchProducts`;
2. Metadaten mit Beschreibung, Eingabeschema und Annotationen;
3. den Callback, der bei einem Tool-Aufruf ausgeführt wird.

Du ersetzt jeweils den **dritten Parameter**. Name, Schema und Annotationen
bleiben stehen. Insbesondere legst du keine zweite Registrierung desselben
Tools an. Die folgenden Callback-Snippets enthalten das abschliessende Komma;
das vorhandene `)` des umgebenden `registerTool`-Aufrufs bleibt erhalten.

Der vorhandene Helfer `toolResult(data, text)` erzeugt:

| Feld                | Zweck                                                         |
| ------------------- | ------------------------------------------------------------- |
| `content`           | Text für das Modell und für Clients, die nur Text anzeigen    |
| `structuredContent` | Die unveränderten strukturierten Ergebnisdaten für den Client |
| `isError: true`     | Markiert einen fachlichen Fehler, wenn `data.ok` falsch ist   |

Gib deshalb immer Daten **und** einen passenden Text zurück. Ein Fehler darf
nicht mit einer Erfolgsmeldung beschrieben werden. Die bestehenden Handler
fangen fachliche Fehler ab und liefern dafür `{ ok: false, error: ... }`.

### 2.2 Gemeinsamen Handler importieren

Ergänze oben bei den Imports:

```ts
import { toolHandlers } from '../../lib/tools/handlers.server.ts'
```

Die Endung `.ts` bleibt stehen: Derselbe Code muss auch direkt im
Node-stdio-Prozess funktionieren.

### 2.3 Callback von `searchProducts` ersetzen

Ersetze den vorhandenen Block `async ({ loginId }) => { ... },` samt TODO durch:

```ts
async ({ term, loginId }) => {
  if (loginId && !findAccount(loginId)) return invalidLogin(loginId)

  const data = await toolHandlers.searchProducts({ term })
  return toolResult(
    { ...data, loginId: loginId ?? null },
    data.ok
      ? `${data.shownCount} Produkte für "${data.searchTerm}" gefunden.`
      : data.error,
  )
},
```

`term` kommt aus dem Eingabeschema. Die Suche ist asynchron, weil der Handler
den Katalog abfragt. Sie ist auch ohne Konto erlaubt. Wird eine `loginId`
angegeben, muss sie gültig sein. Ohne Konto enthält die Antwort explizit
`loginId: null`.

Der Handler liefert höchstens fünf Artikel. `shownCount` zählt die tatsächlich
gelieferten Artikel; `totalCount` kann grösser sein. Verwende deshalb
`shownCount` im Antworttext. Eine Suche ohne Treffer ist ein erfolgreicher
Aufruf mit leerer Artikelliste, kein technischer Fehler.

### 2.4 Suche prüfen

Speichere die Datei. Verbinde den Inspector bei Bedarf neu und führe nacheinander
diese Argumente für `searchProducts` aus:

```json
{ "term": "Milch" }
```

```json
{ "term": "Milch", "loginId": "hotel-alpenblick" }
```

```json
{ "term": "Milch", "loginId": "unbekannt" }
```

Die ersten beiden Aufrufe liefern `ok: true`, Produktdaten und einen lesbaren
Text. Der dritte liefert `ok: false`, `isError: true` und `validAccounts` mit
den gültigen Demo-Konten. Notiere eine **Artikelnummer aus deiner Suchantwort**;
du brauchst sie beim Hinzufügen.

Führe in einem freien Terminal im Starter-Ordner aus:

```bash
npm run typecheck
```

Die Typprüfung soll bereits nach diesem Teilschritt erfolgreich sein. Die
anderen fünf Callbacks dürfen noch ihre vorbereiteten Fehler liefern.

## 3. Warenkorb-Tools verbinden

### 3.1 Konto und Warenkorb-Ergebnis vorbereiten

Für alle folgenden Tools ist `loginId` verpflichtend. Der vorhandene Wrapper
`withAccount` prüft die ID und übergibt dem Callback zwei Argumente:
die gültige `loginId` und das vollständige Eingabeobjekt. Er liefert bei einer
unbekannten ID direkt `invalidLogin(...)`; der Shop-Handler wird dann nicht aufgerufen.

Ergänze oben in `server.ts` zwei weitere Imports:

```ts
import * as shop from '../../lib/shop.server.ts'
import type { CartResult } from '../../lib/tools/results.ts'
```

Füge **nach `withAccount` und vor `buildMcpServer`** diesen Helfer ein:

```ts
/** Warenkorb-Daten für externe Agenten: Resultat plus Konto und Bestellverlauf. */
function cartPayload<T extends CartResult>(loginId: string, data: T) {
  return { ...data, loginId, orders: shop.getOrders(loginId) }
}
```

`CartResult` umfasst erfolgreiche Warenkorbdaten und fachliche Fehler. Der
generische Typ `T` erhält die konkreten Felder des übergebenen Ergebnisses.
Der Helfer ergänzt die Konto-ID und die Bestellhistorie desselben Kontos.
Er verändert den Warenkorb nicht. Es gibt keinen separaten `getOrders`-Handler
in `toolHandlers`; den Verlauf liest du über `shop.getOrders`.

### 3.2 `getCart`: vorhandenen Warenkorb lesen

Ersetze den dritten Parameter der `getCart`-Registrierung, also den kompletten
Block `withAccount((_loginId) => { ... }),`, durch:

```ts
withAccount((loginId) => {
  const data = cartPayload(loginId, toolHandlers.getCart(loginId))
  return toolResult(
    data,
    data.totalItems
      ? `Warenkorb enthält ${data.totalItems} Artikel.`
      : 'Der Warenkorb ist leer.',
  )
}),
```

Das Lesen braucht kein `await`: Der Warenkorb liegt im Prozessspeicher.
`getCart` liefert für ein gültiges Konto immer ein erfolgreiches Ergebnis,
auch wenn es noch keinen aktiven Warenkorb gibt. In diesem Fall sind
`cartId: null`, `items: []`, `totalItems: 0` und `totalAmount: 0`.
`totalItems` ist die Summe der Mengen, nicht die Zahl unterschiedlicher Positionen.

**Zwischenprüfung im Inspector:**

```json
{ "loginId": "hotel-alpenblick" }
```

Erwarte `ok: true`, die Warenkorbfelder, `loginId` und ein `orders`-Array.
Ein zuvor unbenutztes Konto hat einen leeren Warenkorb und noch keine Bestellungen.

### 3.3 `addToCart`: Artikel hinzufügen

Ersetze den dritten Parameter der `addToCart`-Registrierung durch:

```ts
withAccount(async (loginId, { articleNumber, quantity }) => {
  const data = await toolHandlers.addToCart(loginId, {
    articleNumber,
    quantity,
  })
  return toolResult(
    cartPayload(loginId, data),
    data.ok ? `Artikel ${articleNumber} hinzugefügt.` : data.error,
  )
}),
```

Du entnimmst `articleNumber` und `quantity` dem zweiten Callback-Argument.
Der Handler lädt Artikeldetails aus dem Katalog und ist deshalb asynchron.
Er übernimmt auch die Preisberechnung und das Zusammenführen gleicher Artikel.
Beim ersten Hinzufügen legt er den Warenkorb an; ein `createCart`-Tool ist nicht nötig.

`quantity` zählt Verkaufseinheiten, ist eine Ganzzahl von 1 bis 99 und hat den
Standardwert 1. Wiederholtes Hinzufügen erhöht die Menge. Deshalb ist das Tool
mit `idempotentHint: false` annotiert: Ein wiederholter Aufruf verändert den Zustand erneut.

**Zwischenprüfung:** Ersetze `ARTIKELNUMMER_AUS_DER_SUCHE` durch die echte Nummer
aus Schritt 2.4. Sie bleibt ein String, auch wenn sie nur Ziffern enthält.

```json
{
  "loginId": "hotel-alpenblick",
  "articleNumber": "ARTIKELNUMMER_AUS_DER_SUCHE",
  "quantity": 2
}
```

Führe den Aufruf einmal mit Menge 2 und anschliessend mit Menge 1 aus. Bei zuvor
leerem Warenkorb erwartest du **eine** Position mit `quantity: 3` und
`totalItems: 3`. Lies danach `getCart` für `kantine-campus`; dieses Konto darf
durch die Aufrufe nicht verändert worden sein.

Melde dich im Browser ebenfalls als `hotel-alpenblick` an und lade die Seite neu.
Vergleiche Artikelnummer, Menge, `cartId` und Gesamtbetrag. Externe MCP-Aufrufe
müssen keine unmittelbare Aktualisierung einer bereits offenen Browseransicht
auslösen; der Reload liest den gemeinsamen Serverzustand erneut.

### 3.4 `removeFromCart`: ganze Position entfernen

Ersetze den dritten Parameter der `removeFromCart`-Registrierung durch:

```ts
withAccount((loginId, { articleNumber }) => {
  const data = toolHandlers.removeFromCart(loginId, { articleNumber })
  return toolResult(
    cartPayload(loginId, data),
    data.ok ? `Artikel ${articleNumber} entfernt.` : data.error,
  )
}),
```

Der Handler entfernt die gesamte Position, unabhängig von ihrer Menge.
Ist der Artikel nicht im Warenkorb, liefert er einen fachlichen Fehler.
Ein erneuter Remove-Aufruf darf deshalb einen Fehler melden, ohne weiteren
Zustand zu verändern; das passt zum vorhandenen `idempotentHint: true`.

**Zwischenprüfung:** Rufe `removeFromCart` mit derselben Artikelnummer auf:

```json
{
  "loginId": "hotel-alpenblick",
  "articleNumber": "ARTIKELNUMMER_AUS_DER_SUCHE"
}
```

`items` muss anschliessend leer sein. Wiederhole den Aufruf und prüfe
`isError: true` sowie den Fehlertext. Füge für den Checkout im nächsten Schritt
erneut eine Einheit über `addToCart` hinzu.

```bash
npm run typecheck
```

## 4. Checkout und Bestellhistorie implementieren

### 4.1 `checkout`: Bestellung abschliessen und neuen Zustand liefern

Ersetze den dritten Parameter der `checkout`-Registrierung durch:

```ts
withAccount((loginId) => {
  const data = toolHandlers.checkout(loginId)
  if (!data.ok) return toolResult(cartPayload(loginId, data), data.error)

  const cart = cartPayload(loginId, toolHandlers.getCart(loginId))
  return toolResult(
    { ...data, loginId, cart },
    `Bestellung ${data.orderId} übermittelt.`,
  )
}),
```

Ein leerer Warenkorb führt zum Fehlerzweig. Bei Erfolg enthält `data` unter
anderem `orderId`, `submittedAt`, `totalItems` und `totalAmount` der Bestellung.
Erst **nach** dem Checkout liest du den aktuellen Warenkorb erneut.
Die Antwort enthält dadurch die Bestätigung und unter `cart` den leeren
Warenkorb samt aktualisiertem `orders`-Array.

In dieser Demo wird die bisherige `cartId` zur `orderId`. Der aktive Warenkorb
wird aufgelöst; das nächste Hinzufügen erzeugt eine neue `cartId`.

Die vorhandene Tool-Beschreibung verlangt eine ausdrückliche Bestätigung vor dem
Checkout. Die Annotationen beschreiben die schreibende Aktion. Beides ist jedoch
**kein serverseitiger Freigabedialog**: Ein gültiger direkter Tool-Aufruf führt
den Checkout aus. Im Inspector entscheidest du mit dem Aufruf selbst; in einem
AI-Host prüfst du zusätzlich dessen Rückfrage- und Freigabeverhalten.

### 4.2 `getOrders`: Verlauf des Kontos zurückgeben

Ersetze den dritten Parameter der `getOrders`-Registrierung durch:

```ts
withAccount((loginId) => {
  const data = cartPayload(loginId, toolHandlers.getCart(loginId))
  return toolResult(data, `${data.orders.length} Bestellungen gefunden.`)
}),
```

Der gemeinsame Payload liefert sowohl den aktuellen Warenkorb als auch `orders`.
So kann der Client Konto, Warenkorb und Bestellungen gemeinsam auswerten.
Der Verlauf enthält höchstens die letzten 20 Bestellungen, neueste zuerst.

### 4.3 Checkout und Historie prüfen

1. Lies `getCart` für `hotel-alpenblick`. Falls er leer ist, füge erst einen Artikel hinzu.
2. Notiere die `cartId` und rufe `checkout` mit `{"loginId":"hotel-alpenblick"}` auf.
3. Prüfe `ok: true` und die `orderId`. Sie entspricht der notierten `cartId` und
   steht auch im Text der Antwort.
4. Prüfe `cart.cartId: null`, `cart.items: []` und den Eintrag in `cart.orders`.
5. Rufe `getOrders` mit demselben Konto auf. `orders[0].orderId` entspricht der Bestellung.
6. Lade den Browser mit demselben Konto neu: Die Bestellhistorie muss dieselbe ID zeigen.
7. Rufe `checkout` nochmals auf. Der leere Warenkorb muss einen Fehler liefern;
   eine zweite Bestellung darf nicht entstehen.
8. Füge erneut einen Artikel hinzu. Seine neue `cartId` unterscheidet sich von
   der Bestellnummer.

## 5. Fertige Übung automatisch und im Inspector verifizieren

### 5.1 Automatische Abnahme

Führe im Starter-Ordner diese Befehle nacheinander aus:

```bash
npm run typecheck
npm test
npm run test:exercise
npm run build
```

| Befehl                  | Was wird geprüft?                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck`     | TypeScript inklusive deiner Callback-Signaturen und Resultate                                       |
| `npm test`              | Vorhandene Shop-, Katalog-, Event- und MCP-Gerüsttests; toleriert noch unvollständige MCP-Callbacks |
| `npm run test:exercise` | Vollständige MCP-Abnahme über HTTP und stdio sowie deterministische Tests des LLM-Testclients       |
| `npm run build`         | Produktionsbuild des gesamten Shops                                                                 |

**Entscheidend ist `npm run test:exercise`.** Vor dem Ausfüllen ist dieser Befehl
absichtlich rot. Ein grünes `npm test` allein bestätigt die fertige Übung nicht.
Die Abnahme startet isolierte Server und Mock-Kataloge selbst; sie braucht weder
die laufenden Terminals A/B noch einen Modell-API-Key und verändert deren
Warenkörbe nicht.

Prüfe ausserdem die Browser-Oberfläche. Installiere beim ersten Mal die benötigten
Playwright-Browser und starte die vorhandenen Tests:

```bash
npx playwright install chromium
npm run test:browser
```

Auf einem Linux-System, dem Browser-Systembibliotheken fehlen, verwende für die
Installation `npx playwright install --with-deps chromium`.
Die Tests verwenden isolierte Ports 43554/43555 und deterministische Chat-Antworten.
Sie prüfen die Browser-Grundlage ohne kostenpflichtige Modellaufrufe.

Für einen schnellen erneuten MCP-Gerüsttest gibt es `npm run test:mcp`.
Nach Abschluss der Übung ist für die volle Prüfung weiterhin
`npm run test:exercise` massgeblich.

### 5.2 Durchgehender manueller Test über HTTP

Starte beziehungsweise öffne den Inspector aus Schritt 1.6 erneut. Wenn du einen
sauberen Zustand brauchst, starte den Shop in Terminal B mit `Ctrl+C` und
`npm run dev -- --strictPort` neu. Damit werden **alle** Demo-Warenkörbe und
Bestellungen dieses Prozesses zurückgesetzt. Verwende durchgehend
`hotel-alpenblick` und ersetze `ARTIKELNUMMER` durch einen Treffer aus Schritt 1
der folgenden Tabelle.

Trage die Argumente jeweils im ausgewählten Tool ein und führe den Aufruf aus:

| Nr. | Tool             | Argumente                                                                     | Erwartetes Ergebnis                                                                |
| --- | ---------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `searchProducts` | `{"term":"Milch"}`                                                            | Erfolg ohne Konto, höchstens fünf Treffer; Artikelnummer notieren                  |
| 2   | `getCart`        | `{"loginId":"hotel-alpenblick"}`                                              | Leerer Warenkorb, `cartId: null`                                                   |
| 3   | `addToCart`      | `{"loginId":"hotel-alpenblick","articleNumber":"ARTIKELNUMMER","quantity":2}` | Eine Position mit Menge 2, eine `cartId`                                           |
| 4   | `addToCart`      | `{"loginId":"hotel-alpenblick","articleNumber":"ARTIKELNUMMER"}`              | Standardmenge 1 wird addiert: eine Position, Menge 3                               |
| 5   | `getCart`        | `{"loginId":"hotel-alpenblick"}`                                              | Menge 3; nach Reload gleicher Inhalt im Browser dieses Kontos                      |
| 6   | `getCart`        | `{"loginId":"kantine-campus"}`                                                | Weiterhin leer; Kontoisolation                                                     |
| 7   | `removeFromCart` | `{"loginId":"hotel-alpenblick","articleNumber":"ARTIKELNUMMER"}`              | Ganze Position entfernt, Menge 0                                                   |
| 8   | `addToCart`      | `{"loginId":"hotel-alpenblick","articleNumber":"ARTIKELNUMMER","quantity":1}` | Warenkorb wieder gefüllt; `cartId` notieren                                        |
| 9   | `checkout`       | `{"loginId":"hotel-alpenblick"}`                                              | Bestell-ID entspricht vorheriger Cart-ID; `cart.items` leer                        |
| 10  | `getOrders`      | `{"loginId":"hotel-alpenblick"}`                                              | Genau diese Bestellung mit Position, Menge und Betrag; gleicher Verlauf im Browser |
| 11  | `checkout`       | `{"loginId":"hotel-alpenblick"}`                                              | Fehler wegen leerem Warenkorb; keine weitere Bestellung                            |
| 12  | `addToCart`      | `{"loginId":"hotel-alpenblick","articleNumber":"ARTIKELNUMMER"}`              | Neue Cart-ID, bestehende Bestellung bleibt erhalten                                |

Prüfe bei jedem Aufruf sowohl den Text in `content` als auch
`structuredContent`. Eine reine Erfolgsmeldung ohne passenden tatsächlichen
Warenkorbzustand genügt nicht.

### 5.3 Fehlerfälle gezielt ausprobieren

| Test                | Eingabe                                                            | Erwartung                                                     |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| Ungültiges Konto    | `getCart` mit `{"loginId":"unbekannt"}`                            | `isError: true`, `ok: false`, gültige Demo-Konten als Hinweis |
| Fehlendes Konto     | `getCart` mit `{}`                                                 | Schemafehler; es wird kein Standardkonto ausgewählt           |
| Leerer Suchbegriff  | `searchProducts` mit `{"term":""}`                                 | Schemafehler                                                  |
| Keine Treffer       | `searchProducts` mit `{"term":"zzzz-kein-produkt-zzzz"}`           | `ok: true`, `articles: []`, `shownCount: 0`                   |
| Ungültige Menge     | `addToCart` mit echtem Artikel und `quantity: 0`, `1.5` oder `100` | Schemafehler; Warenkorb unverändert                           |
| Falscher Typ        | `addToCart` mit `quantity: "2"`                                    | Schemafehler; JSON-Zahl statt String erforderlich             |
| Unbekannter Artikel | `addToCart` mit `articleNumber: "nicht-vorhanden"`                 | Fachlicher Fehler; Warenkorb unverändert                      |
| Fehlende Position   | `removeFromCart` mit `articleNumber: "nicht-im-warenkorb"`         | Fachlicher Fehler; übrige Positionen bleiben erhalten         |

Schemafehler können schon im Inspector-Formular abgefangen werden oder als
Validierungsfehler des SDK erscheinen. Sie müssen nicht denselben
`structuredContent`-Aufbau wie fachliche Fehler haben. Die automatisierte
Abnahme sendet ungültige Eingaben auch direkt an den MCP-Server.
Sie prüft zusätzlich die kumulierte Mengengrenze: Auch mehrfaches Add darf
pro Position insgesamt höchstens 99 Einheiten ergeben.

### 5.4 Optional: Dieselbe Implementierung über stdio prüfen

Dieser Abschnitt wird nur der Vollständigkeit halber aufgeführt und kann
übersprungen werden. Für das Szenario eines Webshop-MCP-Servers ist stdio wenig
sinnvoll: Der Shop soll als laufender Dienst über HTTP erreichbar sein und
seinen Zustand mit der Browser-Oberfläche teilen. stdio wird typischerweise
für die Anbindung lokaler Tools verwendet, deren Serverprozess der MCP-Client
auf dem eigenen Rechner startet. Für die weiteren Schritte genügt HTTP.

Beende den HTTP-Inspector in Terminal C mit `Ctrl+C`. Lass den Katalog in
Terminal A laufen. Starte im Starter-Ordner einen Inspector, der den
stdio-Prozess selbst erzeugt:

```bash
npx @modelcontextprotocol/inspector@latest --web node src/features/mcp/stdio.ts
```

Verbinde den angezeigten stdio-Server und wiederhole Suche, Add, Get, Remove,
Checkout und Orders aus der Tabelle. Dafür muss Terminal B nicht laufen.
Der Inspector startet hier direkt `node`, damit stdout ausschliesslich dem
MCP-Protokoll gehört.

Zum Verständnis des Einstiegspunkts kannst du alternativ allein Folgendes starten:

```bash
npm run start:stdio
```

Dieser Prozess wartet auf MCP-Nachrichten über stdin. Er öffnet keinen HTTP-Port
und bietet keine interaktive Texteingabe wie ein Chat. Beende ihn mit `Ctrl+C`,
bevor du wieder den Inspector verwendest. Ein separat gestarteter stdio-Prozess
wird vom Inspector nicht nachträglich übernommen.

**Erwartung:** Gleiche Toolnamen und Fachregeln wie bei HTTP, aber ein eigener
Warenkorb. Änderungen sind deshalb nicht im Browser auf Port 3041 sichtbar.
Auch ein neu gestarteter stdio-Prozess beginnt wieder ohne Warenkorb und Historie.

## 6. In Claude Code einbinden

Für diesen Test verwendest du **HTTP**, damit du die Auswirkungen im Browser
vergleichen kannst. Katalog und Shop müssen auf Port 4040 und 3041 laufen.

### 6.1 CLI vorbereiten und Server registrieren

Falls Claude Code noch fehlt, installiere es unter macOS mit Homebrew:

```bash
brew install --cask claude-code
claude --version
```

Für Linux, Windows oder WSL stehen die Installationsbefehle im offiziellen
[Claude-Code-Quickstart](https://code.claude.com/docs/en/quickstart).
Beim ersten Start von `claude` erfolgt die Anmeldung für deinen Claude-Zugang.

Führe im Starter-Ordner aus:

```bash
claude mcp add --transport http --scope local webshop http://localhost:3041/mcp
claude mcp get webshop
claude mcp list
claude
```

Der Name `webshop` bezeichnet diese Verbindung. `--scope local` speichert sie
für dich und das aktuelle Projekt. Gib anschliessend **in Claude Code** ein:

```text
/mcp
```

Prüfe, dass `webshop` verbunden ist und sechs Tools anbietet. Falls die Sitzung
schon vor der Registrierung lief, starte sie neu. Verwaltung und HTTP-Optionen
sind in der [Claude-Code-MCP-Dokumentation](https://code.claude.com/docs/en/mcp)
beschrieben.

### 6.2 Mit echten Aufträgen testen

Gib diesen Auftrag in Claude Code ein:

```text
Teste die MCP-Verbindung webshop. Bediene den Shop ausschliesslich über deren
MCP-Tools; ändere keine Projektdateien und verwende keine Shell- oder Browser-
Aufrufe als Ersatz. Mein Demo-Konto ist hotel-alpenblick.
Suche Milch und lege zwei Verkaufseinheiten eines gefundenen Artikels in meinen
Warenkorb. Zeige danach den Warenkorb. Bestelle noch nichts.
```

Prüfe die ausgeführten Tools und Argumente: Die Artikelnummer muss aus einer
Suche stammen, und die Warenkorb-Aufrufe müssen deine `loginId` verwenden.
Lade den Shop im Browser mit demselben Konto neu und vergleiche die Menge.
Falls bereits Artikel vorhanden waren, wird die Menge erhöht.

Teste als Folgeauftrag das Entfernen:

```text
Entferne den soeben hinzugefügten Artikel vollständig aus meinem Warenkorb und
zeige den verbleibenden Inhalt. Bestelle weiterhin nichts.
```

Füge anschliessend wieder einen Artikel hinzu und lass dir vor dem Checkout
die Positionen und den Gesamtbetrag zeigen. Erst danach erteilst du die Freigabe:

```text
Ja, schliesse jetzt die Demo-Bestellung für den gezeigten Warenkorb von
hotel-alpenblick ab. Nenne die Bestellnummer und zeige danach die Bestellhistorie.
```

Bestätige eine zusätzlich angezeigte Host-Freigabe für diesen gewünschten
Tool-Aufruf. Vergleiche die zurückgegebene Bestellnummer mit `getOrders` im
Inspector und mit der Browser-Historie. Das Modell darf keine Nummer erfinden.

Optionaler Gegencheck in einer neuen Unterhaltung: Bitte um einen Einkauf ohne
Kontoangabe. Der Assistent soll nach dem Konto fragen, bevor er einen Warenkorb
verändert. Das Schema erzwingt eine ID, aber nicht, dass ein Modell sie korrekt
beim Benutzer erfragt; deshalb ist dieser Host-Test zusätzlich wichtig.

Falls du die Verbindung nach dem Workshop entfernen möchtest, beende Claude
Code und führe im selben Projekt aus:

```bash
claude mcp remove webshop
```

## 7. In ChatGPT einbinden

Dieser Abschnitt beschreibt **ChatGPT im Web**. Der dokumentierte Weg nutzt
einen erreichbaren HTTPS-Endpunkt. Eine lokale URL wie `http://localhost:3041/mcp`
ist von ChatGPT aus nicht direkt erreichbar. Alternativ unterstützt OpenAI
Secure MCP Tunnel; hier verwenden wir einen HTTPS-Tunnel zum bestehenden
HTTP-Endpunkt. Siehe [OpenAI: Verbindung testen](https://developers.openai.com/plugins/deploy/connect-chatgpt).

### 7.1 HTTPS-Adresse für deinen lokalen Shop erzeugen

Wenn dir bereits eine HTTPS-Adresse **deiner bearbeiteten Instanz** zur Verfügung
steht, verwende sie. Die URL einer fremden Musterlösung testet nicht deinen Code.
Für einen lokalen Test kannst du beispielsweise ngrok verwenden. Dafür brauchst
du einen ngrok-Zugang und dessen Authtoken.

Installiere unter macOS in Terminal D:

```bash
brew install ngrok
ngrok config add-authtoken "DEIN_NGROK_AUTHTOKEN"
ngrok http 3041
```

Ersetze den Token-Platzhalter durch deinen eigenen Token; er gehört nicht in
Projektdateien. Für andere Betriebssysteme siehe
[ngrok-Installation](https://ngrok.com/download/mac-os).
Lass Terminal D geöffnet und kopiere die ausgegebene HTTPS-Adresse,
beispielsweise `https://dein-tunnel.ngrok.app`.

Erlaube Vite den **genauen Hostnamen deiner Tunnel-Adresse**. Stoppe den Shop
in Terminal B mit `Ctrl+C` und starte ihn aus dem Starter-Ordner neu:

```bash
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=dein-tunnel.ngrok.app npm run dev -- --strictPort
```

Ersetze `dein-tunnel.ngrok.app` durch deinen tatsächlichen Hostnamen, ohne
`https://` und ohne Pfad. Diese
[Vite-Umgebungsvariable](https://vite.dev/config/server-options.html#server-allowedhosts)
vermeidet eine Änderung der Projektkonfiguration. Der Neustart leert den
Demo-Zustand; bereite deinen Testwarenkorb anschliessend neu vor.

Prüfe in einem freien Terminal deine tatsächliche URL:

```bash
curl --fail-with-body https://dein-tunnel.ngrok.app/health
npx @modelcontextprotocol/inspector@latest --web --server-url https://dein-tunnel.ngrok.app/mcp --transport http
```

Rufe über diese Inspector-Verbindung mindestens `searchProducts` und `getCart`
auf. Damit prüfst du den kompletten Weg durch den Tunnel vor der ChatGPT-Anbindung.
Katalog, Shop und Tunnel müssen während des Tests laufen; der Katalog selbst
braucht keine öffentliche Adresse.

Der Tunnel macht den lokalen Demo-Shop erreichbar. Verwende hier ausschliesslich
Demo-Daten: `loginId` ist kein Zugriffsschutz. Der vorbereitete öffentliche Guard
in `src/features/mcp/public-demo-guard.server.ts` begrenzt bei Aktivierung Requests,
ersetzt aber keine Authentifizierung. Beende den Tunnel nach dem Test mit `Ctrl+C`.

### 7.2 Developer Mode aktivieren und Verbindung anlegen

Die Menübezeichnungen entsprechen der offiziellen Dokumentation vom
**7. September 2026**; Verfügbarkeit und Freigabe hängen vom Konto und den
Workspace-Regeln ab. Fehlt die Funktion, führe den Host-Test mit Claude Code
durch und halte ChatGPT als noch nicht geprüft fest.

1. Öffne ChatGPT im Web und gehe zu **Settings → Security and login**.
2. Aktiviere **Developer mode**.
3. Öffne **Plugins** und wähle die **Plus-Schaltfläche**, um eine Verbindung anzulegen.
4. Vergib beispielsweise den Namen `Workshop Webshop` und eine kurze Beschreibung.
5. Trage unter **Connection** die öffentliche URL inklusive Pfad ein:
   `https://dein-tunnel.ngrok.app/mcp`.
6. Wähle **No Authentication**, da dieser Demo-Server kein OAuth implementiert.
7. Erstelle die Verbindung und prüfe die sechs erkannten Tools.

Dieser Modus unterstützt auch schreibende Tools. Zusätzliche Tools namens
`search` oder `fetch` sind dafür nicht erforderlich; die sechs vorhandenen
Toolnamen bleiben erhalten. Details:
[OpenAI: ChatGPT Developer Mode](https://developers.openai.com/api/docs/guides/developer-mode).

### 7.3 Verbindung in einer Unterhaltung verwenden

Beginne eine neue Unterhaltung, wähle im Plus-Menü **Developer mode** und
aktiviere `Workshop Webshop`. Verwende danach die Einkaufs-, Entfernen- und
Checkout-Aufträge aus Schritt 6.2 mit diesem Verbindungsnamen.

Kontrolliere Toolname, `loginId`, Artikelnummer und Menge in den angezeigten
Aufrufen. Prüfe Warenkorb und Bestellnummer zusätzlich im lokalen Browser
oder über den Inspector. Der Tunnel führt in denselben HTTP-Shop-Prozess.
Ein Checkout soll erst nach deiner ausdrücklichen Freigabe erfolgen; achte
auch auf die Bestätigungsoberfläche des Hosts.

Wenn du Toolnamen, Schemas oder Beschreibungen später änderst, aktualisiere
die Verbindung mit **Refresh** und beginne eine neue Unterhaltung. Ändert sich
die Tunnel-Adresse, muss auch die hinterlegte MCP-URL aktualisiert beziehungsweise
die Verbindung neu angelegt werden. Dieser Aktualisierungsablauf steht in der
[OpenAI-Anleitung zum Testen](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## 8. Abschluss und Fehlersuche

### Abnahmekriterien

- [ ] Alle sechs MCP-Callbacks sind implementiert; kein Aufruf liefert mehr `Noch nicht implementiert.`.
- [ ] Suche funktioniert ohne Konto; Warenkorb und Bestellungen verlangen eine gültige `loginId`.
- [ ] Add, Mehrfach-Add, Remove, Checkout und Historie liefern korrekte Daten und passende Texte.
- [ ] Fehler verändern keine fremden Konten und erzeugen keine zusätzlichen Bestellungen.
- [ ] HTTP-MCP und Browser zeigen nach Reload denselben Zustand für dasselbe Konto.
- [ ] Optional, falls Abschnitt 5.4 durchgeführt wurde: stdio funktioniert mit eigenem Zustand; du kannst den Unterschied erklären.
- [ ] Typprüfung, Tests, Übungsabnahme, Build und Browser-Tests sind erfolgreich.
- [ ] Der manuelle Inspector-Ablauf inklusive Fehlerfällen wurde durchgeführt.
- [ ] Mindestens ein AI-Host wurde mit Einkauf, Entfernen und ausdrücklich freigegebenem Checkout geprüft.

Notiere zum Abschluss den geprüften Host und Transport, die beobachtete
Bestellnummer, die ausgeführten Prüfungen und allenfalls noch offene Host-Tests.

### Häufige Probleme

| Beobachtung                                           | Was du prüfen solltest                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Shop erreichbar, Produktsuche schlägt fehl            | Läuft Terminal A? Stimmen `CATALOG_MODE` und `MOCK_CATALOG_ORIGIN`?                                         |
| Inspector findet keinen Server                        | Läuft Terminal B wirklich auf 3041? URL mit `/mcp`, Transport HTTP statt SSE verwenden.                     |
| Toolliste vorhanden, aber `Noch nicht implementiert.` | Noch ein Callback-Stub vorhanden oder falscher Projektordner gestartet; nach Speichern neu verbinden.       |
| Add meldet Artikel nicht gefunden                     | Echte `articleNumber` aus dem aktuellen Suchresultat verwenden, keinen Platzhalter und keinen Produktnamen. |
| Browser-Warenkorb unterscheidet sich                  | Gleiche `loginId`, HTTP statt stdio, dieselbe Instanz; Browser neu laden.                                   |
| Nach Neustart fehlen Bestellungen                     | Erwartet: Demo-Zustand liegt ausschliesslich im Prozessspeicher.                                            |
| Checkout schlägt fehl                                 | `getCart` aufrufen und prüfen, ob das richtige Konto einen gefüllten Warenkorb hat.                         |
| `npm test` grün, aber Einkauf unvollständig           | `npm run test:exercise` ausführen; nur dieser Befehl verlangt im Starter die fertigen Callbacks.            |
| Playwright meldet fehlenden Browser                   | `npx playwright install chromium` ausführen.                                                                |
| ChatGPT verbindet nicht                               | Öffentliche HTTPS-URL inklusive `/mcp` im Inspector prüfen; Tunnel und Shop müssen laufen.                  |
| Tunnel liefert `Blocked request`                      | Tatsächlichen Tunnel-Host über `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` erlauben und Vite neu starten.      |
| Host kennt alte Tools oder alte URL                   | Verbindung aktualisieren beziehungsweise neu anlegen und neue Unterhaltung starten.                         |

### Optionale Vertiefung

Mit einem in `.env` konfigurierten Provider und API-Key kannst du nach der
Abnahme zusätzlich echte Modellaufrufe testen:

```bash
npm run test:mcp:llm
```

Dieser Test ist kostenpflichtig und separat von `npm test`. Er prüft Einkauf,
Entfernen, bestätigten Checkout und Kontorückfragen über einen echten MCP-Client.
Szenarien, Limits und Berichte sind in
[`docs/MCP-TESTING.md`](docs/MCP-TESTING.md) erklärt.

Als Bonus kannst du den Warenkorb als MCP Resource anbieten oder untersuchen,
wie ein Human-in-the-loop-Ablauf über einen MCP-Request gestaltet werden könnte.
Diese Erweiterungen gehören nicht zur beschriebenen Abnahme.

Zum Vergleichen nach der Übung dient die
[Musterlösung](../02-webshop-mcp-server-solution/src/features/mcp/server.ts).
Ihre vollständige Implementierung entspricht den hier schrittweise ergänzten
Callbacks.
