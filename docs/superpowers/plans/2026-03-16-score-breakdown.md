# Score Breakdown Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o app educativo mostrando as 3 componentes do score ao clicar em um card (similaridade × 0.6 + rating × 0.3 + gênero × 0.1).

**Architecture:** `combinedScore` passa a retornar um objeto `{ total, similarity, ratingScore, genreBoost }`. O json vector store inclui `score_breakdown` na resposta da API. O `MovieCard` ganha toggle expand/collapse com fórmula visual.

**Tech Stack:** Node.js 22+, React 19, Tailwind CSS v4

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `src/scoring.js` | Modificar | `combinedScore` retorna objeto em vez de número |
| `tests/scoring.test.js` | Modificar | Adaptar 6 testes existentes + adicionar 1 de estrutura |
| `src/vectorStore/json.js` | Modificar | `.map()` usa `s.total` para `score` e adiciona `score_breakdown` |
| `tests/vectorStore/json.test.js` | Modificar | Asserções de `score_breakdown` nos resultados |
| `client/src/components/MovieCard.jsx` | Modificar | Toggle expand + seção de fórmula visual |

---

## Chunk 1: Backend — scoring e vector store

### Task 1: Atualizar `combinedScore` para retornar objeto

**Files:**
- Modify: `src/scoring.js`
- Modify: `tests/scoring.test.js`

- [ ] **Step 1: Verificar testes atuais**

```bash
npm test
```

Expected: 19 testes passando.

- [ ] **Step 2: Atualizar os 6 testes existentes em `tests/scoring.test.js` para usar `.total`**

Substituir o arquivo inteiro por:

```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { combinedScore } from '../src/scoring.js'

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

test('combina similarity, rating e genre boost corretamente', () => {
  // 0.9*0.6 + (9.0/10)*0.3 + 1*0.1 = 0.54 + 0.27 + 0.10 = 0.91
  const result = combinedScore(0.9, 9.0, 'Action', 'action movie')
  assert.ok(Math.abs(result.total - 0.91) < 1e-10)
})

test('aplica genre boost quando query contém gênero do filme', () => {
  const comBoost = combinedScore(0.5, 8.0, 'Comedy, Romance', 'romantic comedy')
  const semBoost = combinedScore(0.5, 8.0, 'Drama', 'romantic comedy')
  assert.ok(comBoost.total > semBoost.total)
})

test('não aplica genre boost quando query não contém gênero', () => {
  // 0.5*0.6 + (8.0/10)*0.3 + 0*0.1 = 0.30 + 0.24 + 0.00 = 0.54
  const result = combinedScore(0.5, 8.0, 'Drama', 'space exploration')
  assert.ok(Math.abs(result.total - 0.54) < 1e-10)
})

test('rating nulo não causa erro e vale 0', () => {
  assert.doesNotThrow(() => combinedScore(0.5, null, 'Drama', 'drama'))
  const result = combinedScore(0.5, null, 'Drama', 'drama')
  assert.ok(result.total >= 0)
})

test('genres vazio não causa erro', () => {
  assert.doesNotThrow(() => combinedScore(0.5, 8.0, '', 'drama'))
})

test('score máximo possível é 1.0', () => {
  const result = combinedScore(1.0, 10.0, 'Action', 'action')
  assert.ok(Math.abs(result.total - 1.0) < 1e-10)
})
```

- [ ] **Step 3: Rodar os testes de scoring e confirmar que falham**

```bash
node --test tests/scoring.test.js
```

Expected: FAIL — `result.total is not a number` ou similar (pois `combinedScore` ainda retorna número).

- [ ] **Step 4: Atualizar `src/scoring.js` para retornar objeto**

Substituir o conteúdo de `src/scoring.js`:

