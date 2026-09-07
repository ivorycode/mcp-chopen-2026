# Webshop mit WebMCP · Starter zu Teil 3

Alles aus Teil 1 und 2 ist hier fertig: der Shop, der eingebaute Chatbot, der MCP-Server
und die beiden MCP Apps. Neu in diesem Teil: Die **geöffnete Webseite selbst** bietet ihre
Funktionen als Tools an. Ein Agent im Browser ruft sie über `document.modelContext` auf –
im ausgewählten Demo-Konto des Tabs, ohne Server-Anbindung und ohne `loginId`-Argument.
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
cd 30-webmcp/02-webshop-webmcp   # vom Repository-Wurzelverzeichnis aus
npm ci
cp .env.example .env
npm run dev
```

Einen AI-Provider-Key brauchst du **für diese Übung nicht**: Du rufst die Tools selbst auf
und übernimmst damit die Rolle des Agenten.

Prüfen: `curl http://localhost:3051/health` → `{"status":"ok"}`

## 3. Chrome vorbereiten

WebMCP ist ein Entwurf und in Chrome hinter einem Flag versteckt. Öffne
`chrome://flags/#enable-webmcp-testing`, setze das Flag auf **Enabled** und starte Chrome
neu. Danach http://localhost:3051 öffnen und oben ein Demo-Konto wählen:
`restaurant-baeren`, `hotel-alpenblick` oder `kantine-campus`.

Prüfen: In der DevTools-Konsole liefert `document.modelContext` ein Objekt statt
`undefined`. Ohne das Flag bleibt der Shop normal bedienbar, nur die Tools fehlen.

## 4. Was du hier machst

`await document.modelContext.getTools()` liefert im Starter eine leere Liste, und das
eingebaute Tool-Panel unten im Shop zeigt keine Tools an. In der Übung registrierst du
fünf Browser-Tools – suchen, Warenkorb lesen, hinzufügen, entfernen und bestellen – und
meldest sie beim Verlassen der Seite wieder ab.

Getestet wird direkt in der DevTools-Konsole. Ein Aufruf besteht aus dem **Tool-Deskriptor**
aus `getTools()` und der Eingabe als **JSON-String**:

```js
var tools = await document.modelContext.getTools()
var search = tools.find((tool) => tool.name === 'searchProducts')
JSON.parse(
  await document.modelContext.executeTool(search, JSON.stringify({ term: 'Milch' })),
)
```

Jeder erfolgreiche Aufruf muss zweierlei bewirken: ein strukturiertes Resultat für den
Aufrufer **und** eine sichtbare Änderung in der Shop-Oberfläche. Zusätzlich stehen das
eingebaute Tool-Panel, der WebMCP-Bereich der Chrome DevTools und eine Inspector-Extension
zur Verfügung.

Schritte, Prüfungen und Testbefehle: [EXERCISE.md](EXERCISE.md).
Fertige Lösung zum Vergleich: [`../02-webshop-webmcp-solution`](../02-webshop-webmcp-solution/README.md).
