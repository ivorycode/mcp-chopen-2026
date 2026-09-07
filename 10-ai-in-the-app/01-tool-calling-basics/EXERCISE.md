# Mini-Übung · Tool Calling Basics (10 min)

Eine eigenständige Kommandozeilen-Demo: Provider-, Katalog-, Warenkorb- und Tool-Code liegen
lokal in diesem Projekt, und jeder Schritt der Agent-Schleife wird geloggt. Die automatische
Tool-Schleife und die drei Tools für Suche und Warenkorb sind bereits implementiert.

## Vorbereiten und starten

**Terminal 1 – Katalog starten.** Die Demo holt ihre Artikeldaten von einem lokalen
Mock-Katalog, der als eigener Prozess läuft (Details: [01-mock-api](../../01-mock-api/README.md)):

```bash
cd 01-mock-api        # vom Repository-Wurzelverzeichnis aus
npm ci
npm start             # http://localhost:4040
```

Prüfen: `curl http://localhost:4040/health` antwortet mit `{"ok":true,"articles":94,…}`.

**Terminal 2 – Demo starten.**

```bash
cd 10-ai-in-the-app/01-tool-calling-basics   # vom Repository-Wurzelverzeichnis aus
npm ci
cp .env.example .env
npm start -- "Was kostet Basmati-Reis?"  # automatische Schleife
npm run manual -- "Was kostet Reis?"     # manuelle Schleife
```

Provider und Key kommen aus der lokalen `.env`; unterstützt sind OpenAI, Anthropic und Google
sowie ein optionales `AI_MODEL`. Lass in der `.env` genau einen Provider-Block aktiv und trage
dort deinen API-Key ein (siehe [Setup-Check](../../00-setup-check/README.md)).

## Was zu sehen ist

- `src/shop-tools.ts`: Ein Tool = Beschreibung + Zod-Schema + `execute`. Beschreibung und Schema stammen aus `lokalen Shop-Core` (`toolDescriptions`, `searchProductsInput`, ...), `execute` delegiert an `toolHandlers`.
- `src/agent-loop.ts`: `generateText` mit `tools`, `instructions` und `stopWhen: isStepCount(8)`. Der Callback `onStepEnd` zeigt pro Schritt Tool-Aufrufe, Tool-Resultate und Text. Typischer Ablauf: `searchProducts` → `addToCart` → `getCart` → Textantwort.
- `src/manual-loop.ts`: Die Tools sind nur deklariert (kein `execute`). Das Skript liest die Tool-Aufrufe, führt die Handler selbst aus, hängt die Resultate als `tool`-Nachricht an `messages` an und ruft das Modell erneut auf. Das ist exakt, was das SDK in `agent-loop.ts` intern erledigt.

**Erkenntnis:** Das Modell führt nie selbst Code aus. Es erzeugt strukturierte Aufruf-Wünsche (`toolName` + `input`); die Anwendung führt aus und meldet das Resultat zurück. Die Schleife läuft in der Anwendung, nicht im Modell.

## Was nicht zu sehen ist

- Kein Streaming, keine Oberfläche, keine Session: Der Warenkorb-Handle `cartId` ist fix (`cli-demo`). Im Chatbot (Ordner `02-chatbot-vercel-ai-sdk`) kommt er aus der Session.
- Kein `checkout`: Bestellungen mit Bestätigung folgen in der Übung.

## Aufgaben

1. Ein **viertes Tool** `getArticleDetail` in `src/shop-tools.ts` ergänzen. Der Core liefert die Funktion `getArticleDetail(articleNumber)`:

   ```ts
   import { getArticleDetail } from './core/catalog.ts'
   import { z } from 'zod'

   getArticleDetail: tool({
     description: 'Liefert Details zu einem Artikel: Beschreibung, Zutaten, Allergene, Preis.',
     inputSchema: z.object({ articleNumber: z.string().describe('Exakte Artikelnummer aus einem Suchresultat.') }),
     execute: async ({ articleNumber }) => {
       const article = await getArticleDetail(articleNumber)
       return { articleNumber, description: article.description, ingredients: article.ingredients, allergens: article.allergenContains.map((a) => a.text), price: article.price }
     },
   }),
   ```

   Danach: `npm start -- "Welche Allergene enthält die Vollmilch?"` – im Log erscheint der zusätzliche Schritt.

2. **Provider wechseln**: In der lokalen `.env` den bisherigen Provider-Block vollständig auskommentieren, die drei Zeilen des gewünschten Blocks aktivieren, den API-Key eintragen und das Skript erneut starten. Der Code bleibt unverändert, nur `createModel()` liefert ein anderes Modell. Vergleichen: Anzahl Schritte, Reihenfolge der Tool-Aufrufe, Tokens.

**Erkenntnis:** Tool-Beschreibung und Schema sind das "User Interface" des Tools für das Modell. Eine ungenaue Beschreibung führt zu falschen oder fehlenden Aufrufen, unabhängig vom Provider.

Musterlösung: [`../01-tool-calling-basics-solution`](../01-tool-calling-basics-solution/README.md) – fertiger Stand mit dem vierten Tool, den Logs beider Schleifen und den Szenarien im README.
