# Weekly Contest Configuration

Diese Datei (`lib/weekly-contest-config.ts`) ist die zentrale Konfiguration für alle Weekly Contest Einstellungen.

## Verwendung

### Für neue Contests:
1. Öffne `lib/weekly-contest-config.ts`
2. Ändere die folgenden Werte:
   - `weekStart`: Das Startdatum der Contest-Woche (Format: "YYYY-MM-DD")
   - `contestEnd`: Das Enddatum des Contests (Format: "YYYY-MM-DDTHH:mm:ssZ")

### Beispiel für einen neuen Contest:
```typescript
export const WEEKLY_CONTEST_CONFIG = {
  weekStart: "2025-07-29",        // Montag der neuen Woche
  contestEnd: "2025-07-30T23:59:59Z", // Dienstag der nächsten Woche
  // ... rest der Konfiguration
}
```

## Verfügbare Funktionen

### `getContestEndTimestamp()`
Gibt den Contest-End-Timestamp in Millisekunden zurück.

### `getContestEndDate()`
Gibt das Contest-End-Datum als Date-Objekt zurück.

### `isContestActive()`
Gibt `true` zurück, wenn der Contest noch läuft, `false` wenn er beendet ist.

### `getTimeUntilContestEnd()`
Gibt die verbleibende Zeit bis zum Contest-Ende in Millisekunden zurück.

## Automatisch aktualisierte Dateien

Die folgenden Dateien verwenden jetzt automatisch die zentrale Konfiguration:

- `app/weekly-contest/page.tsx` - Contest-Seite mit Countdown
- `app/actions/weekly-contest.ts` - Server Actions für Contest-Updates
- `app/api/weekly-contest/leaderboard/route.ts` - Leaderboard API
- `app/api/weekly-contest/user/route.ts` - User Stats API
- `app/api/weekly-contest/route.ts` - Allgemeine Contest API

## Vorteile

✅ **Zentrale Verwaltung**: Nur eine Datei muss für neue Contests angepasst werden
✅ **Konsistenz**: Alle APIs und Komponenten verwenden die gleichen Zeiten
✅ **Weniger Fehler**: Keine Inkonsistenzen zwischen verschiedenen Dateien
✅ **Einfache Wartung**: Änderungen müssen nur an einer Stelle gemacht werden 