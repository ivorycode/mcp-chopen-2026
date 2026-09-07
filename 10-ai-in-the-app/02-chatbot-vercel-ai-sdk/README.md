# Chatbot mit Vercel AI SDK · Starter zu Teil 1

Ein fertiger Webshop mit Suche, Warenkorb und Bestellungen. Neu in diesem Teil: Die App
ruft selbst ein Sprachmodell auf und stellt ihm ihre Shop-Funktionen als **Tools** zur
Verfügung. Dieser Ordner ist eine eigenständige Kopie – du musst nichts aus einem anderen
Projekt übernehmen.

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
cd 10-ai-in-the-app/02-chatbot-vercel-ai-sdk   # vom Repository-Wurzelverzeichnis aus
npm ci
cp .env.example .env # nur das erste mal, API_KEY eintragen
npm run dev
```

In der `.env` zeigt `MOCK_CATALOG_ORIGIN` bereits auf den Katalog aus Schritt 1. Für den
Chat brauchst du zusätzlich einen **AI-Provider-Key**: genau einen Provider-Block aktiv
lassen und den Key eintragen (siehe [Setup-Check](../../00-setup-check/README.md)).

Prüfen: `curl http://localhost:3031/health` → `{"status":"ok"}`

Dann http://localhost:3031 öffnen und oben ein Demo-Konto wählen: `restaurant-baeren`,
`hotel-alpenblick` oder `kantine-campus`. Andere Benutzernamen gibt es nicht.

## 3. Was du hier machst

Öffne den **Assistant** unten rechts im Shop oder wechsle auf das **Tab "SHOP CHAT"** und sende «Suche Milch» – die Suche ist als Tool bereits angebunden und steuert die sichtbare Produktliste. «Zeig mir meinen Warenkorb» antwortet dagegen mit «Noch nicht implementiert».

Genau diese Lücke schliesst du in der Übung:

- die vier Warenkorb-Tools anzeigen, hinzufügen, entfernen und bestellen,
- ihre Darstellung im Workspace unter http://localhost:3031/chat,
- die Aktualisierung der Shop-Oberfläche nach einem Tool-Aufruf,
- und die ausdrückliche Freigabe, bevor das Modell eine Bestellung auslöst.

Schritte, Prüfungen und Testbefehle: [EXERCISE.md](EXERCISE.md).
Fertige Lösung zum Vergleich: [`../02-chatbot-vercel-ai-sdk-solution`](../02-chatbot-vercel-ai-sdk-solution/README.md).

