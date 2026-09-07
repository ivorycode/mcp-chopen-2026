# Übungen im Workshop

Die Übungen stehen hier in der Reihenfolge des Workshops. Die vollständigen Anleitungen befinden sich als `EXERCISE.md` in den jeweiligen Projektverzeichnissen. Vorbereitung und Tagesprogramm findest du in [WORKSHOP.md](WORKSHOP.md).

| Teil | Übung | Kurzbeschreibung |
|---|---|---|
| 1a · Tool Calling Basics | [Mini-Übung · Tool Calling Basics](../10-ai-in-the-app/01-tool-calling-basics/EXERCISE.md) | Ein Tool für Artikeldetails ergänzen und durch einen Provider-Wechsel die Tool-Aufrufe vergleichen. Dauer: ca. 10 Minuten. |
| 1b · Chatbot in der App | [Übung 1 · Warenkorb-Tools im Chat](../10-ai-in-the-app/02-chatbot-vercel-ai-sdk/EXERCISE.md) | Mit dem Vercel AI SDK Warenkorb-Tools implementieren, Resultate im Chat darstellen, den Shop aktualisieren und Checkout mit Freigabe ergänzen. |
| 1c · TanStack AI | [Alternative · Warenkorb-Tools mit TanStack AI](../10-ai-in-the-app/03-chatbot-tanstack-ai/EXERCISE.md) | Dieselben Chatbot-Funktionen mit TanStack AI umsetzen und die SDK-spezifische Umsetzung einschliesslich Checkout-Bestätigung vergleichen. Alternative zu Übung 1. |
| 2a · MCP Grundlagen | [Mini-Übung · Hello MCP](../20-app-in-the-ai/01-hello-mcp/EXERCISE.md) | Einen fertigen MCP-Server starten, Tools, Resource und Prompt erkunden und einen echten Tool-Aufruf aus einem KI-Host prüfen. |
| 2b · Webshop als MCP-Server | [Übung 2 · Webshop über MCP bedienen](../20-app-in-the-ai/02-webshop-mcp-server/EXERCISE.md) | Suche, Warenkorb, Checkout und Bestellungen als MCP-Tools anbinden. Kontozuordnung und Ergebnisse über HTTP, stdio und im Host prüfen. |
| 2c · MCP Apps | [Übung 3 · MCP Apps](../20-app-in-the-ai/03-webshop-mcp-app/EXERCISE.md) | Search- und Cart-App registrieren und mit den Tools verknüpfen. Das Konto aus der Konversation übernehmen und Warenkorb-Aktionen über die Host-Bridge ausführen. |
| 3 · WebMCP | [Übung 4 · WebMCP ergänzen](../30-webmcp/02-webshop-webmcp/EXERCISE.md) | Fünf Shop-Funktionen als Browser-Tools bereitstellen, die Oberfläche über Events aktualisieren und die Registrierung beim Unmount aufräumen. |

Die vier Hauptübungen bauen aufeinander auf; jeder Starter enthält die gelösten Funktionen der vorherigen Stufe. TanStack AI ist ein paralleler Zweig. Die Demos `01-hello-mcp` und `01-tool-calling-basics` sind eigenständige Projekte. `01-hello-webmcp` bleibt eine ergänzende Demo ohne eigene Übungsanleitung.
