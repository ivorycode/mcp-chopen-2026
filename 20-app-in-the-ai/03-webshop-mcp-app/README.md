# Webshop mit MCP Apps · Starter zu Teil 2c

Der MCP-Server aus Teil 2b ist hier fertig: Ein Assistent kann suchen, den Warenkorb
verwalten und bestellen – aber nur als Text. Neu in diesem Teil: Ein Tool liefert seine
eigene **Oberfläche** mit. Der Host zeigt zum Suchresultat Produktkarten mit Mengenwahl
(Search-App) und zum Warenkorb eine Tabelle mit Entfernen- und Bestellbutton (Cart-App).
Dieser Ordner ist eine eigenständige Kopie.

Dieses README bringt nur das Projekt zum Laufen. **Die Aufgabe steht in
[EXERCISE.md](EXERCISE.md).**

## 1. Katalog starten (Terminal 1)

Die Artikeldaten kommen von einem lokalen Mock-Katalog. Er läuft als eigener Prozess und
wird von allen Workshop-Projekten geteilt.

```bash
cd 01-mock-api        # vom Repository-Wurzelverzeichnis aus
npm ci
npm start
```

Prüfen: `curl http://localhost:4040/health` → `{"ok":true,"articles":94,…}`

## 2. Webshop starten (Terminal 2)

```bash
cd 20-app-in-the-ai/03-webshop-mcp-app   # vom Repository-Wurzelverzeichnis aus
npm ci
cp .env.example .env
npm run dev
```

`npm run dev` baut zuerst die beiden App-Oberflächen (`npm run build:apps`) und startet
dann den Shop. Einen AI-Provider-Key brauchst du **für diese Übung nicht**.

Prüfen: `curl http://localhost:3043/health` → `{"status":"ok"}`

Dann http://localhost:3043 öffnen und oben ein Demo-Konto wählen: `restaurant-baeren`,
`hotel-alpenblick` oder `kantine-campus`.

## 3. Testhost starten (Terminal 3)

Die Apps werden nicht im Shop angezeigt, sondern in einem **Host**. Für die Übung genügt
der mitgelieferte lokale Testhost; Claude Desktop und ChatGPT kommen später dazu.

```bash
npm run dev:mcp-host   # im selben Projektordner
```

Dann http://127.0.0.1:43552 öffnen. Der Host verbindet sich mit
`http://localhost:3043/mcp` und zeigt die Apps in einer Sandbox auf Port 43553.
Nach Änderungen an den Apps neu bauen und die Host-Seite neu laden.

## 4. Was du hier machst

Im Testhost siehst du zu Beginn nur Text-Resultate: Die beiden HTML-Oberflächen sind zwar
im Projekt vorhanden, aber noch nicht als MCP-Resources registriert und keinem Tool
zugeordnet.

In der Übung ergänzt du:

- die Registrierung der Search- und der Cart-Oberfläche als MCP-Resources,
- die Verknüpfung Tool → Oberfläche über `_meta.ui.resourceUri`,
- die Übernahme des Demo-Kontos aus der Konversation in die App,
- und die schreibenden Aktionen der Apps, die über die **Host-Bridge** wieder Tools
  aufrufen (hinzufügen, entfernen, bestellen).

Am Ende demonstrierst du den Ablauf suchen → per Button in den Warenkorb → Warenkorb
anzeigen → bestellen vollständig im Host, während der parallel geöffnete Shop nach dem
Aktualisieren dieselben Daten zeigt.

Schritte, Prüfungen und Testbefehle: [EXERCISE.md](EXERCISE.md).
Fertige Lösung zum Vergleich: [`../03-webshop-mcp-app-solution`](../03-webshop-mcp-app-solution/README.md).
