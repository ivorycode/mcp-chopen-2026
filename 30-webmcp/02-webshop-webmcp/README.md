# Webshop mit WebMCP (Starter)

Eigenständig installierbare Workshop-Stufe auf der aktuellen Shop-Grundlage der Abschlusslösung. Web-UI, Web-API, Kontoauswahl, Suche, Warenkorb und Bestellhistorie verwenden denselben Prozessspeicher.

```bash
npm ci
cp .env.example .env
npm run dev
```

Öffne http://localhost:3051. Starte den Katalog separat in `../../01-mock-api` auf Port 4040. Provider und Key aus der lokalen `.env` werden nur für echte Chat-Anfragen benötigt. Gültige Demo-Konten: `restaurant-baeren`, `hotel-alpenblick`, `kantine-campus`.

## Chat und Struktur

- **Assistant** im Shop: Text-Chat, Tool-Aufrufe steuern die sichtbare Oberfläche; Modell-Checkout mit Ja/Nein-Freigabe.
- **Workspace** unter `/chat`: Produkte, Warenkorb und Bestellungen als Widgets. Produkt- und Bestellbuttons verwenden direkt die Web-API und dokumentieren die Aktion im Verlauf. Ein vom Modell angeforderter Checkout verwendet eine Freigabe-UI.
- `src/lib/shop.server.ts`, `shop-state.ts`, `tools/handlers.server.ts`: gemeinsame accountgebundene Domain und Tools.
- `src/components/shop`: Shop-Komponenten; `src/features/chat`: Vercel AI SDK mit typisierten Tool-Parts und `toolApproval`.

## Übung

Die Browser-Toolliste ist leer; Registrierung und Cleanup sind TODOs. Die gesamte vorherige MCP-App-Stufe funktioniert. Die Pfade sind relativ zu `src/`. Details und Schrittprüfungen: [EXERCISE.md](EXERCISE.md). Die oben beschriebenen Ziel-Funktionen sind im Starter nur soweit implementiert, wie die Übung es vorsieht.

## MCP

`/mcp` und `npm run start:stdio` verwenden `src/features/mcp/server.ts`. `npm run inspector` nutzt die lokale `inspector.json`. Externe Agenten nennen das Konto als `loginId`. HTTP teilt den Zustand mit dem Browser; stdio läuft in einem eigenen Prozess mit eigenem Zustand. Der öffentliche Guard ist lokal standardmässig deaktiviert.

## MCP Apps

Search- und Cart-App liegen unter `src/features/mcp-apps`. `npm run build:apps` baut die zwei HTML-Resources. Metadaten und CSP stehen in `resource-meta.ts`, die Registrierung in `register-ui-resources.ts`.

Für den lokalen Testhost zuerst den Katalog und `npm run dev` starten, dann in einem weiteren Terminal `npm run dev:mcp-host`. Öffne http://127.0.0.1:43552; der Host verbindet sich mit http://localhost:3051/mcp und nutzt Sandbox-Port 43553. Nach App-Änderungen neu bauen und die Host-App neu laden. Vor Browser-Tests den manuellen Host beenden. Das App-Starter-Gerüst kann erst nach den entsprechenden Übungsschritten Resources liefern.

## WebMCP

Native Browser-Tools werden in `src/features/webmcp` ergänzt. Für die manuelle Abnahme Chrome mit `chrome://flags/#enable-webmcp-testing` und Inspector-Extension verwenden. Kein Origin-Trial. Ohne API bleibt der klassische Shop bedienbar.

Der Chat-Guard übergibt standardmässig höchstens die letzten 15 Nachrichten an das Modell (`CHAT_MAX_MESSAGES`). Führende Nachrichten vor der ersten Nutzernachricht im Ausschnitt werden zusätzlich entfernt; ohne Nutzernachricht wird die Anfrage mit HTTP 400 abgewiesen. Der sichtbare Chat-Verlauf bleibt erhalten.

## Prüfen

```bash
npm test
npm run typecheck
npm run build
npm run test:browser
```

Die Node-Tests prüfen Shop-Regeln, Katalog und Events; MCP-Stufen zusätzlich HTTP und stdio mit einem echten SDK-Client. Browser-Tests verwenden einen isolierten Mock-Katalog und deterministische Chat-Streams, ohne kostenpflichtige Modellaufrufe. Echte Provider, externe Hosts und native WebMCP-Registrierung werden separat manuell geprüft. Browser-Testports: 43554 (Shop), 43555 (Katalog), bei MCP Apps zusätzlich 43552/43553 (Host/Sandbox).

`npm run test:exercise` prüft die fertig ausgefüllte Übung und ist vor dem Ausfüllen absichtlich rot. Die normale Testsuite prüft das Starter-Gerüst; Details zum Abschluss stehen in `EXERCISE.md`.

`npm run test:e2e:mcp-apps` prüft die fertigen MCP Apps im lokalen Host (beim App-Starter erst nach dem Ausfüllen).
