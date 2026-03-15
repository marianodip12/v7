# Handball Pro v7

## Setup local
```bash
cp .env.example .env.local   # completar con tus valores
npm install
npm run dev
```

## Variables de entorno
| Variable | Dónde encontrarla |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → General → Reference ID → `https://<ref>.supabase.co` |
| `VITE_SUPABASE_KEY` | Supabase → Settings → API Keys → **Publishable key** |

## Base de datos
Correr `supabase_schema.sql` en Supabase → SQL Editor → Run

## Deploy en Vercel
1. Push a GitHub
2. Vercel → New Project → importar repo
3. Settings → Environment Variables → agregar las 2 variables
4. Deploy
