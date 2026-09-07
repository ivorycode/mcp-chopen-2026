# 03 · 01 · Hello WebMCP

Minimale statische Seite, die ihre Funktionen über `document.modelContext` für Browser-Agenten exponiert: ein deklaratives Formular-Tool und zwei imperative Tools über eine sichtbare Todo-Liste. Kein Framework, kein Build.

## Starten

```bash
cd 30-webmcp/01-hello-webmcp
npm run dev
```

Dann im für den Workshop vorbereiteten Chromium-Browser mit aktiviertem
`chrome://flags/#enable-webmcp-testing` und installierter Extension
"WebMCP - Model Context Tool Inspector" öffnen: http://localhost:3050

Die Demo hat keine npm-Abhängigkeiten und benötigt keinen Installationsschritt. Details
zum erwarteten Browserzustand stehen in [Theorieunterlagen](../../00-course-material/teil-3-theorie--webmcp.md). Für diese
lokale Workshop-Demo werden bewusst weder ein Origin-Trial noch ein produktiver
Fallback eingebaut.

## Was zu sehen ist

- **Deklaratives Tool** `addTodo`: ein `<form toolname tooldescription toolautosubmit>`, dessen Felder per `toolparamdescription` beschrieben sind. Der Browser leitet das JSON-Schema aus den Formularfeldern ab; der `submit`-Handler antwortet dem Agenten mit `event.respondWith(...)`, wenn `event.agentInvoked` gesetzt ist.
- **Imperative Tools** `listTodos` (mit `annotations.readOnlyHint: true`) und `removeTodo`, registriert mit `document.modelContext.registerTool(tool, { signal })`. `window.webmcpController.abort()` in der DevTools-Konsole entfernt beide wieder.
- **Tool-Konsole** auf der Seite: listet `getTools()` auf und ruft `executeTool(tool, input)` mit JSON-Eingabe auf. Damit lassen sich die Tools ohne Agent und ohne Extension testen.

### Deklaratives Tool im DOM inspizieren

1. Rechtsklick auf das Eingabefeld **Todo** → **Untersuchen / Inspect**. Die DevTools öffnen sich im Tab **Elements** beim `<input>`.
2. Im DOM-Baum das umgebende `<form id="todo-form">` auswählen. Dort steht die Tooldeklaration: `toolname="addTodo"`, `tooldescription` und `toolautosubmit`. Die Attribute sind im HTML sichtbar, nicht als Text auf der Seite.
3. Das Formular aufklappen und seine Felder untersuchen: `<input name="text" required>` und `<select name="priority">` tragen jeweils `toolparamdescription`. Die `<option>`-Elemente enthalten die möglichen Prioritäten `normal` und `hoch`.

Aus diesen Formularattributen und Feldern leitet der Browser die Toolbeschreibung
und das Eingabeschema ab. Die vollständige Deklaration steht in
[`public/index.html`](public/index.html).

### Imperative Tools in der DevTools-Konsole auflisten

Zum Tab **Console** derselben Seite wechseln und ausführen:

```js
await document.modelContext.getTools()
```

Das Ergebnis enthält alle drei Tools: das deklarative `addTodo` sowie die
imperativ registrierten `listTodos` und `removeTodo`. Die Einträge aufklappen und
`name`, `description`, `inputSchema` und `annotations` untersuchen. Vergleiche das
aus dem Formular abgeleitete `inputSchema` von `addTodo` mit dem von Hand
geschriebenen Schema von `removeTodo`.

Chrome liefert `inputSchema` als JSON-String. Zum Aufklappen als Objekt:

```js
JSON.parse((await document.modelContext.getTools())
  .find((tool) => tool.name === 'removeTodo').inputSchema)
```

Die imperative Deklaration steht in [`public/tools.js`](public/tools.js) bei den
`document.modelContext.registerTool(...)`-Aufrufen; im DOM sieht man die Todo-Liste,
aber keine Toolattribute für `listTodos` und `removeTodo`.

### Todos über die DevTools-Konsole hinzufügen und entfernen

