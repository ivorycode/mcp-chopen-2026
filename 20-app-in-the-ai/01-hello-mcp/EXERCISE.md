# Mini-Übung · Hello MCP

## Ziel und Ausgangspunkt

Erkunde einen fertigen MCP-Server und verbinde ihn mit einem KI-Host. Unterscheide dabei Tools, Resources und Prompts und prüfe, ob der Host tatsächlich ein Tool aufruft. Die Implementierung liegt in `src/server.ts`; du musst für diese Übung keinen Server-Code ergänzen.

## 1. Server starten

Führe im Projektverzeichnis diese Befehle aus:

```bash
npm ci
npm run dev
```

Lasse das Terminal offen. Der MCP-Endpunkt ist standardmässig `http://localhost:3040/mcp`. Für die Hello-Tools brauchst du weder die Katalog-Mock-API noch einen eigenen LLM-Key. Eine optionale `.env` und die verfügbaren Startbefehle sind im [README](README.md#starten) beschrieben.

Führe in einem zweiten Terminal im selben Verzeichnis den vorbereiteten SDK-Client aus:

```bash
npm run client
```

**Prüfung:** Die Ausgabe listet `add` und `confirm-demo`. `add` liefert `{"sum":42}`. Ausserdem erscheinen das Ergebnis der Bestätigungsdemo, der Inhalt von `hello://about` und die Prompt-Vorlage `greet`.

## 2. Tools im Inspector aufrufen

Starte `npm run inspector` und verbinde dich mit dem HTTP-Server über die mitgelieferte `inspector.json`.

1. Liste die Tools auf und öffne `add`. Lies Beschreibung sowie Eingabe- und Ausgabe-Schema.
2. Rufe `add` mit `a = 20` und `b = 22` auf.
3. Vergleiche im Resultat `content` und `structuredContent` mit dem Callback in `src/server.ts`.
4. Wiederhole den Aufruf mit anderen Zahlen.

**Prüfung:** Beide Ergebnisdarstellungen enthalten dieselbe Summe. Der Server rechnet; für den Inspector-Aufruf ist kein Sprachmodell beteiligt.

## 3. Resource und Prompt erkunden

1. Liste im Inspector die Resources auf und lies `hello://about`.
2. Liste die Prompts auf und rufe `greet` mit `name = Anna` und `language = Französisch` ab.
3. Wiederhole den Prompt-Aufruf ohne `language` und vergleiche die erzeugte Nachricht.

**Prüfung:** Die Resource liefert die Serverbeschreibung. Der Prompt liefert eine Nachricht mit der Aufforderung zur Begrüssung; ohne Sprachangabe verwendet die Vorlage Deutsch. Eine Modellantwort wird dadurch noch nicht erzeugt.

## 4. Mit Claude oder ChatGPT verbinden

Folge im [README der Anleitung zur Einbindung](README.md#in-claude-desktop-und-chatgpt-einbinden): Starte den ngrok-Tunnel, übernimm die öffentliche HTTPS-Adresse inklusive `/mcp` und richte die Verbindung in einem verfügbaren Host ein. Die konkreten Schritte für Claude und ChatGPT sowie Hinweise zu Konto und Workspace stehen dort.

Sende im verbundenen Chat:

> Verwende das Tool `add` des Servers `Hello MCP` mit `a = 20` und `b = 22`.

**Prüfung:** Kontrolliere den tatsächlichen Tool-Aufruf mit diesen Argumenten und das Ergebnis `{"sum":42}`. Eine Textantwort mit der Zahl 42 allein belegt die Verbindung nicht.

Falls kein passender Host-Zugang verfügbar ist, prüfe die öffentliche URL mit `npm run curl -- https://deine-domain.ngrok-free.app/mcp` und halte die Host-Prüfung als offen fest. Das Skript enthält auch einen absichtlichen Fehlerfall mit fehlendem `Mcp-Method`-Header. Weitere Hinweise stehen unter [Verbindung testen](README.md#4-verbindung-testen).

## 5. Abnahme

Führe im Projektverzeichnis `npm test` und `npm run typecheck` aus. Erkläre anschliessend anhand der drei Beispiele:

- Was führt ein Tool aus?
- Welchen Inhalt liefert eine Resource?
- Was liefert ein Prompt, bevor ein Modell antwortet?

Beende nach der Übung den ngrok-Tunnel mit `Ctrl+C`.

## Bonus · Rückfrage und HTTP-Nachrichten

Lies den Callback von `confirm-demo` in `src/server.ts` und den Rückfrage-Handler in `src/client.ts`. Der vorbereitete Client bestätigt automatisch mit `confirm: true`. Ändere diesen Wert testweise auf `false` und führe `npm run client` erneut aus.

**Prüfung:** `executed` wechselt von `true` auf `false`. Setze deine Änderung danach zurück. Mit `npm run curl` kannst du die beiden Runden der Rückfrage und die HTTP-Header als einzelne Requests nachvollziehen.

Weiter geht es mit [Übung 2 · Webshop über MCP bedienen](../02-webshop-mcp-server/EXERCISE.md).
