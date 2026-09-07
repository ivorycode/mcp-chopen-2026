# Chatbot mit TanStack AI · Starter zu Teil 1 (Alternative)

Derselbe Webshop und dieselbe Aufgabe wie im Vercel-Starter, aber mit **TanStack AI**
statt dem Vercel AI SDK: Tools werden mit `toolDefinition()` deklariert und mit `.server()`
ausgeführt, der Chat läuft über einen offenen AG-UI-Stream, und die Freigabe vor einer
Bestellung verwendet Interrupts. Dieser Ordner ist eine eigenständige Kopie.

Bearbeite entweder diese Variante **oder** `02-chatbot-vercel-ai-sdk` – die MCP-Übungen in
Teil 2 bauen auf der Vercel-Lösung auf.

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
cd 10-ai-in-the-app/03-chatbot-tanstack-ai   # vom Repository-Wurzelverzeichnis aus
npm ci
cp .env.example .env
npm run dev
```

In der `.env` zeigt `MOCK_CATALOG_ORIGIN` bereits auf den Katalog aus Schritt 1. Für den
Chat brauchst du zusätzlich einen **AI-Provider-Key**: genau einen Provider-Block aktiv
lassen und den Key eintragen (siehe [Setup-Check](../../00-setup-check/README.md)).

Prüfen: `curl http://localhost:3033/health` → `{"status":"ok"}`

Dann http://localhost:3033 öffnen und oben ein Demo-Konto wählen: `restaurant-baeren`,
`hotel-alpenblick` oder `kantine-campus`. Andere Benutzernamen gibt es nicht.

## 3. Was du hier machst

Öffne den Chat und sende «Suche Milch» – die Suche ist als Tool bereits angebunden.
«Zeig mir meinen Warenkorb» antwortet mit «Noch nicht implementiert». Im Netzwerk-Tab
liefert `POST /api/chat` dabei einen AG-UI-SSE-Stream.

Genau diese Lücke schliesst du in der Übung:

- die Warenkorb-Tools anzeigen, hinzufügen, entfernen und bestellen,
- ihre Darstellung im Workspace unter http://localhost:3033/chat,
- die Aktualisierung der Shop-Oberfläche nach einem Tool-Aufruf,
- und die Bestätigung per Interrupt, bevor das Modell eine Bestellung auslöst.

Schritte, Prüfungen und Testbefehle: [EXERCISE.md](EXERCISE.md).
Fertige Lösung zum Vergleich: [`../03-chatbot-tanstack-ai-solution`](../03-chatbot-tanstack-ai-solution/README.md).
