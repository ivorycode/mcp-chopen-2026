##  Vererbung der Workshop-Projekte

Die Projekte sind eigenständig installierbare Kopien. Vererbung bezeichnet hier den
kumulativen Funktionsumfang, keine gemeinsame Laufzeitabhängigkeit. Die letzte
Musterlösung `30-webmcp/02-webshop-webmcp-solution/` ist die Referenz für das
Gesamtverhalten und enthält die Lösungen aller vorherigen Übungen der Hauptkette.

### Hauptkette

Die Pfeile zeigen den Aufbau im Workshop. Ein Starter übernimmt die gelösten
Funktionen der vorherigen Musterlösung und enthält vorbereitete Lücken für seine
eigene Übung. Die zugehörige Musterlösung schliesst diese Lücken.

```text
10-ai-in-the-app/02-chatbot-vercel-ai-sdk/             Starter: AI-Chat ergänzen
  ↓
10-ai-in-the-app/02-chatbot-vercel-ai-sdk-solution/    Webshop + Web-API + AI-Chat
  ↓
20-app-in-the-ai/02-webshop-mcp-server/               Starter: MCP ergänzen
  ↓
20-app-in-the-ai/02-webshop-mcp-server-solution/      zusätzlich MCP-Server
  ↓
20-app-in-the-ai/03-webshop-mcp-app/                  Starter: MCP Apps ergänzen
  ↓
20-app-in-the-ai/03-webshop-mcp-app-solution/         zusätzlich Search- und Cart-App
  ↓
30-webmcp/02-webshop-webmcp/                         Starter: WebMCP ergänzen
  ↓
30-webmcp/02-webshop-webmcp-solution/                vollständige Abschlusslösung
```

Ausserhalb der Hauptkette stehen `00-setup-check/`, der gemeinsame Katalogdienst
`01-mock-api/` und die eigenständigen Demos:

- `10-ai-in-the-app/01-tool-calling-basics/` mit `01-tool-calling-basics-solution/`
- `20-app-in-the-ai/01-hello-mcp/`
- `30-webmcp/01-hello-webmcp/`

Diese Projekte werden bei Änderungen an gemeinsamen Verträgen, etwa der
Katalog-API, auf Auswirkungen geprüft; sie erben keine vollständigen Änderungen
der Webshop-Hauptkette.

### Alternativer TanStack-AI-Zweig

`10-ai-in-the-app/03-chatbot-tanstack-ai/` ist der Übungsstarter;
`10-ai-in-the-app/03-chatbot-tanstack-ai-solution/` ist die vollständige Musterlösung
und Vergleichsdemo. Dieses Paar entspricht fachlich dem Vercel-Chatbot-Paar und
steht parallel dazu; die nachfolgende MCP-Hauptkette baut auf der Vercel-Lösung auf.
Bei Änderungen an gemeinsamem Webshop- oder Chat-Verhalten prüfe und aktualisiere
auch dieses Paar. Übertrage die Funktion in die TanStack-AI-Architektur und erhalte
im Starter die in seiner `EXERCISE.md` beschriebenen Lücken. Vercel-spezifische
SDK-Implementierungen werden nicht übernommen.

### Änderungen in die Kette übertragen

Bei Änderungen an einer Musterlösung gehört die Übertragung auf alle fachlich
betroffenen Starter und Musterlösungen der Hauptkette standardmässig zum Auftrag,
sofern der Nutzer den Umfang nicht ausdrücklich einschränkt. Für Änderungen an
der Abschlusslösung arbeite rückwärts durch die Kette; bei einer früheren Stufe
berücksichtige auch alle nachfolgenden Stufen. 

1. Lies die `EXERCISE.md` und relevanten README-Abschnitte der betroffenen Stufen.
   Bestimme pro Änderung, ab welcher Stufe die Funktion eingeführt wird und welche
   Teile dort Aufgabe der Teilnehmer bleiben.
2. Übertrage gemeinsame Logik und Verhalten auf jede betroffene Kopie. Beispielsweise
   betrifft eine Warenkorbkorrektur alle Webshop-Stufen, eine MCP-Korrektur die
   MCP-Stufe und ihre Nachfolger, eine MCP-App-Korrektur die MCP-App-Stufe und ihre
   Nachfolger und eine WebMCP-Korrektur nur das letzte Übungspaar.
3. Erhalte in Startern die beabsichtigten Übungslücken, TODOs und Lernziele. Passe
   nötigenfalls Gerüst, Aufgabenstellung und Prüfungen an, ohne die zu erarbeitende
   Lösung vorwegzunehmen. Bereits in einer früheren Stufe gelöste Funktionen bleiben
   in nachfolgenden Startern vollständig implementiert.
4. Passe Änderungen an die jeweilige Architektur an. Erhalte projektspezifische
   Ports, Paketnamen, Konfiguration und Startbefehle. Deployment-Artefakte der
   Abschlusslösung bleiben dort. Übertrage gezielte Änderungen statt ganzer
   Projektverzeichnisse; lokale `.env`, Build-Ausgaben und `node_modules` gehören
   nicht zur Übertragung.
5. Führe die für die Änderung relevanten vorhandenen Checks je geändertem Projekt
   aus. Prüfe bei Startern sowohl die weiterhin funktionierenden Vorstufen als
   auch den Erhalt der Übungslücken. Aktualisiere betroffene Anleitungen und Tests.

Die Arbeit ist abgeschlossen, wenn jede Stufe der Hauptkette als aktualisiert
oder fachlich nicht betroffen eingeordnet ist. Nenne im Ergebnis die aktualisierten
Projekte, begründe ausgelassene Stufen kurz und berichte ausgeführte Checks sowie
verbleibende Prüflücken. Bestehende Unterschiede zwischen Kopien können Drift sein;
verwende die Lernziele und die Abschlusslösung, um sie von beabsichtigten
Unterschieden zu unterscheiden.
