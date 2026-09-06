# Übung · WebMCP ergänzen

## Ziel

Ergänze die kumulative MCP-App-Stufe um native Browser-Tools für das aktuell ausgewählte Konto.

## Pflichtschritte mit direkter Prüfung

1. Registriere `searchProducts`. **Prüfung:** `getTools()` listet es.
2. Ergänze Cart-Tools über die Browser-Session. **Prüfung:** Extension und Hauptoberfläche zeigen denselben Cart.
3. Ergänze Checkout ohne `loginId`-Argument. **Prüfung:** Orders aktualisieren ohne Reload.
4. Sende Shop-Events. **Prüfung:** Suche und Cart ziehen sofort nach.
5. Räume per `AbortController` auf. **Prüfung:** keine doppelten Registrierungen nach Remount.
6. Führe Tests/Build und den manuellen Smoke im vorbereiteten Browser mit Flag und Inspector-Extension durch; kein Origin-Trial.

Die Musterlösung enthält alle fünf imperativen Tools. Der deklarative Ansatz wird separat in `01-hello-webmcp` demonstriert.