```javascript
/**
 * Score combinado: similaridade semântica + nota IMDB + boost de gênero.
 * Fórmula: (similarity × 0.6) + (rating/10 × 0.3) + (genreBoost × 0.1)
 *
 * @param {number} similarity - Cosine similarity entre query e sinopse (0 a 1)
 * @param {number} rating     - Nota IMDB (ex: 8.6). Null/undefined tratado como 0.
 * @param {string} genres     - Gêneros do filme separados por vírgula (ex: "Action, Drama")
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

- [ ] **Step 5: Rodar testes de scoring e confirmar que passam**

```bash
node --test tests/scoring.test.js
```

Expected: 7 testes passando.

- [ ] **Step 6: Rodar todos os testes — esperar falhas em json.test.js (ainda usa `.score` diretamente)**

```bash
npm test
```

Expected: testes de scoring passam, mas testes de `json.test.js` falham — `score` agora é um objeto, não número. Isso é esperado e será corrigido na Task 2.

- [ ] **Step 7: Commit**

```bash
git add src/scoring.js tests/scoring.test.js
git commit -m "feat: combinedScore returns object with breakdown components"
```

---

### Task 2: Atualizar `json.js` e seus testes para `score_breakdown`

**Files:**
- Modify: `src/vectorStore/json.js`
- Modify: `tests/vectorStore/json.test.js`

- [ ] **Step 1: Atualizar o `.map()` em `src/vectorStore/json.js`**

Substituir o bloco `.map()` dentro de `similaritySearch` (linhas 26-40 atuais):

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

- [ ] **Step 2: Rodar todos os testes e confirmar que passam**

```bash
npm test
```

Expected: 19 testes passando novamente.

- [ ] **Step 3: Atualizar `tests/vectorStore/json.test.js` — adicionar asserções de `score_breakdown`**

No teste `'similaritySearch resultado contém os campos esperados'`, adicionar após as asserções existentes:

```javascript
assert.ok('score_breakdown' in results[0], 'deve ter score_breakdown')
assert.ok('similarity' in results[0].score_breakdown, 'deve ter similarity')
assert.ok('ratingScore' in results[0].score_breakdown, 'deve ter ratingScore')
assert.ok('genreBoost' in results[0].score_breakdown, 'deve ter genreBoost')
```

- [ ] **Step 4: Rodar todos os testes**

```bash
npm test
```

Expected: 19 testes passando (a contagem não muda — estamos adicionando asserções a um teste existente, não um novo teste).

- [ ] **Step 5: Verificar manualmente que a API retorna `score_breakdown`**

Com o servidor rodando (`npm run server`):

```bash
curl -s "http://localhost:3001/api/recommend?q=space+adventure" | python3 -m json.tool | head -30
```

Expected: JSON com campo `score_breakdown` contendo `similarity`, `ratingScore`, `genreBoost` em cada resultado.

- [ ] **Step 6: Commit**

```bash
git add src/vectorStore/json.js tests/vectorStore/json.test.js
git commit -m "feat: include score_breakdown in json vector store results"
```

---

## Chunk 2: Frontend — MovieCard com fórmula visual

### Task 3: Adicionar expand/collapse e fórmula visual ao `MovieCard`

**Files:**
- Modify: `client/src/components/MovieCard.jsx`

- [ ] **Step 1: Ler o arquivo atual**

Ler `client/src/components/MovieCard.jsx` para entender a estrutura antes de editar.

- [ ] **Step 2: Substituir `client/src/components/MovieCard.jsx` pelo código completo**

```javascript
import { useState } from 'react'

export default function MovieCard({ movie, rank }) {
  const [imgError, setImgError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const hasBreakdown = !!movie.score_breakdown

  return (
    <div
      className={`bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[#e5c100] ${hasBreakdown ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={() => hasBreakdown && setExpanded(prev => !prev)}
    >
      {/* Poster */}
      <div className="relative">
        {!imgError && movie.poster_link ? (
          <img
            src={movie.poster_link}
            alt={movie.title}
            onError={() => setImgError(true)}
            className="w-full aspect-[2/3] object-cover block"
          />
        ) : (
          <div className="w-full aspect-[2/3] bg-gradient-to-br from-[#1a1a1a] to-[#222] flex items-center justify-center text-4xl">
            🎬
          </div>
        )}
        {/* Rank badge */}
        <div className="absolute top-2 left-2 bg-black/75 text-[#e5c100] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-[#e5c100]">
          {rank}
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="text-sm font-semibold text-[#eee] mb-1 truncate" title={movie.title}>
          {movie.title}
        </div>
        <div className="text-xs text-[#666] mb-2 truncate">{movie.genres}</div>
        <div className="flex justify-between items-center">
          <span className="text-[#e5c100] text-xs font-semibold">⭐ {(movie.rating || 0).toFixed(1)}</span>
          <span className="text-xs text-[#555] bg-[#1f1f1f] px-2 py-0.5 rounded-full">
            {(movie.score || 0).toFixed(2)}
          </span>
        </div>
        {/* Score bar */}
        <div className="mt-2 bg-[#1f1f1f] rounded h-0.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e5c100] to-[#f0ce00] rounded"
            style={{ width: `${(movie.score || 0) * 100}%` }}
          />
        </div>

        {/* Score breakdown — expandido ao clicar */}
        {expanded && movie.score_breakdown && (
          <div className="border-t border-[#2a2a2a] pt-3 mt-3">
            <p className="text-[#e5c100] text-[0.6rem] uppercase tracking-widest font-bold mb-2">
              Como chegamos aqui
            </p>

            {/* Barra segmentada — proporções fixas dos pesos: 60% / 30% / 10% */}
            <div className="flex h-2 rounded overflow-hidden gap-px mb-3">
              <div className="flex-[6] bg-[#e5c100] rounded-l" />
              <div className="flex-[3] bg-[#f0a500]" />
              <div className={`flex-[1] rounded-r ${movie.score_breakdown.genreBoost ? 'bg-[#4ade80]' : 'bg-[#2a2a2a]'}`} />
            </div>

            {/* 3 colunas: Tema + Rating + Gênero */}
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

        {/* Hint para clicar — só quando há breakdown e não está expandido */}
        {hasBreakdown && !expanded && (
          <p className="text-[0.55rem] text-[#444] text-center mt-2">toque para ver detalhes</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar que os testes unitários ainda passam**

```bash
npm test
```

Expected: 19 testes passando (os testes são de backend — não testam componentes React).

- [ ] **Step 4: Testar manualmente no browser**

Com servidor e cliente rodando (`npm run dev`):

1. Abrir `http://localhost:5173`
2. Buscar `space adventure`
3. Clicar em um card → seção "Como chegamos aqui" deve aparecer
4. Clicar novamente → seção deve fechar
5. Verificar cores: barra dourada/âmbar, coluna gênero verde se combinar, cinza se não
6. Verificar que múltiplos cards podem ficar expandidos ao mesmo tempo
7. Verificar que o hint "toque para ver detalhes" desaparece quando expandido

- [ ] **Step 5: Commit**

```bash
git add client/src/components/MovieCard.jsx
git commit -m "feat: add score breakdown expand/collapse to MovieCard"
```
