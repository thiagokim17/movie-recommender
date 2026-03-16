# Movie Recommender — Score Breakdown — Design Spec

## Visão Geral

Tornar o app educativo ao mostrar como cada recomendação foi calculada. Ao clicar em um card, o usuário vê a fórmula visual com as 3 componentes do score: similaridade semântica, nota IMDB e boost de gênero.

**Stack:** Node.js 22+ (backend), React 19 + Tailwind CSS v4 (frontend)

**Princípio:** mudança mínima — só `scoring.js`, `json.js`, `MovieCard.jsx` e seus testes são tocados. Nenhum arquivo novo.

---

## Arquitetura

```
src/scoring.js                       ← combinedScore retorna objeto
src/vectorStore/json.js              ← inclui score_breakdown no resultado
client/src/components/MovieCard.jsx  ← toggle expand + fórmula visual
tests/scoring.test.js                ← atualizar para esperar objeto
tests/vectorStore/json.test.js       ← atualizar para score_breakdown
```

**Fluxo:**
```
usuário clica no card
→ MovieCard toggle expanded = true
→ seção "Como chegamos aqui" aparece
→ mostra barra segmentada + 3 colunas com valores parciais da equação
```

---

## Backend

### `src/scoring.js` — `combinedScore()`

**Antes:** retornava `number`

**Depois:** retorna objeto `{ total, similarity, ratingScore, genreBoost }`:

```javascript
/**
 * Score combinado: similaridade semântica + nota IMDB + boost de gênero.
 * Fórmula: (similarity × 0.6) + (rating/10 × 0.3) + (genreBoost × 0.1)
 *
 * @param {number} similarity - Cosine similarity entre query e sinopse (0 a 1)
 * @param {number} rating     - Nota IMDB (ex: 8.6). Null/undefined tratado como 0.
 * @param {string} genres     - Gêneros do filme separados por vírgula
 * @param {string} query      - Texto da busca do usuário
 * @returns {{ total: number, similarity: number, ratingScore: number, genreBoost: number }}
 */
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

Atualizar o bloco `.map()` completo — `combinedScore` agora retorna objeto, então `score` vira `s.total` e `score_breakdown` é adicionado:

```javascript
return movies
  .map((movie) => {
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
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, topK)
```

> O `.sort()` continua usando `b.score - a.score` — `score` agora é `s.total` (número), sem quebra de comportamento.

### `src/vectorStore/neo4j.js`

Sem mudanças. O campo `score_breakdown` não virá na resposta Neo4j. O frontend trata isso com graceful degradation (seção de detalhamento simplesmente não aparece).

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

**Toggle:** `onClick` no div raiz do card. O `cursor-default` vira `cursor-pointer` apenas quando `movie.score_breakdown` existe. Cada card é independente — múltiplos cards podem estar expandidos ao mesmo tempo.

**Seção de breakdown** — renderizada condicionalmente quando `expanded && movie.score_breakdown`:

```jsx
{expanded && movie.score_breakdown && (
  <div className="border-t border-[#2a2a2a] pt-3 mt-2">
    <p className="text-[#e5c100] text-[0.6rem] uppercase tracking-widest font-bold mb-2">
      Como chegamos aqui
    </p>

    {/* Barra segmentada — proporções fixas dos pesos: 60% / 30% / 10% */}
    <div className="flex h-2 rounded overflow-hidden gap-px mb-3">
      <div className="flex-[6] bg-[#e5c100]" />   {/* similaridade — dourado */}
      <div className="flex-[3] bg-[#f0a500]" />   {/* rating — âmbar */}
      <div className={`flex-[1] ${movie.score_breakdown.genreBoost ? 'bg-[#4ade80]' : 'bg-[#2a2a2a]'}`} />  {/* gênero */}
    </div>

    {/* 3 colunas */}
    <div className="flex justify-between text-center">
      <div>
        <div className="text-[0.55rem] text-[#888] mb-1">🧠 Tema</div>
        <div className="text-[0.65rem] text-[#e5c100] font-bold">
          {(movie.score_breakdown.similarity * 0.6).toFixed(2)}
        </div>
        <div className="text-[0.5rem] text-[#555]">×0.6</div>
      </div>
      <div className="text-[#555] self-center text-sm">+</div>
      <div>
        <div className="text-[0.55rem] text-[#888] mb-1">⭐ Rating</div>
        <div className="text-[0.65rem] text-[#f0a500] font-bold">
          {(movie.score_breakdown.ratingScore * 0.3).toFixed(2)}
        </div>
        <div className="text-[0.5rem] text-[#555]">×0.3</div>
      </div>
      <div className="text-[#555] self-center text-sm">+</div>
      <div>
        <div className="text-[0.55rem] text-[#888] mb-1">🎭 Gênero</div>
        <div className={`text-[0.65rem] font-bold ${movie.score_breakdown.genreBoost ? 'text-[#4ade80]' : 'text-[#555]'}`}>
          {(movie.score_breakdown.genreBoost * 0.1).toFixed(2)}
        </div>
        <div className="text-[0.5rem] text-[#555]">×0.1</div>
      </div>
    </div>

    {/* Total */}
    <div className="text-center mt-2 pt-2 border-t border-[#2a2a2a]">
      <span className="text-[0.55rem] text-[#555]">= </span>
      <span className="text-[0.75rem] text-[#e5c100] font-bold">{(movie.score || 0).toFixed(2)}</span>
    </div>
  </div>
)}
```

**Barra segmentada:** segmentos com proporções **fixas** dos pesos (6:3:1), não calculados dinamicamente pelo valor real de cada componente. Cor do segmento de gênero: verde (`#4ade80`) se `genreBoost === 1`, cinza escuro (`#2a2a2a`) se `genreBoost === 0`.

**Graceful degradation:** se `score_breakdown` for `null` ou `undefined`, o card funciona normalmente — sem a seção de detalhamento, sem erro, sem elemento vazio.

---

## Testes

### `tests/scoring.test.js`

Todos os 6 testes existentes precisam ser atualizados para acessar `.total` em vez do valor direto:

```javascript
// Antes:
const score = combinedScore(0.9, 9.0, 'Action', 'action movie')
assert.ok(Math.abs(score - 0.91) < 1e-10)

// Depois:
const result = combinedScore(0.9, 9.0, 'Action', 'action movie')
assert.ok(Math.abs(result.total - 0.91) < 1e-10)
```

Também adicionar um teste para verificar a estrutura do objeto retornado:

```javascript
test('retorna objeto com total, similarity, ratingScore, genreBoost', () => {
  const result = combinedScore(0.9, 9.0, 'Action', 'action movie')
  assert.ok('total' in result)
  assert.ok('similarity' in result)
  assert.ok('ratingScore' in result)
  assert.ok('genreBoost' in result)
  assert.equal(result.similarity, 0.9)
  assert.equal(result.ratingScore, 0.9)
  assert.equal(result.genreBoost, 1)
})
```

### `tests/vectorStore/json.test.js`

Atualizar o teste `'similaritySearch resultado contém os campos esperados'` para verificar `score_breakdown`:

```javascript
assert.ok('score_breakdown' in results[0], 'deve ter score_breakdown')
assert.ok('similarity' in results[0].score_breakdown, 'deve ter similarity')
assert.ok('ratingScore' in results[0].score_breakdown, 'deve ter ratingScore')
assert.ok('genreBoost' in results[0].score_breakdown, 'deve ter genreBoost')
```

> Nenhum teste de componente React é adicionado nesta fase — validação é feita manualmente no browser (mesmo critério da Fase 3).
