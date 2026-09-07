# Tool Calling Basics (Musterlösung)

Der fertige Stand der [Mini-Übung Tool Calling Basics](../01-tool-calling-basics/EXERCISE.md):
eine eigenständige Kommandozeilen-Demo mit **vier** Webshop-Tools, in der jeder Schritt der
Tool-Calling-Schleife im Terminal sichtbar wird. Beide Aufgaben der Übung sind erledigt – das
vierte Tool `getArticleDetail` ist ergänzt und der Provider-Wechsel läuft ohne Codeänderung
über die lokale `.env`.

Provider-, Katalog-, Warenkorb- und Tool-Code liegen lokal in diesem Projekt. Es gibt keine
Oberfläche, kein Streaming und keine Session: Der Warenkorb-Handle `cartId` ist fix (`cli-demo`).
So bleibt nur der Mechanismus übrig, um den es hier geht.

## Starten

**Terminal 1 – Katalog.** Die Artikeldaten kommen von einem lokalen Mock-Katalog, der als
eigener Prozess läuft (Details: [01-mock-api](../../01-mock-api/README.md)):

```bash
cd 01-mock-api        # vom Repository-Wurzelverzeichnis aus
npm ci
npm start             # http://localhost:4040
```

Prüfen: `curl http://localhost:4040/health` antwortet mit `{"ok":true,"articles":94,…}`.

**Terminal 2 – Demo.**

```bash
cd 10-ai-in-the-app/01-tool-calling-basics-solution   # vom Repository-Wurzelverzeichnis aus
npm ci
cp .env.example .env
npm start
```

In der `.env` genau einen Provider-Block aktiv lassen und dort den API-Key eintragen
(OpenAI, Anthropic oder Google; siehe [Setup-Check](../../00-setup-check/README.md)).
`AI_MODEL` ist optional, sonst greift ein günstiges Standardmodell aus `src/provider.ts`.

## Die Szenarien

Alle Ausgaben unten stammen aus echten Läufen mit `google / gemini-3.1-flash-lite`. Modell,
Formulierung und Schrittzahl schwanken von Lauf zu Lauf – das Muster bleibt.

### 1. Suchen und in den Warenkorb legen (automatische Schleife)

```bash
npm start
# oder mit eigenem Auftrag:
npm start -- "Finde Basmati-Reis und lege eine Packung in den Warenkorb."
```

`src/agent-loop.ts` übergibt die Tools an `generateText` und lässt das SDK die Schleife drehen.
Der Callback `onStepEnd` protokolliert jeden Schritt:

```text
--- Schritt 1 (finishReason: tool-calls) ---
  Tool-Aufruf  searchProducts({"term":"Vollmilch"})
  Tool-Resultat searchProducts → {"ok":true,"searchTerm":"Vollmilch","totalCount":5,…
--- Schritt 2 (finishReason: tool-calls) ---
  Tool-Aufruf  addToCart({"articleNumber":"022600","quantity":2})
  Tool-Resultat addToCart → {"ok":true,"cartId":"cli-demo","items":[{"articleNumber":"022600",…
--- Schritt 3 (finishReason: tool-calls) ---
  Tool-Aufruf  getCart({})
  Tool-Resultat getCart → {"ok":true,"cartId":"cli-demo","items":[…
--- Schritt 4 (finishReason: stop) ---
  Text: Ich habe zwei Packungen "Quality Vollmilch" in den Warenkorb gelegt. …

Schritte: 4, Tokens: 3729
```

Zu sehen ist:

- Ein Auftrag, drei Tool-Aufrufe, vier Modell-Aufrufe. Jeder Schritt kostet Tokens; deshalb
  begrenzt `stopWhen: isStepCount(8)` die Schleife.
- Das Modell verkettet selbst: Die Artikelnummer `022600` für `addToCart` stammt aus dem
  Resultat von `searchProducts`. Niemand hat diese Reihenfolge programmiert.
- Erst wenn `finishReason` von `tool-calls` auf `stop` wechselt, steht die Textantwort.

### 2. Artikeldetails – das vierte Tool (Aufgabe 1)

```bash
npm run start:detail
# entspricht: npm start -- "Welche Allergene enthält die Quality Vollmilch?"
```

```text
--- Schritt 1 (finishReason: tool-calls) ---
  Tool-Aufruf  searchProducts({"term":"Quality Vollmilch"})
  Tool-Resultat searchProducts → {"ok":true,…,"articles":[{"articleNumber":"022600",…
--- Schritt 2 (finishReason: tool-calls) ---
  Tool-Aufruf  getArticleDetail({"articleNumber":"022600"})
  Tool-Resultat getArticleDetail → {"ok":true,…,"ingredients":"Milch","durability":"Nach …
--- Schritt 3 (finishReason: stop) ---
  Text: Die Quality Vollmilch enthält als Allergene Milch und Laktose.

Schritte: 3, Tokens: 1702
```

Die Suche liefert Allergene nicht mit – ohne das vierte Tool antwortet das Modell an dieser
Stelle ausweichend oder erfindet etwas. Mit dem Tool entsteht die Kette **Suche → Detail →
Antwort** von selbst, weil die Tool-Beschreibung sagt, woher die Artikelnummer kommt:

```ts
'Liefert Details zu einem Artikel: Bezeichnung, Zutaten, Allergene, Preis und Haltbarkeit. ' +
'Die Artikelnummer stammt aus einem Treffer von searchProducts.'
```

