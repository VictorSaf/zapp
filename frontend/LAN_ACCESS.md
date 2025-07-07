# ZAEUS - Accesul din LAN

## Configurare pentru accesul din LAN

### Frontend și Backend configurate pentru LAN

✅ **Frontend**: http://192.168.10.42:5173
✅ **Backend**: http://192.168.10.42:3000

### Cum să comutezi între localhost și LAN

1. **Pentru dezvoltare locală** (localhost):
   ```bash
   cp .env.local .env
   ```

2. **Pentru acces din LAN**:
   ```bash
   cp .env.lan .env
   ```

### Fișiere de configurare

- `.env` - Configurația activă (momentan LAN)
- `.env.local` - Configurația pentru localhost  
- `.env.lan` - Configurația pentru LAN

### Testare accesibilitate

```bash
# Testează backend-ul
curl http://192.168.10.42:3000/health

# Accesează frontend-ul din orice device în LAN
http://192.168.10.42:5173
```

### Troubleshooting

1. **Nu pot accesa din LAN**: Verifică ca toate device-urile să fie în aceeași rețea
2. **Autentificarea nu funcționează**: Asigură-te că `.env` folosește IP-ul LAN
3. **WebSocket nu funcționează**: Verifică că `VITE_API_BASE_URL` este setat corect

### Securitate

Configurarea LAN permite accesul doar din rețeaua locală (192.168.x.x, 10.x.x.x, 172.16.x.x)