Die folgenden Snippets im Tab **Console** der Demo ausführen. Jedes holt sich das
passende Toolobjekt frisch über `getTools()` und übergibt es zusammen mit den
Eingaben an `executeTool()`. **Chrome erwartet die Eingaben als JSON-String**:
`JSON.stringify(...)` serialisiert sie, auch das leere Objekt `{}`. Ein direkt
übergebenes Objekt führt zu `Failed to parse input arguments`. Die Demo liefert
das Ergebnis ebenfalls als JSON-String zurück; `JSON.parse(...)` macht es in der
Konsole als Objekt lesbar. Siehe die
[Chrome-Anleitung zu `executeTool()`](https://developer.chrome.com/docs/ai/webmcp/imperative-api#execute-tool).

**Todo hinzufügen:**

```js
JSON.parse(await document.modelContext.executeTool(
  (await document.modelContext.getTools()).find((tool) => tool.name === 'addTodo'),
  JSON.stringify({ text: 'Butter', priority: 'hoch' }),
))
```

Der Browser füllt das Formular aus und sendet es dank `toolautosubmit` ab. Das neue
Todo erscheint sofort in der Liste; das Ergebnis enthält seine ID unter `added.id`.
Bei Agent-Aufrufen bleiben die Formularfelder ausgefüllt: `form.reset()` würde
den laufenden Tool-Aufruf abbrechen. Beim manuellen Absenden wird das Formular
weiterhin zurückgesetzt.
Während der Agent das Formular bedient, ist die Pseudo-Klasse
`form:tool-form-active` aktiv (oranger Rahmen).

**Todos mit ihren IDs auflisten:**

```js
JSON.parse(await document.modelContext.executeTool(
  (await document.modelContext.getTools()).find((tool) => tool.name === 'listTodos'),
  JSON.stringify({}),
))
```

**Todo entfernen:** Die `1` durch die gewünschte ID aus der Liste oder aus
`added.id` ersetzen.

```js
JSON.parse(await document.modelContext.executeTool(
  (await document.modelContext.getTools()).find((tool) => tool.name === 'removeTodo'),
  JSON.stringify({ id: 1 }),
))
```

Der Eintrag verschwindet sofort aus der sichtbaren Liste. Nach einem Neuladen der
Seite stehen wieder die beiden ursprünglichen Todos mit den IDs `1` und `2` bereit.

Weitere Experimente: Dieselben Aufrufe über die **Tool-Konsole** auf der Seite oder
das Side Panel der Extension **WebMCP - Model Context Tool Inspector** ausführen.
Mit `window.webmcpController.abort()` in der DevTools-Konsole die beiden
imperativen Tools abmelden und anschliessend erneut `getTools()` aufrufen: Das
deklarative `addTodo` bleibt registriert. Ein Neuladen stellt alle Tools wieder her.

**Erkenntnis:** Die Tools laufen vollständig im Browser-Tab. Es gibt keinen Server, keinen Transport und keinen Modell-Aufruf in der Seite. Das Modell bringt der Agent mit.

## Was nicht zu sehen ist

- Kein Agent: Ohne Extension oder eingebauten Browser-Agenten ruft niemand die Tools auf, ausser die Tool-Konsole der Seite selbst.
- Keine Feature-Detection und kein `navigator.modelContext`: Das Skript ruft `document.modelContext` direkt auf. In einem Browser ohne WebMCP endet es mit einem Fehler in der Konsole, das ist beabsichtigt (siehe [Theorieunterlagen](../../00-course-material/teil-3-theorie--webmcp.md)).
- Kein Origin-Trial-Token und kein produktiver Browser-Fallback: Die Demo setzt den vorbereiteten Chromium-Browser voraus.

## Struktur

```
server.mjs                 statischer HTTP-Server (Port 3050)
public/index.html          Formular-Tool, Todo-Liste, Tool-Konsole
public/tools.js            Registrierung der Tools (deklarativ + imperativ)
public/tool-console.js     getTools() / executeTool() auf der Seite
```
