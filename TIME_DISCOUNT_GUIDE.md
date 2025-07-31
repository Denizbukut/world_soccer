# 🎯 Einfacher Zeitbasierter Rabatt (15% für 2 Stunden)

## Übersicht
Ein einfacher 15% Rabatt für 2 Stunden, der direkt über die Datenbank gesteuert werden kann.

## 🚀 Schnellstart

### 1. Datenbank erweitern
Führen Sie in Ihrem Supabase SQL Editor aus:
```sql
-- Add time columns
ALTER TABLE public.discount_configs 
ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;

-- Add unique constraint on name column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'discount_configs_name_unique'
    ) THEN
        ALTER TABLE public.discount_configs 
        ADD CONSTRAINT discount_configs_name_unique UNIQUE (name);
    END IF;
END $$;
```

### 2. Rabatt aktivieren
```sql
-- 15% Rabatt für 2 Stunden aktivieren
INSERT INTO public.discount_configs (name, value, is_active, start_time, end_time) 
VALUES (
  'time_based_15_percent_2h',
  0.15,  -- 15% Rabatt
  true,  -- aktiv
  NOW(), -- startet jetzt
  NOW() + INTERVAL '2 hours'  -- endet in 2 Stunden
) ON CONFLICT (name) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time;
```

### 3. Rabatt deaktivieren
```sql
-- Rabatt sofort deaktivieren
UPDATE public.discount_configs 
SET is_active = false
WHERE name = 'time_based_15_percent_2h';
```

## 🎨 Features

### Automatische Funktionen
- **Live-Countdown** im Shop
- **Automatisches Ausblenden** wenn abgelaufen
- **Höchste Priorität** über andere Rabatte
- **Roter Banner** mit "🔥 LIMITED TIME OFFER!"

### Benutzer-Erfahrung
- **15% Rabatt** auf alle Tickets
- **2 Stunden** Laufzeit
- **Countdown-Timer** zeigt verbleibende Zeit
- **Toast-Nachricht** bei Käufen: "15% limited time discount applied!"

## 🔧 Datenbank-Funktionen

### Rabatt aktivieren
```sql
SELECT activate_2hour_discount();
```

### Rabatt deaktivieren
```sql
SELECT deactivate_time_discount();
```

### Aktiven Rabatt prüfen
```sql
SELECT * FROM get_active_time_discount();
```

## 📱 Shop-Anzeige

### Wenn aktiv:
- **Roter Banner** mit Countdown
- **15% Rabatt** auf alle Preise
- **Priorität** über Cheap Hustler/Clan Leader Rabatte

### Wenn inaktiv:
- **Kein Banner** sichtbar
- **Normale Preise** ohne zeitbasierten Rabatt
- **Bestehende Rabatte** funktionieren normal

## 🎯 Verwendung

### Flash Sale starten:
1. Gehen Sie zu Supabase SQL Editor
2. Führen Sie den "Rabatt aktivieren" Code aus
3. Der Rabatt ist sofort im Shop sichtbar

### Flash Sale beenden:
1. Führen Sie den "Rabatt deaktivieren" Code aus
2. Der Rabatt verschwindet sofort

## ⚡ Vorteile

- **Einfach zu steuern** - nur SQL-Befehle
- **Keine Admin-Seite nötig**
- **Sofortige Wirkung**
- **Automatisches Auslaufen**
- **Bestehende Rabatte bleiben erhalten**

## 🔮 Beispiel-Szenarien

### "Flash Sale für 2 Stunden"
```sql
-- Startet sofort, läuft 2 Stunden
SELECT activate_2hour_discount();
```

### "Wochenend-Special"
```sql
-- Freitag 18:00 - Sonntag 23:59
UPDATE public.discount_configs 
SET 
  is_active = true,
  start_time = '2024-01-19 18:00:00',
  end_time = '2024-01-21 23:59:59'
WHERE name = 'time_based_15_percent_2h';
```

### "Black Friday"
```sql
-- 24 Stunden Rabatt
UPDATE public.discount_configs 
SET 
  is_active = true,
  start_time = '2024-11-29 00:00:00',
  end_time = '2024-11-30 00:00:00'
WHERE name = 'time_based_15_percent_2h';
``` 