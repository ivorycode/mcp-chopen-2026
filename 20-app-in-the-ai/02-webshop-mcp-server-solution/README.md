# Webshop mit MCP (Musterlösung)

Diese eigenständig installierbare Musterlösung macht den Webshop für externe
AI-Assistenten bedienbar. Alle sechs MCP-Tools sind fertig implementiert: Du
kannst Produkte suchen, den Warenkorb eines Demo-Kontos lesen und verändern,
eine Demo-Bestellung abschliessen und die Bestellhistorie anzeigen.

Die folgenden Schritte führen dich vom Start bis zum Einkauf über MCP Inspector,
Claude Desktop oder ChatGPT. Du brauchst die
[Übung im Starter](../02-webshop-mcp-server/EXERCISE.md) dafür nicht durchzuarbeiten
und keinen Code zu ergänzen. Die Anleitung wiederholt bewusst die dortigen
Testabläufe, damit du die Ergebnisse direkt mit der Musterlösung nachvollziehen
kannst. **Diese Musterlösung läuft auf Port 3042.**

## Was kannst du ausprobieren?

- **Klassischer Shop unter `/`:** Produktsuche, Artikeldetails, Demo-Login,
  Warenkorb, Mengenänderung, Entfernen, Checkout und Bestellungen.
- **AI im Shop:** Der **Assistant** steuert mit seinen Tool-Aufrufen die sichtbare
  Oberfläche. Der **Workspace** unter `/chat` zeigt Produkte, Warenkorb und
  Bestellungen als Widgets. Ein vom Modell angeforderter Checkout verwendet
  eine Ja/Nein-Freigabe. Produkt- und Bestellbuttons im Workspace rufen direkt
  die Web-API auf und dokumentieren die Aktion im Verlauf.
- **Shop in einer externen AI:** Claude Desktop oder ChatGPT entdeckt die MCP-Tools
  mit Beschreibungen und Eingabeschemas und führt deine Einkaufsaufträge aus.
  Im MCP Inspector kannst du dieselben Tools ohne Modell einzeln aufrufen.

