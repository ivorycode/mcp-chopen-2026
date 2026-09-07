# Setup-Check vor dem Workshop

Führe diesen Check vor dem Workshop aus. Er prüft Node.js, npm und mit **einer kurzen echten API-Anfrage**, ob dein API-Key und das gewählte Modell funktionieren. Du brauchst genau **einen** der drei Provider, keinen laufenden Webshop. Zeitbedarf: etwa 10–15 Minuten inklusive Account-Einrichtung.

## 1. Projekt vorbereiten

Installiere Node.js inklusive npm, falls noch nicht vorhanden. Der Workshop benötigt **Node.js ab Version 22.18**. Öffne nach der Installation ein neues Terminal und prüfe:

```sh
node --version
npm --version
```

Fehlt einer der Befehle, installiere zuerst Node.js inklusive npm. Das Check-Programm kann ohne diese Voraussetzung nicht starten.

Wechsle im geklonten Workshop-Repository in dieses Verzeichnis:

```sh
cd 00-setup-check
npm ci
```

Kopiere `.env.example` nach `.env` – im Editor oder im Terminal:

```sh
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

## 2. Einen Provider auswählen

In `.env` ist Google vorbereitet. Lass **genau einen vollständigen Provider-Block aktiv**. Beim Wechsel kommentierst du alle drei Zeilen des bisherigen Blocks mit `#` aus und entfernst das `#` vor den drei Zeilen des gewünschten Blocks. Ersetze den leeren Key durch deinen echten API-Key. Speichere die Datei.

| Provider | `AI_PROVIDER` | Vorbereitetes günstiges Modell |
| --- | --- | --- |
| Google / Gemini | `google` | `gemini-3.1-flash-lite` |
| OpenAI | `openai` | `gpt-4.1-mini` |
| Anthropic / Claude | `anthropic` | `claude-haiku-4-5` |

