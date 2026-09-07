# Live-Demo: Tool Calling mit dem Vercel AI SDK

Absolut minimales Demo für den Einstieg in Teil 1: ein Modell-Aufruf, ein Tool,
und die Tool-Calling-Schleife wird sichtbar. Dauer live ca. 5–10 Minuten.

Dieses Verzeichnis enthält den fertigen Endstand (`src/index.ts`) als Referenz
und Fallback, falls beim Live-Coding etwas schiefgeht. Die folgende Anleitung
baut das Demo Schritt für Schritt from scratch auf.

## Voraussetzungen

- Node.js >= 22.18 (führt TypeScript direkt aus, kein Build nötig)
- Ein API-Key für Google (Gemini), OpenAI oder Anthropic — derselbe wie in
  `00-setup-check/` (dort im README: Account, Key und Abrechnung)

## Schritt 0: Projekt vorbereiten (vor der Session)

Das Gerüst lohnt sich nicht zum Vortippen — `npm install` dauert und
`tsconfig.json` erklärt nichts über Tool Calling. Vorher erledigen:

```bash
mkdir tool-calling-demo && cd tool-calling-demo
npm init -y
npm pkg set type=module scripts.start="node src/index.ts"
npm install ai zod @ai-sdk/google @ai-sdk/openai @ai-sdk/anthropic
npm install -D typescript @types/node
mkdir src
```

Aus diesem Verzeichnis kopieren:

- `src/provider.ts` — liest `.env` und liefert je nach `AI_PROVIDER` das
  Modell von Google, OpenAI oder Anthropic. Reines Gerüst, hat mit Tool
  Calling nichts zu tun, deshalb nicht live tippen.
- `src/wire-log.ts` — optionaler Fetch-Proxy zum Mitschneiden der HTTP-Bodies;
  wird von `provider.ts` importiert und deshalb ebenfalls kopiert.
- `.env.example` → `.env`, dann genau einen Provider-Block aktivieren und den
  Key eintragen (gleiche Datei wie in `00-setup-check/`).
- `tsconfig.json` (optional, nur für den Typecheck im Editor; Node braucht
  sie nicht).

Kurz prüfen, dass alles läuft: `npm start` mit dem fertigen Endstand einmal
ausführen — nichts ist peinlicher als ein abgelaufener API-Key auf der Bühne.

## Schritt 1: Modell aufrufen — ohne Tool

Live in `src/index.ts` tippen — der einfachste denkbare Modell-Aufruf:

```ts
import { generateText } from 'ai'
import { createModel } from './provider.ts'

const model = createModel()

const result = await generateText({
  model,
  prompt: 'Wie ist das Wetter in Bern?',
})

console.log(result.text)
```

Ausführen:

```bash
npm start
```

**Zeigen:** Das Modell hat keinen Zugriff auf Live-Daten. Es weicht aus
("ich habe keinen Zugriff auf aktuelle Wetterdaten") oder halluziniert.
Genau diese Lücke schliesst Tool Calling: Wir geben dem Modell eine Funktion,
die es aufrufen kann.

## Schritt 2: Ein Tool definieren

Ein Tool besteht aus drei Teilen:

1. **Beschreibung** — daraus entscheidet das Modell, *wann* es das Tool aufruft
2. **Eingabe-Schema** (Zod) — das Modell erzeugt Argumente, die dazu passen
3. **`execute`** — ganz normaler eigener Code, läuft lokal, nicht beim Modell

Ergänzen (Imports erweitern: `tool` aus `ai`, `z` aus `zod`):

```ts
import { generateText, tool } from 'ai'
import { z } from 'zod'

const getWeather = tool({
  description: 'Liefert das aktuelle Wetter für einen Ort.',
  inputSchema: z.object({
    city: z.string().describe('Name des Ortes'),
  }),
  execute: ({ city }) => {
    console.log(`  [Tool] getWeather(${JSON.stringify(city)})`)
    return { city, temperature: 12, condition: 'sonnig' }
  },
})
```

**Zeigen:** `execute` ist hier ein Fake — in echt stünde hier ein
Wetter-API-Call, eine Datenbankabfrage oder Business-Logik. Das `console.log`
macht gleich sichtbar, dass unser Code wirklich ausgeführt wird.

## Schritt 3: Tool übergeben — die Schleife läuft

Den `generateText`-Aufruf erweitern:

```ts
import { generateText, isStepCount, tool } from 'ai'

const result = await generateText({
  model,
  prompt: 'Wie ist das Wetter in Bern?',
  tools: { getWeather },
  stopWhen: isStepCount(4),
})

console.log(result.text)
console.log(`(${result.steps.length} Schritte)`)
```

Ausführen: `npm start`

**Zeigen:**

- Das `[Tool]`-Log erscheint **vor** der Antwort — unser Code lief zwischendurch.
- Die Antwort enthält unsere Fake-Daten (12 Grad, sonnig): Das Modell hat das
  Tool-Resultat in Sprache verwandelt.
- `steps.length` ist 2: Das SDK hat das Modell **zweimal** aufgerufen.
  Ablauf der Schleife: Modell antwortet mit Tool-Aufruf → SDK führt `execute`
  aus → SDK schickt das Resultat zurück ans Modell → Modell formuliert die
  Antwort. `generateText` orchestriert das automatisch.
- `stopWhen: isStepCount(4)` begrenzt die Schleife — jeder Schritt ist ein
  Modell-Aufruf und kostet Geld.

## Schritt 3a: Tool Calling «on the wire» zeigen

Im fertigen Projekt lässt sich das Logging für einen Lauf einschalten:

```bash
npm run start:logged
npm run start:logged -- "Wie ist das Wetter in Bern und in Zürich?"
```

