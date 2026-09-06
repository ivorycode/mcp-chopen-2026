# 03 · 01 · Hello WebMCP

Minimale statische Seite, die ihre Funktionen über `document.modelContext` für Browser-Agenten exponiert: ein deklaratives Formular-Tool und zwei imperative Tools über eine sichtbare Todo-Liste. Kein Framework, kein Build.

## Starten

```bash
cd 30-webmcp/01-hello-webmcp
npm ci
npm run dev
```

Dann im für den Workshop vorbereiteten Chromium-Browser mit aktiviertem
`chrome://flags/#enable-webmcp-testing` und installierter Extension
"WebMCP - Model Context Tool Inspector" öffnen: http://localhost:3050

Die Demo wird eigenständig in diesem Projekt installiert. Details
zum erwarteten Browserzustand stehen in [Blockunterlagen](../../00-course-material/30-webmcp.md). Für diese
lokale Workshop-Demo werden bewusst weder ein Origin-Trial noch ein produktiver
Fallback eingebaut.

## Was zu sehen ist

- **Deklaratives Tool** `addTodo`: ein `<form toolname tooldescription toolautosubmit>`, dessen Felder per `toolparamdescription` beschrieben sind. Der Browser leitet das JSON-Schema aus den Formularfeldern ab; der `submit`-Handler antwortet dem Agenten mit `event.respondWith(...)`, wenn `event.agentInvoked` gesetzt ist.
- **Imperative Tools** `listTodos` (mit `annotations.readOnlyHint: true`) und `removeTodo`, registriert mit `document.modelContext.registerTool(tool, { signal })`. `window.webmcpController.abort()` in der DevTools-Konsole entfernt beide wieder.
- **Tool-Konsole** auf der Seite: listet `getTools()` auf und ruft `executeTool(tool, input)` mit JSON-Eingabe auf. Damit lassen sich die Tools ohne Agent und ohne Extension testen.

Experimente:

1. In der Tool-Konsole `listTodos` ausführen, dann `removeTodo` mit `{"id": 1}`. Die Liste auf der Seite ändert sich sofort.
2. `addTodo` mit `{"text": "Butter", "priority": "hoch"}` ausführen: Der Browser füllt das Formular aus und sendet es ab (`toolautosubmit`). Während der Agent das Formular bedient, ist die Pseudo-Klasse `form:tool-form-active` aktiv (oranger Rahmen).
3. In der DevTools-Konsole `await document.modelContext.getTools()` aufrufen und das aus dem Formular abgeleitete `inputSchema` von `addTodo` mit dem von Hand geschriebenen Schema von `removeTodo` vergleichen.
4. Die Extension "WebMCP - Model Context Tool Inspector" installieren und dieselben Tools aus dem Side Panel aufrufen.

**Erkenntnis:** Die Tools laufen vollständig im Browser-Tab. Es gibt keinen Server, keinen Transport und keinen Modell-Aufruf in der Seite. Das Modell bringt der Agent mit.

## Was nicht zu sehen ist

- Kein Agent: Ohne Extension oder eingebauten Browser-Agenten ruft niemand die Tools auf, ausser die Tool-Konsole der Seite selbst.
- Keine Feature-Detection und kein `navigator.modelContext`: Das Skript ruft `document.modelContext` direkt auf. In einem Browser ohne WebMCP endet es mit einem Fehler in der Konsole, das ist beabsichtigt (siehe [Blockunterlagen](../../00-course-material/30-webmcp.md)).
- Kein Origin-Trial-Token und kein produktiver Browser-Fallback: Die Demo setzt den vorbereiteten Chromium-Browser voraus.

## Struktur

```
server.mjs                 statischer HTTP-Server (Port 3050)
public/index.html          Formular-Tool, Todo-Liste, Tool-Konsole
public/tools.js            Registrierung der Tools (deklarativ + imperativ)
public/tool-console.js     getTools() / executeTool() auf der Seite
```
