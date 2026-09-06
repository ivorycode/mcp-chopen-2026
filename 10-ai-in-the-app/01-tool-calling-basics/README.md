# 01 · Tool Calling Basics (Demo)

Die eigenständige Tool-Calling-CLI enthält Provider-, Katalog-, Warenkorb- und Tool-Code lokal. Jeder Schritt der Schleife wird geloggt.

## Starten

```bash
cd 10-ai-in-the-app/01-tool-calling-basics
npm ci
cp .env.example .env
npm start -- "Was kostet Basmati-Reis?"  # automatische Schleife
npm run manual -- "Was kostet Reis?"     # manuelle Schleife
```

Die separat installierte Mock-API läuft standardmässig auf Port 4040. Provider und Key kommen aus der lokalen `.env`; unterstützt sind OpenAI, Anthropic und Google sowie ein optionales `AI_MODEL`.

## Was zu sehen ist

- `src/shop-tools.ts`: Ein Tool = Beschreibung + Zod-Schema + `execute`. Beschreibung und Schema stammen aus `lokalen Shop-Core` (`toolDescriptions`, `searchProductsInput`, ...), `execute` delegiert an `toolHandlers`.
- `src/agent-loop.ts`: `generateText` mit `tools`, `instructions` und `stopWhen: isStepCount(8)`. Der Callback `onStepEnd` zeigt pro Schritt Tool-Aufrufe, Tool-Resultate und Text. Typischer Ablauf: `searchProducts` → `addToCart` → `getCart` → Textantwort.
- `src/manual-loop.ts`: Die Tools sind nur deklariert (kein `execute`). Das Skript liest die Tool-Aufrufe, führt die Handler selbst aus, hängt die Resultate als `tool`-Nachricht an `messages` an und ruft das Modell erneut auf. Das ist exakt, was das SDK in `agent-loop.ts` intern erledigt.

**Erkenntnis:** Das Modell führt nie selbst Code aus. Es erzeugt strukturierte Aufruf-Wünsche (`toolName` + `input`); die Anwendung führt aus und meldet das Resultat zurück. Die Schleife läuft in der Anwendung, nicht im Modell.

## Was nicht zu sehen ist

- Kein Streaming, keine Oberfläche, keine Session: Der Warenkorb-Handle `cartId` ist fix (`cli-demo`). Im Chatbot (Ordner `02-chatbot-vercel-ai-sdk`) kommt er aus der Session.
- Kein `checkout`: Bestellungen mit Bestätigung folgen in der Übung.

## Mini-Übung (10 min)

Ergänze ein Tool für Artikeldetails und vergleiche die Tool-Aufrufe verschiedener Provider. Die Anleitung steht in [EXERCISE.md](EXERCISE.md).