Alternativ `AI_LOG_WIRE=1` in `.env` setzen und normal `npm start` ausführen.
Diese Variante funktioniert auch mit dem oben live getippten `src/index.ts`.
Ohne Flag oder Umgebungsvariable ist das Logging ausgeschaltet.

Der Logger sitzt als **Fetch-Proxy im selben Prozess** zwischen dem
Provider-Adapter und dem HTTP-Transport. Es braucht keinen separaten Server,
keinen Port und keine zusätzlichen Pakete. Die Tool-Calling-Schleife bleibt
unverändert. Im Terminal sieht man die Reihenfolge:

```text
[Wire 01] → POST https://…
[Wire] Logs: …/logs/<Zeitstempel>-<Lauf-ID>
[Wire 01] ← HTTP 200 (01.md)
  [Tool] getWeather("Bern")
[Wire 02] → POST https://…
[Wire 02] ← HTTP 200 (02.md)
```

Im ausgegebenen Verzeichnis entstehen pro HTTP-Aufruf drei Dateien:

- `01.request.txt`: gesendeter Request-Body ohne Umformatierung.
- `01.response.txt`: empfangener Response-Body ohne Umformatierung.
- `01.md`: beide Bodies zusammen, mit URL-Pfad, HTTP-Status und eingerücktem JSON.

**Live zeigen:** `01.md` und `02.md` nebeneinander im Editor öffnen.

1. Im ersten Request stehen Prompt und Tool-Definition samt JSON-Schema.
   Der Code von `execute` wird nicht übertragen.
2. Die erste Response enthält den vom Modell erzeugten Tool-Aufruf inklusive
   Argumenten. Das Modell hat das Wetter-Tool noch nicht ausgeführt.
3. Zwischen den HTTP-Aufrufen erscheint das lokale `[Tool]`-Log.
4. Im zweiten Request stehen der bisherige Verlauf, der Tool-Aufruf und dessen
   Ergebnis. Die zweite Response formuliert daraus die Antwort.

Die Feldnamen sind providerabhängig und bleiben im Log erhalten:

| Provider | Tool-Aufruf in der Response | Tool-Ergebnis im nächsten Request |
| --- | --- | --- |
| Google Gemini | `functionCall` | `functionResponse` |
| OpenAI (Responses API) | `function_call` | `function_call_output` |
| Anthropic | `tool_use` | `tool_result` |

Ein normaler Wetter-Prompt ergibt typischerweise zwei HTTP-Aufrufe. Weitere
Tool-Schritte oder SDK-Retries erzeugen zusätzliche, fortlaufend nummerierte
Dateien. Auch HTTP-Fehler werden aufgezeichnet; bei Transportfehlern bleibt
der Request mit einem Fehlerhinweis erhalten.

Die Logs zeigen die tatsächlichen HTTP-Payloads nach der SDK-Serialisierung,
keinen Netzwerk-Paketmitschnitt. `fetch` hat eine eventuelle HTTP-Kompression
der Response bereits dekodiert. Auth-Header und URL-Query-Parameter werden
nicht protokolliert; die Bodies enthalten die vollständigen Prompts und
Tool-Ergebnisse. `logs/` ist im Workshop-Repository durch `.gitignore` ausgeschlossen.
Bei einer Kopie ausserhalb des Repositories `logs/` ebenfalls ignorieren.

Der schlanke Logger ist für diese `generateText`-Demo ausgelegt: Er liest die
Response zum Logging vollständig, bevor das SDK sie erhält. Für eine spätere
Live-Streaming-Demo müsste das Mitschreiben parallel zum Stream erfolgen.

## Schritt 4: Varianten (nach Zeit und Lust)

**Mehrere Tool-Calls in einem Auftrag:**

```ts
prompt: 'Wie ist das Wetter in Bern und in Zürich? Wo ist es wärmer?'
```

Das Modell ruft das Tool zweimal auf und vergleicht die Resultate. Damit der
Vergleich nicht langweilig wird, die Temperatur variieren, z. B.
`temperature: 7 + (city.length % 15)`.

**Beschreibung sabotieren:** Die `description` auf etwas Nichtssagendes ändern
("Tool 1") und fragen, ob das Modell das Tool noch findet — die Beschreibung
ist die API-Doku für das Modell.

**Prompt ohne Tool-Bezug:** `'Was ist die Hauptstadt der Schweiz?'` — das
Modell ruft das Tool *nicht* auf. Es entscheidet selbst, wann Tools nötig sind.

**Provider wechseln:** In der `.env` einen anderen Block aktivieren und erneut
`npm start` — der Code bleibt identisch. Das ist der Punkt des AI SDK:
Tool-Definition und Schleife sind providerunabhängig, jeder Anbieter bringt
nur seinen Adapter (`@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`).

## Anschluss an den Workshop

- Der fertige Endstand hier liest den Prompt zusätzlich von der Kommandozeile
  (`npm start -- "..."`) und gibt Provider und Modell aus — fürs Live-Tippen
  weggelassen.
- `01-tool-calling-basics/` vertieft genau dieses Muster: mehrere Tools
  (Webshop), Schritt-Logging mit `onStepEnd` und eine manuell ausprogrammierte
  Schleife, die zeigt, was `generateText` intern macht.
- `02-chatbot-vercel-ai-sdk/` hebt dasselbe Muster dann in einen streamenden
  Chatbot im Webshop.

## Checks

```bash
npm run typecheck
npm test
```

Die Tests durchlaufen für alle drei Provider die echte SDK-Tool-Schleife gegen
einen lokalen HTTP-Testserver. Sie prüfen die mitgeschnittenen Bodies, das
Zurücksenden des Tool-Ergebnisses, Auth-Weiterleitung ohne Header-Logging sowie
HTTP-, Transport- und Schreibfehler. Dafür sind keine API-Keys nötig.
