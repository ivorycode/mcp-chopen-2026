# Webshop mit MCP (Musterlösung)

Eigenständig installierbare Workshop-Stufe auf der aktuellen Shop-Grundlage der Abschlusslösung. Web-UI, Web-API, Kontoauswahl, Suche, Warenkorb und Bestellhistorie verwenden denselben Prozessspeicher.

```bash
npm ci
cp .env.example .env
npm run dev
```

Öffne http://localhost:3042. Starte den Katalog separat in `../../01-mock-api` auf Port 4040. Provider und Key aus der lokalen `.env` werden nur für echte Chat-Anfragen benötigt. Gültige Demo-Konten: `restaurant-baeren`, `hotel-alpenblick`, `kantine-campus`.

## Chat und Struktur

- **Assistant** im Shop: Text-Chat, Tool-Aufrufe steuern die sichtbare Oberfläche; Modell-Checkout mit Ja/Nein-Freigabe.
- **Workspace** unter `/chat`: Produkte, Warenkorb und Bestellungen als Widgets. Produkt- und Bestellbuttons verwenden direkt die Web-API und dokumentieren die Aktion im Verlauf. Ein vom Modell angeforderter Checkout verwendet eine Freigabe-UI.
- `src/lib/shop.server.ts`, `shop-state.ts`, `tools/handlers.server.ts`: gemeinsame accountgebundene Domain und Tools.
- `src/components/shop`: Shop-Komponenten; `src/features/chat`: Vercel AI SDK mit typisierten Tool-Parts und `toolApproval`.

Aufgabenstellung: [Starter](../02-webshop-mcp-server/EXERCISE.md). Alle Übungsschritte sind implementiert.

## MCP

`/mcp` und `npm run start:stdio` verwenden `src/features/mcp/server.ts`. `npm run inspector` nutzt die lokale `inspector.json`. Externe Agenten nennen das Konto als `loginId`. HTTP teilt den Zustand mit dem Browser; stdio läuft in einem eigenen Prozess mit eigenem Zustand. Der öffentliche Guard ist lokal standardmässig deaktiviert.

Der Chat-Guard übergibt standardmässig höchstens die letzten 15 Nachrichten an das Modell (`CHAT_MAX_MESSAGES`). Führende Nachrichten vor der ersten Nutzernachricht im Ausschnitt werden zusätzlich entfernt; ohne Nutzernachricht wird die Anfrage mit HTTP 400 abgewiesen. Der sichtbare Chat-Verlauf bleibt erhalten.

## Prüfen

```bash
npm test
npm run typecheck
npm run build
npm run test:browser
```

Die Node-Tests prüfen Shop-Regeln, Katalog und Events; MCP-Stufen zusätzlich HTTP und stdio mit einem echten SDK-Client. Browser-Tests verwenden einen isolierten Mock-Katalog und deterministische Chat-Streams, ohne kostenpflichtige Modellaufrufe. Echte Provider, externe Hosts und native WebMCP-Registrierung werden separat manuell geprüft. Browser-Testports: 43554 (Shop), 43555 (Katalog), bei MCP Apps zusätzlich 43552/43553 (Host/Sandbox).
