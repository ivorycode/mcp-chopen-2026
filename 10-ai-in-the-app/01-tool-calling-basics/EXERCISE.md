# Mini-Übung · Tool Calling Basics (10 min)

## Ausgangspunkt

Bereite das Projekt gemäss [README](README.md#starten) vor und starte die [Mock-API](../../01-mock-api/README.md). Die automatische Tool-Schleife und die drei Tools für Suche und Warenkorb sind bereits implementiert.

## Aufgaben

1. Ein viertes Tool `getArticleDetail` in `src/shop-tools.ts` ergänzen. Der Core liefert die Funktion `getArticleDetail(articleNumber)`:

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

2. Provider wechseln: In der lokalen `.env` den bisherigen Provider-Block vollständig auskommentieren, die drei Zeilen des gewünschten Blocks aktivieren, den API-Key eintragen und das Skript erneut starten. Der Code bleibt unverändert, nur `createModel()` liefert ein anderes Modell. Vergleichen: Anzahl Schritte, Reihenfolge der Tool-Aufrufe, Tokens.

**Erkenntnis:** Tool-Beschreibung und Schema sind das "User Interface" des Tools für das Modell. Eine ungenaue Beschreibung führt zu falschen oder fehlenden Aufrufen, unabhängig vom Provider.
