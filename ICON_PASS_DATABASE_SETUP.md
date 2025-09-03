# Icon Pass Database Setup Guide

## 🗄️ **Problem gelöst: Fehlende Datenbank-Tabelle!**

Das Problem war, dass die `icon_pass_claims` Tabelle **nicht existiert** hat! Deshalb konnte der 24-Stunden-Cooldown nicht funktionieren.

## 📋 **Benötigte Datenbank-Tabellen:**

### 1. **icon_pass_claims** (FEHLT - muss erstellt werden)
```sql
-- Diese Tabelle existiert noch nicht und muss erstellt werden!
-- Sie ist essentiell für den 24-Stunden-Cooldown
```

### 2. **icon_passes** (existiert bereits)
```sql
-- Diese Tabelle existiert bereits, aber hat unnötige Felder
-- Muss bereinigt werden
```

### 3. **users** (existiert bereits)
```sql
-- Diese Tabelle existiert bereits
-- Enthält icon_tickets Feld
```

## 🚀 **Schritte zur Behebung:**

### **Schritt 1: icon_pass_claims Tabelle erstellen**
Führe das SQL-Skript aus: `scripts/create_icon_pass_claims_table.sql`

```bash
# In deiner Datenbank (Supabase Dashboard oder psql)
# Kopiere den Inhalt von create_icon_pass_claims_table.sql und führe ihn aus
```

### **Schritt 2: icon_passes Tabelle bereinigen**
Führe das SQL-Skript aus: `scripts/update_icon_passes_table.sql`

```bash
# Entfernt unnötige Felder aus der bestehenden Tabelle
```

## 🔍 **Was passiert nach der Einrichtung:**

1. **24-Stunden-Cooldown funktioniert**: Jeder Claim wird in `icon_pass_claims` gespeichert
2. **Server-seitige Validierung**: Alle Claims werden über API-Endpoints validiert
3. **Datenbank-Constraints**: Zusätzliche Sicherheit auf Datenbank-Ebene
4. **Keine Manipulation möglich**: Client kann den Cooldown nicht umgehen

## 🧪 **Teste es nach der Einrichtung:**

1. **Gehe zu** `/debug-icon-pass`
2. **Klicke "Check Status"** - sollte `canClaim: false` zeigen wenn bereits geclaimt
3. **Klicke "Test Claim"** - sollte blockiert werden wenn Cooldown aktiv
4. **Überprüfe Console-Logs** - sollte detaillierte Informationen zeigen

## ⚠️ **Wichtig:**

- **Ohne diese Tabelle funktioniert der Cooldown NICHT**
- **Alle Claims werden ignoriert** wenn die Tabelle fehlt
- **Das ist der Grund warum du immer noch claimen kannst**

Führe die SQL-Skripte aus und teste es dann erneut!
