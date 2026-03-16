# Movie Recommender — Score Breakdown — Design Spec

## Visão Geral

Tornar o app educativo ao mostrar como cada recomendação foi calculada. Ao clicar em um card, o usuário vê a fórmula visual com as 3 componentes do score: similaridade semântica, nota IMDB e boost de gênero.

**Stack:** Node.js 22+ (backend), React 19 + Tailwind CSS v4 (frontend)

**Princípio:** mudança mínima — só `scoring.js`, `json.js` e `MovieCard.jsx` são tocados.

---

## Arquitetura

```
src/scoring.js          ← combinedScore retorna objeto em vez de número
src/vectorStore/json.js ← inclui score_breakdown no resultado
client/src/components/MovieCard.jsx ← toggle expand + fórmula visual
tests/vectorStore/json.test.js      ← atualizar para score_breakdown
```

**Fluxo:**
```
usuário clica no card
→ MovieCard toggle expanded = true
→ seção "Como chegamos aqui" aparece
→ mostra barra segmentada + 3 colunas com valores parciais
```

---

## Backend

### `src/scoring.js` — `combinedScore()`

Antes: retornava `number`

Depois: retorna objeto:

```javascript
export function combinedScore(similarity, rating, genres, query) {
  const ratingScore = (rating || 0) / 10
  const genreBoost = (genres || '').toLowerCase().split(',')
    .some(g => query.toLowerCase().includes(g.trim())) ? 1 : 0

  return {
    total: (similarity * 0.6) + (ratingScore * 0.3) + (genreBoost * 0.1),
    similarity,
    ratingScore,
    genreBoost,
  }
}
```

### `src/vectorStore/json.js` — `similaritySearch()`

Atualizar o `.map()` para usar `score.total` e incluir `score_breakdown`:

```javascript
const s = combinedScore(
  cosineSimilarity(queryEmbedding, movie.embedding),
  movie.rating,
  movie.genres,
  query
)
return {
  id: movie.id,
  title: movie.title,
  overview: movie.overview,
  rating: movie.rating,
  genres: movie.genres,
  poster_link: movie.poster_link || '',
  score: s.total,
  score_breakdown: {
    similarity: s.similarity,
    ratingScore: s.ratingScore,
    genreBoost: s.genreBoost,
  },
}
```

O `.sort()` passa a usar `b.score - a.score` (sem mudança de comportamento).

### `src/vectorStore/neo4j.js`

Sem mudanças. O campo `score_breakdown` simplesmente não estará presente na resposta Neo4j — o frontend trata isso com graceful degradation.

---

## API

### `GET /api/recommend?q=<query>`

**Resposta 200 (modo JSON):**
```json
[
  {
    "id": 42,
    "title": "Interstellar",
    "overview": "...",
    "poster_link": "https://...",
    "rating": 8.6,
    "genres": "Sci-Fi, Adventure",
    "score": 0.94,
    "score_breakdown": {
      "similarity": 0.78,
      "ratingScore": 0.86,
      "genreBoost": 1
    }
  }
]
```

**Resposta 200 (modo Neo4j):** igual, sem o campo `score_breakdown`.

---

## Frontend

### `MovieCard.jsx`

**Novo estado:** `const [expanded, setExpanded] = useState(false)`

**Toggle:** `onClick` no card raiz faz `setExpanded(prev => !prev)`. O `cursor-default` vira `cursor-pointer` apenas quando `score_breakdown` existe.

**Seção de breakdown** — renderizada condicionalmente quando `expanded && movie.score_breakdown`:

```
┌─────────────────────────────────────┐
│ Como chegamos aqui                  │  ← label dourado uppercase
├──────────────────────────────────────┤
│ [████████████████░░░░░░░░░░░░░░░░░] │  ← barra segmentada
│  (amarelo 60%)  (âmbar 30%) (verde 10%)
├──────────────────────────────────────┤
│  🧠 Tema    +   ⭐ Rating  +  🎭 Gênero │
│  0.47×0.6      0.26×0.3     0.10×0.1  │
│             = 0.94                   │  ← total
└─────────────────────────────────────┘
```

**Barra segmentada:** 3 divs com `flex` proporcionais aos pesos fixos (6 : 3 : 1), cores:
- Similaridade: `#e5c100` (dourado)
- Rating: `#f0a500` (âmbar)
- Gênero combinou: `#4ade80` (verde) / não combinou: `#2a2a2a` (cinza escuro)

**Valores das colunas:**
- Similaridade: `(similarity * 0.6).toFixed(2)`
- Rating: `(ratingScore * 0.3).toFixed(2)`
- Gênero: `(genreBoost * 0.1).toFixed(2)` — verde se `genreBoost === 1`, cinza se `0`

**Graceful degradation:** se `score_breakdown` for `null`/`undefined`, o card funciona normalmente sem a seção de detalhamento — sem erro, sem elemento vazio.

---

## Testes

### `tests/vectorStore/json.test.js`

Atualizar o teste `'similaritySearch resultado contém os campos esperados'` para também verificar `score_breakdown`:

```javascript
assert.ok('score_breakdown' in results[0], 'deve ter score_breakdown')
assert.ok('similarity' in results[0].score_breakdown, 'deve ter similarity')
assert.ok('ratingScore' in results[0].score_breakdown, 'deve ter ratingScore')
assert.ok('genreBoost' in results[0].score_breakdown, 'deve ter genreBoost')
```

> O teste de `combinedScore` existente (se houver) precisa ser atualizado para esperar um objeto em vez de número.

### Testes de `scoring.js`

Se existirem testes para `combinedScore`, atualizar para esperar objeto `{ total, similarity, ratingScore, genreBoost }`.

---

## Sem Novos Arquivos

Nenhum arquivo novo é criado. Apenas modificações em:
- `src/scoring.js`
- `src/vectorStore/json.js`
- `client/src/components/MovieCard.jsx`
- `tests/vectorStore/json.test.js`
- (se existir) arquivo de teste de `scoring.js`
