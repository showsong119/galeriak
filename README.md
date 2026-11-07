# GaleríaK

Comunidad en español para fans de K-Beauty y K-Pop en México. Sitio estático en GitHub Pages + Supabase
(base de datos e inicio de sesión con Google) + bot de ofertas de Amazon México en GitHub Actions.

| Carpeta | Qué hay |
| --- | --- |
| `site/` | El sitio (HTML/CSS/JS sin compilación) |
| `supabase/schema.sql` | Tablas, triggers y reglas de seguridad (RLS); se aplica con el workflow `db` |
| `scripts/publish-deals.mjs` | Bot de ofertas: valida, verifica con PA-API (si hay llaves) y publica |
| `deals/inbox/` | Candidatos que deja la curaduría diaria de Claude (`CURATOR.md`) |
| `.github/workflows/` | `deploy` (Pages), `deals` (diario 9:07 CDMX), `db` (esquema) |

Configuración inicial: ver `SETUP.md`. Pruebas: `npm test`.
