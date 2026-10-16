# Mind Your Beauty – Prisliste SE 2026

Statisk dashboard med søgning på produktnavn, SKU og stregkode. Ingen build-trin.

- `index.html`, `styles.css`, `app.js` – siden
- `data.js` – alle produkter og priser (SEK). Ret priser her.
- `assets/` – logoer (sort til lys tilstand, hvid til mørk tilstand)

## Deploy på Vercel
Importér repoet på vercel.com → Framework preset: **Other** → Deploy. Ingen build command eller output directory.

## Lokalt
Åbn `index.html` direkte i browseren.

## Login
Hele siden ligger bag login (`middleware.js` + `login.html`). Login huskes i 30 dage, og `/logout` logger ud.
Brugernavn og kode står som standard i `middleware.js`. De kan skiftes uden kodeændring ved at sætte
miljøvariablerne `LOGIN_USER`, `LOGIN_PASSWORD` og `LOGIN_SECRET` under Settings → Environment Variables i Vercel.
Login virker kun på Vercel – åbnes `index.html` lokalt, vises siden uden login.
