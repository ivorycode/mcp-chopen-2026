# MCP Apps – Musterlösung

Mit dieser Musterlösung kannst du Produkte direkt in einem MCP-App-fähigen
Chat suchen, per Produktkarte in den Warenkorb legen, Positionen entfernen
und eine Mock-Bestellung abschliessen. Der parallel geöffnete Webshop zeigt
für dasselbe Demo-Konto nach dem Aktualisieren dieselben Mengen, Beträge
und dieselbe Order-ID.

Das Projekt ist eigenständig installierbar. Alle Schritte der
[Übung MCP Apps](../03-webshop-mcp-app/EXERCISE.md) sind implementiert; du
brauchst die Übung und die vorherigen Projekte nicht zuerst zu bearbeiten.
Diese README beschreibt den vollständigen Ablauf zum Ausprobieren und
Nachvollziehen der Ergebnisse.

## Was du mit der Musterlösung machen kannst

| Oberfläche                            | Möglichkeiten                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webshop unter `/`                     | Demo-Konto auswählen, Produkte suchen, Warenkorb bearbeiten, Mock-Bestellung abschliessen und Bestellhistorie ansehen                                   |
| Assistant und Workspace unter `/chat` | Mit dem Shop chatten und dieselben Shop-Tools verwenden; vom Modell angeforderter Checkout mit Freigabe                                                 |
| Search-App                            | Produktkarten anzeigen, innerhalb der App erneut suchen, Menge wählen und Verkaufseinheiten per Button hinzufügen                                       |
| Cart-App                              | Konto, Positionen, Mengen und Total anzeigen, ganze Positionen entfernen und per Button bestellen; danach Bestellbestätigung und leeren Warenkorb sehen |
| MCP Inspector                         | Alle sechs Tools aufrufen, strukturierte Resultate prüfen, beide HTML-Resources lesen und die App-Zuordnung nachvollziehen                              |
| Lokaler Testhost                      | Search- und Cart-App ohne LLM bedienen und ihre Meldungen an den Host beobachten                                                                        |
| Claude Desktop und ChatGPT            | Die Apps direkt im Gespräch anzeigen und mit ihren Buttons bedienen                                                                                     |

Die Cart-App zeigt auch die Anzahl bisheriger Bestellungen. Den vollständigen
Verlauf findest du im Resultat von `getOrders` und in der Bestellhistorie des
Webshops. Die Warenkorbzusammenfassung in der Search-App hat keine Entfernen-
oder Checkout-Buttons; dafür lädst du die Cart-App.

Verwende für den folgenden Durchlauf **`hotel-alpenblick`**. Weitere Demo-Konten
sind `restaurant-baeren` und `kantine-campus`. Jedes Konto hat einen eigenen
Warenkorb und Bestellverlauf. `loginId` ist die Kennung eines Demo-Kontos,
kein Passwort und keine OAuth-Anmeldung. Bestellungen sind ausschliesslich
Mock-Bestellungen; es erfolgt kein echter Kauf.

### Die sechs MCP-Tools

| Tool             | Argumente                                                      | Ergebnis und zugeordnete App                                           |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `searchProducts` | `term`, optional `loginId`                                     | Produkte und übergebenes Konto → Search-App                            |
| `getCart`        | `loginId`                                                      | Warenkorb mit Konto und Bestellverlauf → Cart-App                      |
| `addToCart`      | `loginId`, `articleNumber`, optional `quantity` (Standard `1`) | Aktualisierter Warenkorb → Cart-App                                    |
| `removeFromCart` | `loginId`, `articleNumber`                                     | Ganze Position entfernt, aktualisierter Warenkorb → Cart-App           |
| `checkout`       | `loginId`                                                      | Bestellbestätigung mit Order-ID und danach leerem Warenkorb → Cart-App |
| `getOrders`      | `loginId`                                                      | Warenkorb samt Bestellverlauf → Cart-App                               |

Ohne `loginId` funktioniert die Produktsuche; die Warenkorbbuttons bleiben
deaktiviert. Mit gültigem Konto kann die Search-App Artikel hinzufügen.
Sie übernimmt das Konto aus den Tool-Argumenten und Resultaten und hat keine
eigene Kontoauswahl. Eine unbekannte Login-ID liefert einen Fehler mit Hinweisen
auf die gültigen Konten.

### Wie Tool, Resource und Host-Bridge zusammenarbeiten

