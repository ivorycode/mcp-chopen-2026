# Webshop als MCP-Server · Starter zu Teil 2b

Der Webshop aus Teil 1 – inklusive eingebautem Chatbot – ist hier fertig. Neu in diesem
Teil: Der Shop öffnet seine Funktionen für **externe** KI-Assistenten. Statt selbst ein
Modell aufzurufen, bietet er einen MCP-Server an, und Claude, ChatGPT oder der MCP
Inspector rufen dessen Tools auf. Dieser Ordner ist eine eigenständige Kopie – du musst
nichts aus der vorherigen Übung übernehmen.

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
cd 20-app-in-the-ai/02-webshop-mcp-server   # vom Repository-Wurzelverzeichnis aus
npm ci
cp .env.example .env
npm run dev
```

In der `.env` zeigt `MOCK_CATALOG_ORIGIN` bereits auf den Katalog aus Schritt 1. Einen
AI-Provider-Key brauchst du **für diese Übung nicht** – nur, falls du zusätzlich den
eingebauten Chatbot aus Teil 1 ausprobieren willst.

Prüfen: `curl http://localhost:3041/health` → `{"status":"ok"}`

Dann http://localhost:3041 öffnen und oben ein Demo-Konto wählen: `restaurant-baeren`,
`hotel-alpenblick` oder `kantine-campus`. Andere Benutzernamen gibt es nicht.

## 3. Was du hier machst

Der Shop im Browser funktioniert bereits vollständig – du verwendest ihn als Gegenprobe:
Was ein Assistent über MCP tut, muss nach einem Reload auch im Browser sichtbar sein.

Der MCP-Server unter `http://localhost:3041/mcp` meldet schon sechs Tools, aber alle
Callbacks sind leer und antworten mit «Noch nicht implementiert». Diese sechs Callbacks
füllst du in der Übung aus: suchen, Warenkorb lesen, hinzufügen, entfernen, bestellen und
Bestellungen anzeigen.

Aufgerufen wird von aussen, ohne eigenen Modell-Key:

```bash
npm run inspector      # MCP Inspector als Web-UI, nutzt die lokale inspector.json
npm run start:stdio    # dieselben Tools über stdio, in einem eigenen Prozess
```

Weil ein externer Assistent das Session-Cookie des Browsers nicht hat, nennt er das Konto
als Tool-Argument `loginId`. Später bindest du den Server zusätzlich in Claude Code und
ChatGPT ein.

Schritte, Prüfungen und Testbefehle: [EXERCISE.md](EXERCISE.md).
Fertige Lösung zum Vergleich: [`../02-webshop-mcp-server-solution`](../02-webshop-mcp-server-solution/README.md).