Eingebettete Search- und Cart-Oberflächen im MCP-Host kommen erst in der
[nächsten Workshop-Stufe](../03-webshop-mcp-app/README.md). Hier liefert MCP
Text und strukturierte Daten. Claude Desktop kann die interaktiven MCP Apps
später direkt im Chat anzeigen; deshalb verwenden wir bereits hier denselben
Host wie in der [MCP-App-Übung](../03-webshop-mcp-app/EXERCISE.md).
Die Claude-Code-CLI eignet sich ebenfalls für reine
[MCP-Tool-Aufrufe](https://code.claude.com/docs/en/mcp). Für die spätere Prüfung
der eingebetteten Oberflächen verwenden wir den
[Desktop-Chat](https://support.claude.com/en/articles/13454812-use-interactive-connectors-in-claude).

## 1. Katalog und Musterlösung starten

Du brauchst Node.js **22.19 oder neuer**, npm und einen Browser. Die folgenden
Befehle sind für Bash/Zsh unter macOS, Linux oder WSL gedacht. Ersetze
`/pfad/zu/mcp-chopen-2026` durch deinen Repository-Pfad.

Starte zuerst den Katalog in **Terminal A** und lass ihn laufen:

```bash
cd /pfad/zu/mcp-chopen-2026/01-mock-api
npm ci
npm start
```

Der Mock-Katalog liefert Produktdaten und Bilder auf Port 4040. In
**Terminal B** installierst du die Musterlösung:

```bash
cd /pfad/zu/mcp-chopen-2026/20-app-in-the-ai/02-webshop-mcp-server-solution
npm ci
if [ ! -f .env ]; then cp .env.example .env; fi
```

Die `.env`-Vorlage enthält bereits die lokale Konfiguration. Prüfe bei einer
bestehenden `.env` diese Werte:

```dotenv
CATALOG_MODE=mock
MOCK_CATALOG_ORIGIN=http://localhost:4040
ENABLE_PUBLIC_MCP_GUARDS=false
```

Starte anschliessend den Shop und lass auch Terminal B geöffnet:

```bash
npm run dev -- --strictPort
```

`--strictPort` verhindert, dass der Shop bei einem belegten Port auf einen
anderen Port ausweicht. Die Adressen sind:

| Zugang                   | Adresse                      |
| ------------------------ | ---------------------------- |
| Webshop                  | <http://localhost:3042>      |
| Chat-Workspace           | <http://localhost:3042/chat> |
| MCP über Streamable HTTP | `http://localhost:3042/mcp`  |
| Katalog                  | <http://localhost:4040>      |

Für den klassischen Shop, MCP Inspector und die automatischen Tests können die
Modell-API-Keys leer bleiben. Nur für den eingebauten AI-Chat aktivierst du genau
einen Provider-Block in `.env` und trägst den passenden Key ein; siehe
[Setup-Check](../../00-setup-check/README.md). Dein Zugang zu Claude Desktop oder
ChatGPT ist davon unabhängig.

Prüfe in **Terminal C** die Erreichbarkeit:

```bash
curl --fail-with-body http://localhost:4040/health
curl --fail-with-body http://localhost:3042/health
curl --fail-with-body 'http://localhost:3042/api/search?term=Milch'
```

Die Health-Aufrufe müssen erfolgreich antworten; die Suche liefert Produktdaten
als JSON. Verwende Terminal C auch für die folgenden Client- und Testbefehle,
jeweils aus dem Ordner dieser Musterlösung.

## 2. Browser, Konten und gemeinsamen Zustand verstehen

Öffne <http://localhost:3042>, suche `Milch` und öffne die Details eines Treffers.
Melde dich über den Demo-Login als `restaurant-baeren` an. Lege einen Artikel
in den Warenkorb, ändere seine Menge, entferne ihn und füge ihn erneut hinzu.
Schliesse die Demo-Bestellung ab und prüfe die Bestellnummer in der Historie.
Der aktive Warenkorb ist danach leer.

Mit eingerichtetem Modell-API-Key kannst du zusätzlich im **Assistant** oder
unter `/chat` den Auftrag `Suche Milch und zeige mir den Warenkorb.` ausprobieren.

Es gibt drei gültige Demo-Konten: `restaurant-baeren`, `hotel-alpenblick` und
`kantine-campus`. Jedes hat einen eigenen Warenkorb und Bestellverlauf. Verwende
für den folgenden MCP-Ablauf das bisher unbenutzte Konto `hotel-alpenblick`.

```text
Browser / eingebauter Chat ── Web-API / Chat-Adapter ─┐
                                                   ├─ Shop-Logik ─ Katalog auf :4040
MCP-Clients ─────────────────────── HTTP /mcp ───────┘
                         ein Shop-Prozess auf :3042

MCP-Client ─ stdio ─ separater Node-Prozess ─ Shop-Logik ─ Katalog auf :4040
```

Browser, Chat und HTTP-MCP teilen pro Konto denselben Prozessspeicher. Nach
externen MCP-Aufrufen musst du eine bereits offene Browseransicht gegebenenfalls
neu laden, um den aktuellen Zustand zu sehen. Ein Browser-Reload löscht keine
Daten. Ein Server-Neustart dagegen leert Warenkörbe und Bestellungen; auch das
Neuladen von Servercode während der Entwicklung kann sie zurücksetzen.

Im Browser kommt das Konto aus einem Session-Cookie. Externe MCP-Clients
übernehmen dieses Cookie nicht und geben das Konto ausdrücklich als `loginId`
an. Das ist **Demo-Kontoauswahl, keine Authentifizierung**. Auch der Checkout
ist simuliert: Er speichert eine Bestellung im Prozess und löst weder einen
realen Einkauf noch eine Zahlung aus.

## 3. Die sechs MCP-Tools

| Tool             | Argumente                                       | Verhalten                                                                                                                                                            |
| ---------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `searchProducts` | `term`, optional `loginId`                      | Liefert höchstens fünf Produkte; `shownCount` zählt die gelieferten Treffer, `totalCount` alle Treffer. Ohne Konto enthält die Antwort `loginId: null`.              |
| `getCart`        | `loginId`                                       | Liefert aktuellen Warenkorb und `orders`. Ein unbenutztes Konto hat `cartId: null`, `items: []` und Summen von 0.                                                    |
| `addToCart`      | `loginId`, `articleNumber`, optional `quantity` | Legt bei Bedarf einen Warenkorb an und erhöht die Artikelmenge. Standardmenge ist 1; erlaubt sind ganze Verkaufseinheiten von 1 bis 99, auch insgesamt pro Position. |
| `removeFromCart` | `loginId`, `articleNumber`                      | Entfernt die gesamte Position, unabhängig von ihrer Menge.                                                                                                           |
| `checkout`       | `loginId`                                       | Schliesst einen gefüllten Warenkorb ab. Liefert die Bestätigung mit `orderId` sowie unter `cart` den anschliessend leeren Warenkorb und die aktualisierte Historie.  |
| `getOrders`      | `loginId`                                       | Liefert den aktuellen Warenkorb und unter `orders` höchstens die letzten 20 Bestellungen, neueste zuerst.                                                            |

Die Artikelnummer ist ein String und muss aus einem Suchergebnis stammen.
`totalItems` ist die Summe der Mengen, nicht die Zahl unterschiedlicher Positionen.
Ein separates `createCart`-Tool ist nicht nötig.

Jedes Tool liefert lesbaren Text in `content` und Daten in `structuredContent`.
Fachliche Fehler enthalten `ok: false`, einen Fehlertext und `isError: true`.
Ungültige Eingaben können bereits an der Schema-Prüfung scheitern und müssen dann
nicht dieses Ergebnisformat haben. Eine Suche ohne Treffer ist dagegen erfolgreich
und liefert `articles: []` sowie `shownCount: 0`.

Die Annotationen kennzeichnen Suche, Warenkorblesen und Historie als lesend.
Add verändert bei Wiederholung die Menge (`idempotentHint: false`); Remove
entfernt eine Position und darf bei Wiederholung einen Fehler liefern, ohne
weiteren Zustand zu verändern (`idempotentHint: true`). Checkout ist als
schreibend und nicht idempotent markiert.

**Checkout-Freigabe:** Die Tool-Beschreibung verlangt eine ausdrückliche
Bestätigung. Das ist kein serverseitiger Freigabedialog: Ein gültiger direkter
Tool-Aufruf führt den Checkout sofort aus. Im Inspector entscheidest du mit dem
Aufruf selbst; bei Claude Desktop oder ChatGPT prüfst du zusätzlich die Rückfrage
und eine allenfalls angezeigte Host-Freigabe.

## 4. Einen vollständigen Einkauf im MCP Inspector nachvollziehen

Starte aus dem Musterlösungsordner:

```bash
npm run inspector
```

Das Script lädt `inspector.json` mit dem vorkonfigurierten Server
**webshop-local** und der URL `http://localhost:3042/mcp`. Öffne die im Terminal
ausgegebene Inspector-Adresse, verbinde den Server über **HTTP / Streamable
HTTP** und öffne **Tools**. Du solltest genau die sechs Tools aus der Tabelle
sehen. Ein Aufruf von `/mcp` in der Browser-Adresszeile ersetzt diesen Test nicht;
der Endpunkt erwartet MCP-Protokollnachrichten.

### Suche, Hinzufügen und Browser-Vergleich

Rufe `searchProducts` mit diesen Argumenten auf:

```json
{ "term": "Milch" }
```

Erwarte `ok: true`, Produktdaten und einen passenden Text. Übernimm eine
`articleNumber` aus `structuredContent.articles` und ersetze damit den Platzhalter
im folgenden Aufruf von `addToCart`:

```json
{
  "loginId": "hotel-alpenblick",
  "articleNumber": "ARTIKELNUMMER_AUS_DER_SUCHE",
  "quantity": 2
}
```

Wiederhole Add mit derselben Artikelnummer und `quantity: 1`. Bei zuvor leerem
Warenkorb erwartest du eine Position mit Menge 3. Rufe `getCart` auf:

```json
{ "loginId": "hotel-alpenblick" }
```

Prüfe `totalItems: 3`, Artikelnummer, `cartId` und Gesamtbetrag. Melde dich im
Browser ebenfalls als `hotel-alpenblick` an und lade die Seite neu: Der Inhalt
muss übereinstimmen. Ein `getCart` für `kantine-campus` muss weiterhin den
unveränderten Zustand dieses anderen Kontos liefern.

### Entfernen, Checkout und Historie

1. Rufe `removeFromCart` mit `loginId: "hotel-alpenblick"` und derselben
   `articleNumber` auf. Die ganze Position verschwindet; `items` ist leer.
2. Wiederhole Remove. Erwarte einen fachlichen Fehler und keine weitere Änderung.
3. Füge über `addToCart` erneut eine Einheit hinzu. Notiere die `cartId` aus der Antwort.
4. Rufe `checkout` mit `{"loginId":"hotel-alpenblick"}` auf. Erwarte `ok: true`
   und eine `orderId`, die der notierten `cartId` entspricht. Unter `cart` stehen
   jetzt `cartId: null`, `items: []` und die aktualisierten `orders`.
5. Rufe `getOrders` mit `{"loginId":"hotel-alpenblick"}` auf.
   `orders[0].orderId` muss dieselbe Bestellnummer zeigen wie die Bestätigung.
   Vergleiche sie nach einem Reload mit der Browser-Historie.
6. Wiederhole Checkout. Der leere Warenkorb führt zu einem Fehler; es entsteht
   keine zweite Bestellung.
7. Füge erneut einen Artikel hinzu. Der neue Warenkorb erhält eine andere
   `cartId`; die vorherige Bestellung bleibt in der Historie erhalten.

Prüfe bei jedem Schritt sowohl den Text in `content` als auch die tatsächlichen
Daten in `structuredContent`.

### Fehlerfälle ausprobieren

| Aufruf                                                                    | Erwartung                                                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `getCart` mit `{"loginId":"unbekannt"}`                                   | Fachlicher Fehler und `validAccounts` mit den gültigen Demo-Konten.        |
| `getCart` mit `{}`                                                        | Schemafehler; kein Konto wird automatisch ausgewählt.                      |
| `searchProducts` mit `{"term":""}`                                        | Schemafehler.                                                              |
| `searchProducts` mit `{"term":"zzzz-kein-produkt-zzzz"}`                  | Erfolgreiches Ergebnis ohne Treffer.                                       |
| `addToCart` mit echtem Artikel und `quantity: 0`, `1.5`, `100` oder `"2"` | Schemafehler; die Menge muss eine JSON-Ganzzahl im erlaubten Bereich sein. |
| `addToCart` mit `articleNumber: "nicht-vorhanden"`                        | Fachlicher Fehler; Warenkorb unverändert.                                  |
| `removeFromCart` mit `articleNumber: "nicht-im-warenkorb"`                | Fachlicher Fehler; übrige Positionen bleiben erhalten.                     |

Gib bei den Add- und Remove-Fehlertests auch eine gültige `loginId` an.
Schemafehler kann bereits das Inspector-Formular abfangen.

## 5. HTTPS-Endpunkt für Claude Desktop und ChatGPT vorbereiten

Für die folgenden Einbindungen verwenden wir einen HTTPS-Tunnel zu **Port 3042**.
Katalog und Shop bleiben gestartet; beide Hosts greifen auf denselben
HTTP-Shop-Prozess zu wie der lokale Inspector und der Browser.

Auch in Claude Desktop verbindet sich ein **Custom Connector** aus Anthropics
Cloud mit deinem Server. Für diesen Einrichtungsweg reicht
`http://localhost:3042/mcp` deshalb nicht. Lokale Desktop-Server über stdio sind
ein anderer Einrichtungsweg. Siehe die
[Claude-Netzwerkanforderungen](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

Für ChatGPT nutzen wir dieselbe HTTPS-Adresse; alternativ unterstützt OpenAI
Secure MCP Tunnel. Siehe
[OpenAI: Verbindung testen](https://developers.openai.com/plugins/deploy/connect-chatgpt).

### HTTPS-Tunnel vorbereiten

Mit einem ngrok-Zugang und Authtoken kannst du unter macOS in **Terminal D**
einen Tunnel starten:

```bash
brew install ngrok
ngrok config add-authtoken "DEIN_NGROK_AUTHTOKEN"
ngrok http 3042
```

Ersetze den Token-Platzhalter durch deinen eigenen Token. Für andere Systeme
siehe [ngrok-Installation](https://ngrok.com/download/mac-os). Lass den Tunnel
laufen und kopiere seine HTTPS-Adresse, beispielsweise
`https://dein-tunnel.ngrok.app`.

Stoppe den Shop in Terminal B mit `Ctrl+C` und starte ihn aus dem
Musterlösungsordner mit dem **tatsächlichen Tunnel-Hostnamen** neu:

```bash
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=dein-tunnel.ngrok.app npm run dev -- --strictPort
```

Der Hostname steht ohne `https://` und ohne Pfad in der Umgebungsvariable.
Damit erlaubt Vite Anfragen über diesen Host. Der Neustart leert den Demo-Zustand;
lege deinen Testwarenkorb anschliessend neu an. Prüfe deine tatsächliche URL:

```bash
curl --fail-with-body https://dein-tunnel.ngrok.app/health
npx @modelcontextprotocol/inspector@latest --web --server-url https://dein-tunnel.ngrok.app/mcp --transport http
```

Rufe über diese Inspector-Verbindung Suche und Warenkorb auf, bevor du Claude Desktop oder ChatGPT
verbindest. Katalog, Shop und Tunnel müssen während des Tests laufen.

Der Tunnel macht den Demo-Shop öffentlich erreichbar. Verwende ausschliesslich
Demo-Daten: `loginId` ist kein Zugriffsschutz. Der lokal deaktivierte öffentliche
Guard begrenzt bei Aktivierung Requests, ersetzt aber keine Authentifizierung.
Beende den Tunnel nach dem Test mit `Ctrl+C`.

## 6. Den Shop mit Claude Desktop bedienen

Verwende eine aktuelle, angemeldete **Claude-Desktop-App** und öffne dort den
**Chat**. In dieser Stufe prüfst du die Tool-Aufrufe und ihre Ergebnisse;
interaktive Produktkarten und Warenkorbbuttons erscheinen erst mit der
MCP-App-Erweiterung der nächsten Übung.

### Custom Connector hinzufügen

Bereite zuerst den HTTPS-Endpunkt aus Abschnitt 5 vor. Die folgenden
Menübezeichnungen entsprechen der Dokumentation vom **7. September 2026**.

1. Öffne in Claude Desktop **Customize → Connectors**. Je nach Version findest
   du den Bereich unter **Settings → Connectors**.
2. Wähle **+ → Add custom connector**. Verwende als Namen **Workshop Webshop**
   und als Server-URL deine HTTPS-Adresse inklusive `/mcp`, beispielsweise
   `https://dein-tunnel.ngrok.app/mcp`.
3. Bestätige mit **Add** und verbinde den Connector, falls **Connect** angeboten
   wird. Die Demo benötigt keine OAuth-Zugangsdaten; `loginId` bleibt ein Tool-Argument.
4. Öffne einen neuen Chat und aktiviere **Workshop Webshop** über **+ → Connectors**
   für diese Unterhaltung.

Bei Team-/Enterprise-Konten muss ein Owner den Custom Connector zuerst für
die Organisation hinzufügen. Falls dir der Eintrag fehlt, kläre die Freigabe
mit der Workshop-Leitung; der lokale Inspector-Ablauf bleibt möglich.
Quelle: [Claude: Custom Connectors einrichten](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

### Beispielaufträge und erwartete Ergebnisse

Beginne mit diesem Auftrag:

```text
Verwende den Connector Workshop Webshop. Bediene den Shop ausschliesslich über
dessen MCP-Tools. Mein Demo-Konto ist hotel-alpenblick.
Suche Milch und lege zwei Verkaufseinheiten eines gefundenen Artikels in meinen
Warenkorb. Zeige danach den Warenkorb. Bestelle noch nichts.
```

Der Assistent soll suchen, eine Artikelnummer aus dem Ergebnis übernehmen,
`addToCart` mit deinem Konto aufrufen und den Warenkorb anzeigen. Bereits
vorhandene Mengen werden erhöht. Prüfe die Tool-Argumente und vergleiche das
Ergebnis nach einem Reload im Browser mit demselben Konto.

Teste anschliessend das Entfernen:

```text
Entferne den soeben hinzugefügten Artikel vollständig aus meinem Warenkorb und
zeige den verbleibenden Inhalt. Bestelle weiterhin nichts.
```

Bereite dann eine Bestellung vor:

```text
Lege wieder eine Verkaufseinheit desselben Artikels in den Warenkorb von
hotel-alpenblick. Zeige alle Positionen und den Gesamtbetrag und frage mich
vor dem Checkout nach meiner Bestätigung.
```

Prüfe den angezeigten Warenkorb und erteile danach die Freigabe:

```text
Ja, schliesse jetzt die Demo-Bestellung für den gezeigten Warenkorb von
hotel-alpenblick ab. Nenne die Bestellnummer und zeige danach die Bestellhistorie.
```

Bestätige eine zusätzlich angezeigte Host-Freigabe für diesen gewünschten Aufruf.
Die Bestellnummer muss aus dem Tool-Ergebnis stammen und mit `getOrders` im
Inspector und der Browser-Historie übereinstimmen.

Optional: Bitte in einer neuen Unterhaltung um einen Einkauf ohne Kontoangabe.
Der Assistent soll nach dem Konto fragen, bevor er den Warenkorb verändert.
Das Schema verlangt eine ID, erzwingt aber nicht, dass das Modell sie bei dir erfragt.

### Verbindung aktualisieren und entfernen

Nach Änderungen an Tool-Metadaten starte den Shop gegebenenfalls neu und öffne
einen neuen Chat. Prüfe bei Verbindungsproblemen, ob der Connector für die
Unterhaltung aktiviert ist, und trenne/verbinde ihn erneut.

Ändert sich die Tunnel-URL, entferne den Custom Connector und füge ihn mit der
neuen URL hinzu. Nach der Prüfung kannst du ihn unter **Connectors** über
**… → Remove** entfernen. Beende den Tunnel mit `Ctrl+C`, sobald du ihn auch
für den ChatGPT-Test nicht mehr brauchst.

## 7. Den Shop mit ChatGPT im Web bedienen

Verwende den HTTPS-Endpunkt aus Abschnitt 5. Katalog, Shop und Tunnel müssen
weiterlaufen; du kannst dieselbe URL wie für Claude Desktop verwenden.

### Verbindung anlegen und ausprobieren

Die folgenden Menübezeichnungen entsprechen der offiziellen Dokumentation vom
**7. September 2026**. Die Verfügbarkeit hängt von Konto und Workspace-Regeln ab.

1. Öffne in ChatGPT **Settings → Security and login** und aktiviere **Developer mode**.
2. Öffne **Plugins** und lege über die **Plus-Schaltfläche** eine Verbindung an.
3. Vergib den Namen `Workshop Webshop` und eine kurze Beschreibung.
4. Trage unter **Connection** deine HTTPS-URL inklusive `/mcp` ein,
   beispielsweise `https://dein-tunnel.ngrok.app/mcp`.
5. Wähle **No Authentication**, da der Demo-Server kein OAuth implementiert.
6. Erstelle die Verbindung und prüfe die sechs erkannten Tools.
7. Beginne eine neue Unterhaltung, wähle im Plus-Menü **Developer mode** und
   aktiviere `Workshop Webshop`.

Developer Mode unterstützt lesende und schreibende Tools; zusätzliche Tools
namens `search` oder `fetch` sind nicht nötig. Details stehen in
[OpenAI: ChatGPT Developer Mode](https://developers.openai.com/api/docs/guides/developer-mode).

Verwende die Beispielaufträge aus Abschnitt 6 mit `Workshop Webshop`. Prüfe Konto, Artikelnummer, Menge und die
Freigabe vor dem Checkout. Vergleiche Warenkorb und Bestellnummer im Browser
oder Inspector: Der Tunnel führt in denselben HTTP-Shop-Prozess.

Nach Änderungen an Tools oder Schemas aktualisierst du die Verbindung mit
**Refresh** und beginnst eine neue Unterhaltung. Bei einer neuen Tunnel-Adresse
musst du auch die MCP-URL anpassen oder die Verbindung neu anlegen. Siehe den
[OpenAI-Ablauf zum Aktualisieren](https://developers.openai.com/plugins/deploy/connect-chatgpt).
Falls Developer Mode für dein Konto fehlt, kannst du den gesamten Host-Test
mit Claude Desktop durchführen.

## 8. Optional: stdio mit eigenem Zustand ausprobieren

Für den Webshop ist HTTP der passende Zugang, weil der laufende Dienst seinen
Zustand mit dem Browser teilt. stdio demonstriert ergänzend, wie ein MCP-Client
einen lokalen Serverprozess startet.

Beende den bisherigen Inspector mit `Ctrl+C`. Lass den Katalog laufen und starte
im Musterlösungsordner:

```bash
npx @modelcontextprotocol/inspector@latest --web node src/features/mcp/stdio.ts
```

Verbinde den stdio-Server und wiederhole Suche, Add, Get, Remove, Checkout und
Orders aus Abschnitt 4. Der Shop auf Port 3042 muss dafür nicht laufen. Der
Inspector startet direkt `node`, damit stdout dem MCP-Protokoll gehört.

Du erhältst dieselben Tools und Fachregeln, aber einen **eigenen Warenkorb und
Bestellverlauf**. Diese Änderungen erscheinen nicht im Browser. Ein neuer
stdio-Prozess beginnt wieder mit leerem Zustand.

`npm run start:stdio` startet denselben Einstieg auch allein. Der Prozess wartet
dann auf MCP-Nachrichten über stdin; er öffnet keinen HTTP-Port und ist kein
interaktiver Chat. Ein Inspector übernimmt diesen separat gestarteten Prozess
nicht nachträglich.

## 9. Automatische Prüfungen

Führe im Musterlösungsordner aus:

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

| Befehl                 | Was wird geprüft?                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`    | TypeScript für Shop, Chat und MCP-Implementierung.                                                           |
| `npm test`             | Shop-Regeln, Katalog, Events und MCP-Verhalten mit einem echten SDK-Client über HTTP und stdio.              |
| `npm run test:mcp`     | Nur die MCP-Prüfungen über HTTP und stdio, einschliesslich des vollständigen Tool-Vertrags.                  |
| `npm run build`        | Produktionsbuild des Shops.                                                                                  |
| `npm run test:browser` | Browser-Oberfläche mit isoliertem Mock-Katalog und deterministischen Chat-Streams auf den Ports 43554/43555. |

Die automatischen Tests starten ihre Testserver selbst, brauchen keinen
Modell-API-Key und verändern die Warenkörbe deiner laufenden Demo nicht.
In dieser Musterlösung gibt es kein separates `test:exercise`-Script;
die vollständigen MCP-Prüfungen sind bereits Teil von `npm test` und
`npm run test:mcp`.

Optional kannst du mit einem konfigurierten Provider und API-Key echte
Modellaufrufe prüfen:

```bash
npm run test:mcp:llm
```

Diese Prüfung ist kostenpflichtig und läuft separat von `npm test`. Szenarien,
Limits und Berichte stehen in [docs/MCP-TESTING.md](docs/MCP-TESTING.md).
Externe Hosts und deren Freigabeverhalten prüfst du zusätzlich manuell mit den
Aufträgen oben. Notiere dabei Host, Transport, Bestellnummer und offene Prüfungen.

## Häufige Probleme

| Beobachtung                                 | Was du prüfen solltest                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Shop erreichbar, Suche schlägt fehl         | Läuft der Katalog auf 4040? Stimmen `CATALOG_MODE` und `MOCK_CATALOG_ORIGIN`?                                |
| Inspector verbindet nicht                   | Läuft die Musterlösung auf 3042? Verwende `/mcp` und HTTP / Streamable HTTP.                                 |
| Tool liefert `Noch nicht implementiert.`    | Du hast vermutlich den Starter statt der Musterlösung verbunden. Prüfe Projektordner und Port.               |
| Artikel wird nicht gefunden                 | Verwende eine echte `articleNumber` aus der Suche, keinen Produktnamen oder Platzhalter.                     |
| Browser und MCP zeigen andere Warenkörbe    | Prüfe gleiche `loginId`, dieselbe Instanz und HTTP statt stdio; lade den Browser neu.                        |
| Bestellungen fehlen nach Neustart           | Erwartet: Der Demo-Zustand liegt nur im Prozessspeicher.                                                     |
| Checkout schlägt fehl                       | Prüfe mit `getCart`, ob das richtige Konto einen gefüllten Warenkorb hat.                                    |
| Playwright findet keinen Browser            | Führe `npx playwright install chromium` aus; unter Linux bei fehlenden Systembibliotheken mit `--with-deps`. |
| Claude Desktop oder ChatGPT verbindet nicht | Prüfe die öffentliche HTTPS-URL inklusive `/mcp` im Inspector; Shop und Tunnel müssen laufen.                |
| Tunnel meldet `Blocked request`             | Erlaube den tatsächlichen Tunnel-Host über `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` und starte Vite neu.     |
| Host kennt alte Tools oder URL              | Aktualisiere die Verbindung oder lege sie neu an und starte eine neue Unterhaltung.                          |

## Code zur Musterlösung nachlesen

- [`src/features/mcp/server.ts`](src/features/mcp/server.ts): sechs vollständig
  implementierte Tool-Callbacks, Konto-Prüfung und Ergebnisformat; gemeinsame
  Server-Factory für HTTP und stdio.
- `src/lib/shop.server.ts`, `shop-state.ts`, `tools/handlers.server.ts`:
  gemeinsame kontogebundene Fachlogik für Web-API, Chat und MCP.
- `src/components/shop`: Shop-Komponenten; `src/features/chat`: Vercel AI SDK
  mit typisierten Tool-Parts und `toolApproval`.

Der Chat-Guard übergibt standardmässig höchstens die letzten 15 Nachrichten an
das Modell (`CHAT_MAX_MESSAGES`). Führende Nachrichten vor der ersten
Nutzernachricht im Ausschnitt werden zusätzlich entfernt; ohne Nutzernachricht
wird die Anfrage mit HTTP 400 abgewiesen. Der sichtbare Chat-Verlauf bleibt erhalten.