Der **Host** ist das Programm, das die App einbettet, etwa Claude Desktop oder
der lokale Testhost. Der MCP-Server liefert Text für das Modell in `content`
und die App-Daten in `structuredContent`. In der Tool-Definition verweist
`_meta.ui.resourceUri` auf die passende HTML-Resource:

- `ui://webshop/search-ui.html` für `searchProducts`;
- `ui://webshop/cart-ui.html` für die übrigen fünf Tools.

Diese URIs sind MCP-Adressen, keine Browser-URLs. Der Host liest das HTML über
`resources/read` und lädt es in einen abgegrenzten iframe, die **Sandbox**.
Die **Host-Bridge** ist die Nachrichtenverbindung zwischen App und Host.

```text
Host → tools/call: searchProducts { term, loginId } → MCP-Server
Host ← content + structuredContent ← MCP-Server
Host → resources/read: ui://webshop/search-ui.html → MCP-Server
Host → lädt HTML und übergibt Argumente/Resultat → Search-App im iframe

Klick auf «In den Warenkorb»
Search-App → app.callServerTool({ name: 'addToCart', arguments: … }) → Host → MCP-Server
Search-App ← aktualisierter Warenkorb ← Host ← gemeinsame Shop-Logik
```

Im Code erhält die App die initialen Argumente über `ontoolinput` und das
Resultat über `ontoolresult`. Bei einem Buttonklick ruft sie mit
`app.callServerTool(...)` über den Host ein weiteres Tool auf und verarbeitet
dessen Rückgabewert. Dafür ist kein neuer Modellentscheid nötig. Der Server
prüft weiterhin das Konto und die Warenkorbregeln.

Der Klick auf **Bestellung abschliessen** löst die Mock-Bestellung direkt aus.
Wird der Checkout vom Modell angefordert, soll es gemäss Tool-Beschreibung
vorher deine ausdrückliche Bestätigung einholen.

`app.updateModelContext(...)` informiert den Host nach Hinzufügen oder Entfernen
über den neuen Stand. Nach dem Checkout kann `app.sendMessage(...)` eine
Nachricht ins Gespräch senden. Diese Zusatzmeldungen verwenden die Apps nur,
wenn der Host die entsprechende **Capability**, also Unterstützung, ankündigt.
Fehlende oder fehlschlagende Meldungen ändern nichts an einer bereits
erfolgreichen Warenkorbaktion.

### Gemeinsamer Zustand über HTTP

Diese Anleitung verwendet durchgehend **Streamable HTTP** unter
`http://localhost:3044/mcp`. Webshop, Web-API und HTTP-MCP verwenden denselben
Prozessspeicher. Lade bereits geöffnete Ansichten neu oder rufe das Tool erneut
auf, um Änderungen eines anderen Clients zu sehen. Bei einem Server-Neustart
gehen Warenkörbe und Bestellungen dieses Prozesses verloren.

`npm run start:stdio` bietet dieselben Tools und Resources an; baue zuvor mit
`npm run build:apps` die HTML-Dateien. stdio startet einen eigenen Prozess mit
eigenem Zustand. Auch der Übungsstarter auf Port 3043 hat seinen eigenen Zustand.

## 1. Katalog und MCP-Server starten

Voraussetzung: Node.js ab 22.19 und npm. Für den lokalen Host und Inspector ist kein
LLM-API-Key nötig. Ein Provider-Key wird nur für echte Chat-Anfragen im
Webshop benötigt; Claude Desktop und ChatGPT verwenden ihre eigenen Zugänge.

Prüfe `node --version` und `npm --version`. Die folgenden `cd`-Befehle beginnen
jeweils im **Repository-Root `mcp-chopen-2026`**. Öffne separate Terminals.
Befehle ohne `cd` führst du anschliessend im Verzeichnis dieser Musterlösung aus.

**Terminal 1 – Mock-Katalog:**

```bash
cd 01-mock-api
npm ci
npm start
```

Der Katalog läuft auf Port **4040** und liefert die Daten für die MCP-Tools.

**Terminal 2 – Musterlösung:**

```bash
cd 20-app-in-the-ai/03-webshop-mcp-app-solution
npm ci
```

Kopiere die Beispielkonfiguration **nur, wenn hier noch keine `.env` existiert**:

```bash
cp .env.example .env
```

