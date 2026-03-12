# Score Combinado — Design Spec

## Visão Geral

Melhorar o ranking de recomendações combinando similaridade semântica com nota IMDB e boost de gênero. Um filme muito similar mas mal avaliado será penalizado; um filme do gênero certo receberá um bônus.

**Contexto:** Evolução da Fase 1 do movie-recommender. O sistema de embeddings e cosine similarity já existe — esta melhoria adiciona uma camada de reranking por cima.

---

## Fórmula

```
finalScore = (similarity × 0.6) + (rating/10 × 0.3) + (genreBoost × 0.1)
```

| Componente | Peso | Descrição |
|---|---|---|
| `similarity` | 0.6 | Cosine similarity entre query e sinopse (0 a 1) |
| `rating/10` | 0.3 | Nota IMDB normalizada (ex: 9.3 → 0.93) |
| `genreBoost` | 0.1 | 1 se algum gênero do filme aparece na query, 0 caso contrário |

**Detecção de gênero:** busca simples por substring (case-insensitive) — verifica se a query contém algum dos gêneros do filme. Ex: query `"romantic comedy"` → `query.includes("comedy")` → match com filme de gênero `"Comedy, Romance"`. Valores ausentes (genres vazio, rating nulo) resultam em boost/score zero sem erro.

---

## O que Muda

### 1. `scripts/ingest.js` — `normalizeMovie`

Passa a incluir `rating` (float) e `genres` (string) no objeto normalizado. As colunas do CSV do IMDB são `IMDB_Rating` e `Genre`.

```javascript
export function normalizeMovie(row, index) {
  return {
    id: index + 1,
    title: row.Series_Title,
    overview: row.Overview,
    rating: parseFloat(row.IMDB_Rating) || 0,  // "IMDB_Rating" → float
    genres: row.Genre || '',                    // "Genre" → string
  }
}
```

**Schema atualizado do `vector-store.json`:**
```json
{
  "id": 1,
  "title": "The Shawshank Redemption",
  "overview": "Two imprisoned men bond...",
  "rating": 9.3,
  "genres": "Drama",
  "embedding": [0.021, -0.043, ...]
}
```

O ingest precisa ser **rodado novamente** após essa mudança.

### 2. `src/scoring.js` — novo arquivo

Isola a lógica de score combinado para ser testável independentemente.

```javascript
export function combinedScore(similarity, rating, genres, query) {
  const ratingScore = (rating || 0) / 10
  const genreBoost = genres.toLowerCase().split(',')
    .some(g => query.toLowerCase().includes(g.trim())) ? 1 : 0

  return (similarity * 0.6) + (ratingScore * 0.3) + (genreBoost * 0.1)
}
```

### 3. `scripts/recommend.js` — `findSimilar`

Passa a usar `combinedScore` em vez de `cosineSimilarity` diretamente. A query é repassada para detecção de gênero.

**Assinatura atualizada** (parâmetro `query` inserido na posição 2):
```javascript
// Antes:
findSimilar(queryEmbedding, topK = 5, storePath = DEFAULT_STORE)

// Depois:
findSimilar(queryEmbedding, query, topK = 5, storePath = DEFAULT_STORE)
```

**Resultado inclui novos campos:**
```javascript
{ id, title, overview, rating, genres, score }
```

**Output do CLI atualizado:**
```
1. Interstellar              (score: 0.72) ⭐ 8.6 | Sci-Fi, Adventure — A team of explorers...
```

O formato de cada linha:
```javascript
`${i+1}. ${title.padEnd(28)} (score: ${score.toFixed(2)}) ⭐ ${rating.toFixed(1)} | ${genres} — ${overview.slice(0,50)}...`
```

---

## O que Não Muda

- `src/similarity.js` — `cosineSimilarity` continua igual, chamado internamente pelo scoring
- `src/embeddings.js` — nenhuma mudança

## Atualizações Necessárias nos Testes

**`tests/ingest.test.js`** — adicionar asserções de `rating` e `genres` no teste de `normalizeMovie`:
```javascript
assert.equal(movie.rating, 8.6)
assert.equal(movie.genres, 'Drama')
```

**`tests/recommend.test.js`** — dois ajustes:
1. Fixtures de filmes precisam incluir `rating` e `genres`:
```javascript
{ id: 1, title: 'Sci-Fi A', overview: '...', rating: 8.5, genres: 'Sci-Fi', embedding: [1, 0, 0] }
```
2. Chamadas a `findSimilar` precisam incluir o novo parâmetro `query`:
```javascript
// Antes:
findSimilar([1, 0, 0], 2, tmpFile)
// Depois:
findSimilar([1, 0, 0], 'sci-fi action', 2, tmpFile)
```

---

## Arquivos Alterados

| Arquivo | Ação |
|---|---|
| `src/scoring.js` | Criar — função `combinedScore` |
| `tests/scoring.test.js` | Criar — testes unitários do score combinado |
| `scripts/ingest.js` | Modificar — `normalizeMovie` adiciona `rating` e `genres` |
| `tests/ingest.test.js` | Modificar — teste de `normalizeMovie` verifica novos campos |
| `scripts/recommend.js` | Modificar — usa `combinedScore`, novo parâmetro `query`, novo output |
| `tests/recommend.test.js` | Modificar — atualiza assinatura e fixtures com `rating`/`genres` |

---

## Exemplo de Resultado

**Query:** `"romantic comedy"`

| Filme | Similarity | Rating | Genre Match | Score Final |
|---|---|---|---|---|
| (500) Days of Summer | 0.62 | 7.7 | ✅ Comedy | 0.70 |
| The Notebook | 0.48 | 7.8 | ❌ | 0.52 |
| Parasite | 0.30 | 8.6 | ❌ | 0.44 |