Diese kleinen Modelle sind als kostengünstiger Einstieg für die Webshop-Übungen gewählt; dafür ist kein Frontier-Modell nötig. Die Modell-ID ist jeweils bereits eingetragen. Aktuelle Modellinformationen: [Gemini Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [Claude-Modelle und Preise](https://platform.claude.com/docs/en/about-claude/pricing).

### Option A: Google / Gemini

1. Öffne [Google AI Studio](https://aistudio.google.com/) und melde dich mit einem Google-Konto an. Falls du noch keines hast, erstelle es über [Google-Konto erstellen](https://accounts.google.com/signup).
2. Bestätige bei der ersten Nutzung die Nutzungsbedingungen.
3. Öffne [API Keys](https://aistudio.google.com/apikey) und wähle **Create API key**. Wähle ein vorhandenes Google-Cloud-Projekt oder erstelle ein neues; gegebenenfalls musst du ein vorhandenes Projekt zuerst in AI Studio importieren.
4. Kopiere den erzeugten Key und trage ihn lokal ein:

   ```dotenv
   AI_PROVIDER=google
   AI_MODEL=gemini-3.1-flash-lite
   GOOGLE_GENERATIVE_AI_API_KEY=DEIN_API_KEY
   ```

5. Je nach Modell und Konto ist ein kostenloses API-Kontingent verfügbar. Falls AI Studio für dein Projekt eine Abrechnung verlangt oder das Kontingent nicht genügt, richte über **Billing / Set up billing** ein Abrechnungskonto mit Zahlungsmethode ein.

Details: [API-Key erstellen](https://ai.google.dev/gemini-api/docs/api-key), [API-Abrechnung](https://ai.google.dev/gemini-api/docs/billing).

### Option B: OpenAI

1. Öffne die [OpenAI API Platform](https://platform.openai.com/) und erstelle ein Konto oder melde dich mit deinem bestehenden OpenAI-Konto an.
2. Schliesse die Einrichtung der Organisation bzw. des Projekts ab.
3. Öffne [Billing](https://platform.openai.com/settings/organization/billing/overview). Hinterlege bei Bedarf eine Zahlungsmethode und lade API-Guthaben auf. Wähle für den Workshop zunächst die kleinste passende Aufladung; eine automatische Nachladung ist dafür nicht nötig.
4. Öffne im gewünschten Projekt [API Keys](https://platform.openai.com/api-keys), wähle **Create new secret key** und vergib beispielsweise den Namen `Workshop`. Kopiere den Key direkt nach der Erstellung.
5. Trage diese Konfiguration in `.env` ein:

   ```dotenv
   AI_PROVIDER=openai
   AI_MODEL=gpt-4.1-mini
   OPENAI_API_KEY=DEIN_API_KEY
   ```

Der Key benötigt die Berechtigung, Modellanfragen auszuführen. Der [offizielle API-Einstieg](https://developers.openai.com/api/docs/quickstart) erklärt API-Keys und Guthaben.

### Option C: Anthropic / Claude

1. Öffne die [Claude Console](https://platform.claude.com/) und erstelle ein Konto oder melde dich an. Richte die Organisation ein, falls du dazu aufgefordert wirst.
2. Öffne in der Console **Settings → Billing**. Hinterlege eine Zahlungsmethode und kaufe bei Bedarf API-Credits. Beginne mit der kleinsten passenden Aufladung.
3. Öffne **Settings → API Keys**, wähle **Create Key**, gib beispielsweise `Workshop` als Namen an und wähle deinen Workspace. Kopiere den erzeugten Key.
4. Trage diese Konfiguration in `.env` ein:

   ```dotenv
   AI_PROVIDER=anthropic
   AI_MODEL=claude-haiku-4-5
   ANTHROPIC_API_KEY=DEIN_API_KEY
   ```

Details: [Offizieller Claude-API-Einstieg](https://platform.claude.com/docs/en/get-started).

### API-Kosten und AI-Subscriptions

**Für die direkten API-Requests dieses Checks und für die Übungen in diesem Workshop kann keine AI-Subscription verwendet werden.**

Der Check sendet nur eine kurze Anfrage, begrenzt die Ausgabe auf 128 Tokens und wiederholt fehlgeschlagene Anfragen nicht automatisch. Die reinen Verbrauchskosten sind damit normalerweise deutlich unter einem Rappen pro Check. Für die Workshop-Übungen erwarten wir bei normaler Nutzung geringe Kosten im Bereich von wenigen Rappen bis wenigen Franken. Das ist eine Schätzung: Anzahl der Anfragen, Chatverlauf, Tool-Aufrufe und Modell bestimmen den tatsächlichen Verbrauch. Eine erforderliche Mindestaufladung kann höher sein als der Workshop-Verbrauch.

Beispiel zur Grössenordnung: 100 Anfragen mit jeweils 2'000 Input- und 200 Output-Tokens kosten bei GPT-4.1 mini rund **0.112 USD**, bei Claude Haiku 4.5 rund **0.30 USD**. Das ist ein Rechenbeispiel, keine Obergrenze für den Workshop. Preisstand geprüft am 6. September 2026: [OpenAI](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing), [Google](https://ai.google.dev/gemini-api/docs/pricing).

Teile deinen Key nicht und committe `.env` nicht. Die Datei ist bereits durch `.gitignore` ausgeschlossen; der Check gibt den Key nicht aus.

## 3. Check ausführen

```sh
npm run check
```

Beispiel einer erfolgreichen Ausgabe:

```text
✓ Node.js 24.16.0
✓ npm 11.17.0
✓ Provider: google / gemini-3.1-flash-lite
✓ API-Key vorhanden (wird nicht ausgegeben)
Prüfe Modellzugriff mit einer kurzen API-Anfrage …
✓ Modell hat eine Textantwort geliefert

Dein Node.js/npm- und API-Setup ist bereit für den Workshop.

Für Teil 2 des Workshops:
Installiere Claude Desktop oder ChatGPT Desktop und melde dich dort an.
Anleitung und Download-Links stehen in README_SETUP.md im Wurzelverzeichnis.
Die Installation dieser Programme wird hier nicht automatisch geprüft.
```

Bei Fehlern zeigt der Check einen nächsten Schritt. Prüfe insbesondere den aktiven Provider-Block, den Key, Modellzugriff und API-Guthaben. Bei Netzwerkproblemen prüfe VPN/Proxy oder versuche ein anderes Netzwerk. Nach spätestens 20 Sekunden wird die API-Anfrage abgebrochen. Erfolg liefert Exit-Code `0`, ein Fehler `1`.

Der Check liest ausschliesslich die `.env` in diesem Ordner; deren Einträge haben Vorrang vor gleichnamigen Terminal-Variablen. Übertrage im Workshop den gewählten Provider-Block in die jeweilige lokale `.env` des Webshop-Projekts, damit dort dasselbe günstige Modell verwendet wird. Andere Einstellungen des Webshops bleiben dabei erhalten.
