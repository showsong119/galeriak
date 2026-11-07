# Instrucciones para la curaduría diaria (tarea programada de Claude)

Objetivo: dejar cada día de 3 a 6 candidatos de ofertas de K-Beauty de **Amazon México** en
`deals/inbox/AAAA-MM-DD.json`, hacer commit y push a `main`. El workflow `deals` los valida y
los publica solo (publicación automática con revisión posterior del dueño en `#admin`).

## Pasos
1. Lee `deals/last-run.json` para ver qué se publicó y qué se rechazó ayer. No repitas ASIN de los últimos 7 días
   (revisa también `deals/processed/`).
2. Busca productos coreanos en Amazon México con WebSearch (`allowed_domains: ["amazon.com.mx"]`), por marca
   (COSRX, Beauty of Joseon, ANUA, Round Lab, SKIN1004, Torriden, Medicube, Laneige, Some By Mi, Isntree, Klairs,
   Missha, TONYMOLY, Numbuzin, Mixsoon) y por temporada (rebajas de Olive Young, Buen Fin, Navidad, Hot Sale).
   Usa también noticias de ofertas en México que mencionen precios de Amazon.
3. Toma el ASIN de la URL (`/dp/ASIN`). Solo productos vendidos en amazon.com.mx.
4. **Precio**: incluye `price` / `list_price` solo si una fuente que abriste en el momento lo muestra (y anótala en
   `source`). Si no puedes confirmarlo, deja el precio fuera: el bot publica "Revisa el precio actual".
   Nunca inventes precios ni descuentos. Cuando haya llaves de PA-API el bot verifica todo solo.
5. Escribe la nota en español de México, 1–2 frases, útil y honesta (para qué tipo de piel, tamaño). Sin
   afirmaciones médicas, sin "lo usa tal idol" sin fuente, sin emojis.
6. Formato:
```json
{"deals":[
  {"asin":"B00PBX3L7K","title":"COSRX Advanced Snail 96 Mucin Power Essence 100 ml",
   "price":289,"list_price":399,"note":"Esencia hidratante con mucina de caracol, buena para piel deshidratada.",
   "source":"https://…"}
]}
```
7. `git add deals/inbox && git commit -m "curaduría: ofertas AAAA-MM-DD" && git push`.
8. Además escribe `drafts/sns/AAAA-MM-DD.md` con: un guion de TikTok de 15–20 s y un texto para Instagram sobre las
   ofertas del día (español de México), para que el dueño los revise. No publiques nada en redes.

## Reglas
- Nada de réplicas, nada de productos sin relación con K-Beauty.
- Máximo 6 candidatos por día. Mejor 3 buenos que 6 dudosos.
- Si no encuentras nada confiable, no subas archivo y dilo en el resumen.