Kontrolliere diese Werte in `.env`:

```dotenv
CATALOG_MODE=mock
MOCK_CATALOG_ORIGIN=http://localhost:4040
ENABLE_PUBLIC_MCP_GUARDS=false
```

Die Provider-Einstellungen kannst du für die MCP-App-Demo unverändert lassen.
Starte den Shop:

```bash
npm run dev
```

`npm run dev` baut zuerst beide App-Resources und startet anschliessend den
HTTP-Server auf Port **3044**. Lass beide Terminals während der folgenden
Schritte laufen. Prüfe in einem weiteren Terminal:

```bash
curl --fail http://localhost:4040/health
curl --fail http://localhost:3044/health
```

Beide Aufrufe müssen erfolgreich sein. Öffne den [Webshop](http://localhost:3044),
wähle `hotel-alpenblick` und suche nach `Vollmilch`. Probiere Hinzufügen und
Entfernen aus; beginne den folgenden App-Durchlauf mit einem leeren Warenkorb.
Lass den Webshop zum späteren Abgleich geöffnet. `/mcp` ist ein Protokoll-Endpunkt.

**Assistant** und **Workspace** findest du unter
[http://localhost:3044/chat](http://localhost:3044/chat). Für echte Chat-Anfragen
ergänze einen Provider-Key gemäss [Setup-Anleitung](../../00-setup-check/README.md)
und starte den Shop neu. Ein fehlender Key verhindert die folgenden MCP-Schritte nicht.

## 2. MCP Apps im lokalen Testhost ausprobieren

Der lokale Host übernimmt die Rolle eines MCP-App-fähigen Chat-Clients. Du löst den
ersten Tool-Aufruf über ein Formular aus und kannst danach direkt mit der
eingebetteten App interagieren.

Starte in einem dritten Terminal, ausgehend vom Repository-Root:

```bash
cd 20-app-in-the-ai/03-webshop-mcp-app-solution
npm run dev:mcp-host
```

Öffne **http://127.0.0.1:43552**. Der Host verbindet sich über einen lokalen Proxy
mit `http://localhost:3044/mcp`; Port **43553** dient als separate App-Sandbox.
Warte auf den Status **Verbunden**.

1. Wähle bei **App** den Eintrag **Produktsuche**, trage als **Login-ID**
   `hotel-alpenblick` und als **Suchbegriff** `Vollmilch` ein. Klicke auf
   **App laden**. Nach **App bereit** siehst du die Search-App mit Produktkarten.
2. Ändere den Suchbegriff innerhalb der eingebetteten App und klicke auf
   **Suchen**. Dieser Aufruf läuft über `app.callServerTool()` zurück zum
   MCP-Server. Suche anschliessend wieder nach `Vollmilch`.
3. Setze bei einem Produkt die **Menge** auf `2` und klicke auf das
   Warenkorbsymbol (**In den Warenkorb**). Die App zeigt unmittelbar den
   aktualisierten Warenkorb. Unter **Modellkontext** zeigt der Host die Meldung
   aus `updateModelContext()`. Aktualisiere den parallel geöffneten Webshop:
   Artikelnummer, Menge `2` und Betrag müssen übereinstimmen. Wiederholtes
   Hinzufügen erhöht die vorhandene Menge.
4. Wähle oben im Host **Warenkorb**, behalte dieselbe Login-ID und klicke auf
   **App laden**. Nun erscheint die Cart-App zum Resultat von `getCart`.
5. Klicke in der Cart-App auf **Entfernen**. Der Button ruft `removeFromCart`
   über die Bridge auf; die Anzeige und der Modellkontext werden aktualisiert.
6. Lade nochmals die **Produktsuche**, füge einen Artikel hinzu und lade danach
   den **Warenkorb**. Klicke dort auf **Bestellung abschliessen**. Die App zeigt
   eine Mock-Bestellbestätigung mit Order-ID und einen leeren Warenkorb. Unter
   **Nachrichten der App** erscheint die mit `sendMessage()` gesendete Meldung.
   Der lokale Host zeigt sie an, generiert aber keine Modellantwort.
7. Aktualisiere den Webshop und öffne für `hotel-alpenblick` die Bestellhistorie.
   Vergleiche die Order-ID mit der App-Bestätigung. Der Warenkorb ist auch hier leer.
8. Lade abschliessend die **Produktsuche** mit leerer **Login-ID**. Die Suche
   funktioniert weiterhin, die Warenkorbbuttons sind deaktiviert. Das Konto
   kommt im echten Host aus dem Gespräch; die Search-App enthält keine
   Kontoauswahl.

Weitere gültige Demo-IDs sind `restaurant-baeren` und `kantine-campus`. Verwende
innerhalb eines Durchlaufs immer dieselbe ID, damit alle Tool-Aufrufe denselben
Warenkorb und Bestellverlauf zeigen.

## 3. Resources und Tool-Aufrufe im MCP Inspector nachvollziehen

Lass Katalog und HTTP-Server laufen. Starte in einem weiteren Terminal im
Verzeichnis dieser Musterlösung:

```bash
npm run inspector
```

Das Skript startet `npx @modelcontextprotocol/inspector@latest --web --config inspector.json`.
Beim ersten Aufruf lädt `npx` das Paket nach; bestätige eine eventuelle Installationsfrage.

1. Öffne die vom Inspector ausgegebene Browser-URL. Die mitgelieferte
   [inspector.json](inspector.json) enthält **webshop-local** mit Transport
   **HTTP / Streamable HTTP**, URL `http://localhost:3044/mcp` und
   `protocolEra: "modern"`. Wähle diesen Server und verbinde dich. Der Eintrag
   **webshop-remote** zeigt auf die öffentliche Demo
   <https://mcp-webshop-demo.fly.dev/mcp> und erlaubt dieselben Prüfungen ohne
   lokal laufenden Shop.
2. Liste im Bereich **Resources** die Resources auf (`resources/list`).
   Erwartet werden `ui://webshop/search-ui.html` und
   `ui://webshop/cart-ui.html`. Lies beide mit `resources/read`: Sie liefern
   gebautes HTML mit dem MIME-Type `text/html;profile=mcp-app`.
3. Liste unter **Tools** die Tools auf (`tools/list`). Prüfe bei
   `searchProducts` die Metadaten: `_meta.ui.resourceUri` verweist auf die
   Search-Resource. Die fünf übrigen Tools verweisen auf die Cart-Resource.
4. Rufe `searchProducts` mit diesen Argumenten auf (`tools/call`):

   ```json
   {
     "term": "Vollmilch",
     "loginId": "hotel-alpenblick"
   }
   ```

   Prüfe den Text in `content` und die App-Daten in `structuredContent`.
   In der App-Ansicht des Inspectors kannst du die Produktkarten bedienen und
   einen Artikel hinzufügen.

5. Rufe anschliessend `getCart` mit diesen Argumenten auf:

   ```json
   {
     "loginId": "hotel-alpenblick"
   }
   ```

   Die Cart-App zeigt den aktuellen Stand. Probiere **Entfernen** und nach
   erneutem Hinzufügen **Bestellung abschliessen** aus. Auch Änderungen aus dem
   lokalen Host sind sichtbar, sobald du das Tool erneut aufrufst: Beide Clients
   verwenden denselben HTTP-Server.

6. Rufe nach der Bestellung `getOrders` mit `{"loginId":"hotel-alpenblick"}`
   auf. Das strukturierte Resultat enthält den Bestellverlauf mit derselben
   Order-ID wie die App-Bestätigung und die Webshop-Historie.
7. Rufe `searchProducts` mit `{"term":"Vollmilch"}` auf: Produkte erscheinen,
   Hinzufügen ist gesperrt. `getCart` mit `{"loginId":"unbekanntes-konto"}`
   liefert einen verständlichen Fehler. Ein anderes gültiges Konto zeigt
   seinen eigenen Warenkorb.

Der Inspector unterstützt je nach Version nicht alle Host-Benachrichtigungen.
Fehlende `updateModelContext`- oder `message`-Capabilities verhindern die
Warenkorbaktionen nicht. Für die sichtbare Kontrolle dieser Meldungen verwende
den lokalen Host aus Schritt 2. Zur Inspector-Konfiguration siehe die
[offizielle Dokumentation](https://github.com/modelcontextprotocol/inspector/blob/main/docs/mcp-server-configuration.md).

## 4. HTTPS-Endpunkt für Claude Desktop und ChatGPT vorbereiten

Für die folgenden Einbindungen verwenden wir einen HTTPS-Tunnel zu **Port 3044**.
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

Lege im Verzeichnis dieser Musterlösung eine lokale Datei `ngrok-policy.yml` an:

```yaml
on_http_request:
  - actions:
      - type: add-headers
        config:
          headers:
            host: localhost:3044
```

Diese Policy setzt den Host-Header für den lokalen Vite-Server. Starte im
selben Verzeichnis in einem weiteren Terminal:

```bash
ngrok http 3044 --traffic-policy-file ngrok-policy.yml
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

## 5. In Claude Desktop einbinden

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
mit der Workshop-Leitung. Der lokale Durchlauf bleibt möglich.
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
5. Klicke **Bestellung abschliessen**. Diese Musterlösung simuliert eine Bestellung;
   es erfolgt kein echter Kauf. Prüfe Bestellbestätigung und leeren Warenkorb.
6. Aktualisiere den Webshop auf `http://localhost:3044`, wähle dasselbe Konto
   und vergleiche die Order-ID in der Bestellhistorie.
7. Teste in einem neuen Chat mit aktiviertem Connector eine Suche ausdrücklich
   **ohne `loginId`**: Produkte erscheinen, Hinzufügen ist gesperrt.

### Änderungen übernehmen und Verbindung beenden

Nach App-Änderungen führe im Verzeichnis dieser Musterlösung aus:

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

## 6. In ChatGPT einbinden

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
den lokalen Durchlauf vollständig durch und halte den externen ChatGPT-Test
als noch offen fest.

## 7. Implementierung und lokale Prüfung

Die neuen Bausteine lassen sich in dieser Reihenfolge im Code verfolgen:

| Baustein                                                | Datei                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| Resource-URIs, Tool-Metadaten und CSP                   | [resource-meta.ts](src/features/mcp-apps/resource-meta.ts)                 |
| Bereitstellung der beiden HTML-Resources                | [register-ui-resources.ts](src/features/mcp-apps/register-ui-resources.ts) |
| Zuordnung von Tools zu Apps und strukturierte Resultate | [server.ts](src/features/mcp/server.ts)                                    |
| Kontoübernahme, Suche und Hinzufügen über die Bridge    | [SearchApp.tsx](src/features/mcp-apps/search/SearchApp.tsx)                |
| Entfernen, Checkout und Host-Nachrichten                | [CartApp.tsx](src/features/mcp-apps/cart/CartApp.tsx)                      |

Nach Änderungen an einer App:

```bash
npm run build:apps
```

Lade sie anschliessend im Host erneut mit **App laden**. Die eingebetteten
Resources werden als einzelne HTML-Dateien aus `dist` gelesen und nicht per
Hot Reload aktualisiert.

### Automatisierte Prüfungen

Die Befehle gelten für die fertige Musterlösung. Ihre MCP- und App-Prüfungen
sollen ohne Übungsergänzungen erfolgreich sein; ein `test:exercise`-Skript
wird hier nicht benötigt.

| Befehl                      | Was geprüft wird                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                  | Shop-Regeln, Katalog, Events und MCP-Verträge; baut vorher die App-Dateien                                                      |
| `npm run typecheck`         | TypeScript-Verträge von Webshop, Server und Apps                                                                                |
| `npm run build`             | Webshop und beide HTML-Resources bauen                                                                                          |
| `npm run test:mcp`          | Gezielte MCP-Prüfung über echte HTTP-/stdio-Clients, Resources und Metadaten sowie gemeinsamer Zustand von HTTP-MCP und Web-API |
| `npm run test:browser`      | Alle Browser-Tests für Webshop, Chat und MCP Apps auf Desktop und Mobile                                                        |
| `npm run test:e2e:mcp-apps` | Gezielte Search-/Cart-Interaktion, anonyme Suche, Kontofehler und unterschiedliche Host-Capabilities                            |

Führe für einen vollständigen lokalen Durchlauf nacheinander aus:

```bash
npm test
npm run typecheck
npm run build
```

Installiere beim ersten Browser-Test Chromium für Playwright:

```bash
npx playwright install chromium
```

Beende vor den Browser-Tests den manuell gestarteten lokalen Host mit `Ctrl+C`.
Die Tests starten eigene Dienste auf **43552/43553** (Host/Sandbox),
**43554** (MCP-Server) und **43555** (Katalog). Shop 3044 und Katalog 4040
können weiterlaufen. Starte dann:

```bash
npm run test:browser
```

Für einen kürzeren, auf MCP Apps beschränkten Durchlauf kannst du stattdessen
`npm run test:mcp` und `npm run test:e2e:mcp-apps` verwenden. Die Tests benötigen
keinen LLM-Key; Chat-Tests verwenden simulierte Streams. Claude Desktop und
ChatGPT prüfst du zusätzlich mit den oben beschriebenen manuellen Schritten.
Echte LLM-Evaluationen sind optional und benötigen einen Provider-Key;
Szenarien, Limits und Berichte stehen in [docs/MCP-TESTING.md](docs/MCP-TESTING.md).

### Host-Meldungen gezielt nachvollziehen

Starte nach den Browser-Tests den lokalen Host wieder mit `npm run dev:mcp-host`.
Wiederhole Hinzufügen, Entfernen und Checkout auch mit diesen Varianten:

- [Host ohne Benachrichtigungs-Capabilities](http://127.0.0.1:43552/?notifications=unsupported)
- [Host mit absichtlich fehlschlagenden Benachrichtigungen](http://127.0.0.1:43552/?notifications=reject)

Die Shop-Aktionen sollen in beiden Fällen funktionieren. Bei `unsupported`
bleiben die Meldungsbereiche leer; bei `reject` können Konsolenwarnungen
erscheinen. Eine fehlgeschlagene Kontext- oder Gesprächsmeldung darf eine
bereits erfolgreiche Bestellung nicht als fehlgeschlagen darstellen.

## Häufige Probleme

| Beobachtung                                           | Prüfen und beheben                                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ECONNREFUSED` oder erfolglose Suche                  | Katalog auf 4040 und Shop auf 3044 starten; beide `/health`-URLs und `.env` prüfen.                                                                                    |
| Unter `/mcp` erscheint keine Shop-Seite               | Webshop unter `/` öffnen; `/mcp` über Inspector oder Host verwenden.                                                                                                   |
| HTML-Datei fehlt oder die App zeigt alten Code        | Im Verzeichnis der Musterlösung `npm run build:apps` ausführen und die eingebettete App neu laden. Bei geänderten Metadaten Server neu starten und Host neu verbinden. |
| Produkte erscheinen nur als Text/JSON                 | Im Inspector die App-Ansicht verwenden; bei externen Hosts Connector-Aktivierung und beide Resource-Zuordnungen prüfen. Ergänzend den lokalen Host verwenden.          |
| Warenkorbbuttons sind deaktiviert                     | Bei `searchProducts` eine gültige `loginId` übergeben. Ohne Konto ist dies das erwartete Verhalten.                                                                    |
| Verschiedene Warenkörbe in App und Webshop            | Dasselbe Konto und den HTTP-Server auf 3044 verwenden, Ansichten aktualisieren. stdio und Starter 3043 haben eigenen Zustand.                                          |
| Produktdaten vorhanden, Bilder fehlen                 | Die Apps laden Bilder von `webshop.transgourmet.ch`; Netzwerk und CSP in `resource-meta.ts` prüfen. Browser-Tests leiten Bildanfragen auf den Mock um.                 |
| Browser-Test meldet belegte Ports                     | Manuellen Host beenden; Ports 43552–43555 müssen für die Testdienste frei sein.                                                                                        |
| Claude Desktop oder ChatGPT erreicht den Server nicht | Laufenden Tunnel, HTTPS-URL inklusive `/mcp` und Host-Header-Policy prüfen. Dieselbe URL zuerst im Inspector testen.                                                   |

## Woran du das vollständige Ergebnis erkennst

- Beide HTML-Resources lassen sich lesen; alle sechs Tools verweisen auf die passende App.
- Die Search-App sucht mit und ohne Konto; mit gültigem Konto funktioniert Hinzufügen per Produktkarte.
- Die Cart-App entfernt Positionen und zeigt nach dem Checkout Bestellbestätigung und leeren Warenkorb.
- Webshop und HTTP-MCP zeigen für dasselbe Konto nach dem Aktualisieren dieselben Mengen, Beträge und Order-IDs.
- Die lokalen Prüfungen sind erfolgreich, auch bei fehlenden oder abgewiesenen Host-Meldungen.
- Im externen Host hast du die eingebetteten Karten und Buttons tatsächlich bedient. Halte Host, Prompt und Ergebnis fest; ein mangels Zugang offener Test bleibt ausdrücklich offen.