Beschreibung, Zod-Schema und Handler stehen in `src/shop-tools.ts`. Der Handler ruft
`getArticleDetail()` aus `src/core/catalog.ts` auf und gibt nur die Felder zurück, die für
eine Antwort nötig sind – das vollständige Detail-Objekt hat gut zwanzig Felder und würde
die Anfrage unnötig mit Tokens fluten. Fehler liefert er als Wert (`{ ok: false, error }`)
statt sie zu werfen: Das Modell soll den Fehler lesen und reagieren können, etwa nochmals
suchen. Beides folgt der Linie von `src/core/handlers.ts`.

`src/core/` bleibt gegenüber dem Starter unverändert: Es ist die gemeinsame Grundlage aller
Workshop-Stufen, das vierte Tool gehört nur zu dieser CLI.

### 3. Dieselbe Schleife von Hand

```bash
npm run manual
npm run manual:detail
npm run manual -- "Was kostet Milch?"
```

`src/manual-loop.ts` deklariert dieselben vier Tools **ohne** `execute`. Das Modell kann sie
anfordern, ausführen muss sie das Skript selbst:

```text
--- Runde 1 (finishReason: tool-calls) ---
  Tool-Aufruf  searchProducts({"term":"Quality Vollmilch"})
  Tool-Resultat searchProducts → {"ok":true,…
--- Runde 2 (finishReason: tool-calls) ---
  Tool-Aufruf  getArticleDetail({"articleNumber":"022600"})
  Tool-Resultat getArticleDetail → {"ok":true,…
--- Runde 3 (finishReason: stop) ---

=== Antwort ===
Die Quality Vollmilch enthält als Allergene Laktose und Milch.
```

Die fünf Zeilen Schleife sind der ganze Trick: Modell aufrufen → Antwort an `messages`
anhängen → keine Tool-Aufrufe? fertig → sonst jeden Aufruf ausführen und das Resultat als
`tool`-Nachricht anhängen → nächste Runde. Genau das erledigt `generateText` in Szenario 1
intern; das Log sieht deshalb gleich aus (nur heissen die Schritte hier Runden).

### 4. Provider wechseln (Aufgabe 2)

In der lokalen `.env` den bisherigen Block vollständig auskommentieren, die drei Zeilen des
gewünschten Blocks aktivieren, den API-Key eintragen und dasselbe Skript erneut starten:

```dotenv
# Google (Gemini)
# AI_PROVIDER=google
# AI_MODEL=gemini-3.1-flash-lite
# GOOGLE_GENERATIVE_AI_API_KEY=…

# OpenAI
AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=…
```

Der Code bleibt unverändert; nur `createModel()` in `src/provider.ts` liefert ein anderes
Modell. Vergleichen lohnt sich bei: Anzahl Schritte, Reihenfolge der Tool-Aufrufe (manche
Modelle rufen `getCart` zur Kontrolle auf, andere nicht), Parallelität mehrerer Aufrufe in
einem Schritt und Tokenverbrauch.

### 5. Experimente

- **Beschreibung sabotieren:** `articleDetailDescription` auf "Tool 4" ändern und Szenario 2
  erneut starten. Das Modell findet das Tool nicht mehr zuverlässig. Beschreibung und Schema
  sind das User Interface des Tools gegenüber dem Modell.
- **Katalog stoppen:** Terminal 1 beenden und `npm start` laufen lassen. Der Fehler kommt als
  Tool-Resultat zurück, das Modell meldet ihn – der Prozess stürzt nicht ab.
- **Prompt ohne Tool-Bezug:** `npm start -- "Was ist die Hauptstadt der Schweiz?"` – kein
  Tool-Aufruf. Das Modell entscheidet selbst, wann Tools nötig sind.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `src/shop-tools.ts` | Die vier Tools: Beschreibung + Zod-Schema + `execute`. Enthält Beschreibung, Schema und Handler von `getArticleDetail`. |
| `src/agent-loop.ts` | Automatische Schleife: `generateText` mit `tools`, `stopWhen` und Schritt-Logging via `onStepEnd`. |
| `src/manual-loop.ts` | Dieselbe Schleife von Hand, mit Tools ohne `execute`. |
| `src/provider.ts` | `createModel()` für OpenAI, Anthropic oder Google aus der `.env`. |
| `src/core/` | Shop-Core: Katalogzugriff, Warenkorb, Tool-Contracts und framework-neutrale Handler. Identisch mit dem Starter. |

## Prüfen

```bash
npm run typecheck
npm test
```

Die Tests decken die Provider-Auflösung und das vierte Tool ab (Feld-Mapping, Schema-Validierung,
Fehler als Wert). Der Katalog wird dabei durch einen `fetch`-Stub ersetzt: Sie laufen ohne
Mock-API, ohne Netzwerk und ohne API-Key. Die Szenarien 1–4 brauchen einen echten Provider und
werden manuell geprüft.

## Anschluss

- Davor: [Wetter-Livedemo](../00-tool-calling-demo-solution/DEMO.md) – ein einziges Tool, dafür
  mit HTTP-Mitschnitt der Tool-Calling-Requests.
- Danach: [02-chatbot-vercel-ai-sdk](../02-chatbot-vercel-ai-sdk/EXERCISE.md) – dasselbe Muster
  im Webshop, mit Streaming, Oberfläche, Session-gebundenem Warenkorb und `checkout` mit Freigabe.
