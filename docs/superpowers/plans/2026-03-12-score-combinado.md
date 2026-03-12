# Score Combinado — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melhorar o ranking de recomendações combinando similaridade semântica (60%), nota IMDB (30%) e boost de gênero (10%) em um score final único.

**Architecture:** Nova função pura `combinedScore` em `src/scoring.js` substitui o uso direto de `cosineSimilarity` em `recommend.js`. O `ingest.js` passa a persistir `rating` e `genres` no `vector-store.json`. O `vector-store.json` deve ser regenerado após a mudança.

**Tech Stack:** Node.js 22+, ESM, `node:test` (built-in test runner)

---

## Chunk 1: scoring.js + ingest.js

### Task 1: Função `combinedScore`

**Files:**
- Create: `src/scoring.js`
- Create: `tests/scoring.test.js`

- [ ] **Step 1: Escrever os testes**

`tests/scoring.test.js`:
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { combinedScore } from '../src/scoring.js'

test('combina similarity, rating e genre boost corretamente', () => {
  // 0.9*0.6 + (9.0/10)*0.3 + 1*0.1 = 0.54 + 0.27 + 0.10 = 0.91
  const score = combinedScore(0.9, 9.0, 'Action', 'action movie')
  assert.ok(Math.abs(score - 0.91) < 1e-10)
})

test('aplica genre boost quando query contém gênero do filme', () => {
  const comBoost    = combinedScore(0.5, 8.0, 'Comedy, Romance', 'romantic comedy')
  const semBoost    = combinedScore(0.5, 8.0, 'Drama', 'romantic comedy')
  assert.ok(comBoost > semBoost)
})

test('não aplica genre boost quando query não contém gênero', () => {
  // 0.5*0.6 + (8.0/10)*0.3 + 0*0.1 = 0.30 + 0.24 + 0.00 = 0.54
  const score = combinedScore(0.5, 8.0, 'Drama', 'space exploration')
  assert.ok(Math.abs(score - 0.54) < 1e-10)
})

test('rating nulo não causa erro e vale 0', () => {
  assert.doesNotThrow(() => combinedScore(0.5, null, 'Drama', 'drama'))
  const score = combinedScore(0.5, null, 'Drama', 'drama')
  assert.ok(score >= 0)
})

test('genres vazio não causa erro', () => {
  assert.doesNotThrow(() => combinedScore(0.5, 8.0, '', 'drama'))
})

test('score máximo possível é 1.0', () => {
  const score = combinedScore(1.0, 10.0, 'Action', 'action')
  assert.ok(Math.abs(score - 1.0) < 1e-10)
})
```

- [ ] **Step 2: Rodar e verificar que falha**

```bash
node --test tests/scoring.test.js
```

Expected: `Cannot find module '../src/scoring.js'`

- [ ] **Step 3: Implementar `src/scoring.js`**

```javascript
/**
 * Score combinado: similaridade semântica + nota IMDB + boost de gênero.
 * Fórmula: (similarity × 0.6) + (rating/10 × 0.3) + (genreBoost × 0.1)
 *
 * Recebe similarity já calculada externamente (via cosineSimilarity) — sem dependências.
 *
 * @param {number} similarity - Cosine similarity entre query e sinopse (0 a 1)
 * @param {number} rating     - Nota IMDB (ex: 8.6). Null/undefined tratado como 0.
 * @param {string} genres     - Gêneros do filme separados por vírgula (ex: "Action, Drama")
 * @param {string} query      - Texto da busca do usuário
 * @returns {number} Score entre 0 e 1
 */
export function combinedScore(similarity, rating, genres, query) {
  const ratingScore = (rating || 0) / 10
  const genreBoost = (genres || '').toLowerCase().split(',')
    .some(g => query.toLowerCase().includes(g.trim())) ? 1 : 0

  return (similarity * 0.6) + (ratingScore * 0.3) + (genreBoost * 0.1)
}
```

- [ ] **Step 4: Rodar e verificar que passa**

```bash
node --test tests/scoring.test.js
```

Expected:
```
✔ combina similarity, rating e genre boost corretamente
✔ aplica genre boost quando query contém gênero do filme
✔ não aplica genre boost quando query não contém gênero
✔ rating nulo não causa erro e vale 0
✔ genres vazio não causa erro
✔ score máximo possível é 1.0
ℹ tests 6
ℹ pass 6
```

- [ ] **Step 5: Commit**

```bash
git add src/scoring.js tests/scoring.test.js
git commit -m "feat: add combined score (similarity + rating + genre boost)"
```

---

### Task 2: Atualizar `ingest.js` para persistir `rating` e `genres`

**Files:**
- Modify: `scripts/ingest.js` — função `normalizeMovie`
- Modify: `tests/ingest.test.js` — teste de `normalizeMovie`

- [ ] **Step 1: Atualizar o teste de `normalizeMovie`**

Em `tests/ingest.test.js`, substituir o teste existente de `normalizeMovie`:

```javascript
test('normalizeMovie mapeia colunas do IMDB para formato interno', () => {
  const row = {
    Series_Title: 'Interstellar',
    Overview: 'A team travels through space',
    IMDB_Rating: '8.6',
    Genre: 'Adventure, Drama, Sci-Fi',
  }

  const movie = normalizeMovie(row, 0)

  assert.equal(movie.id, 1)
  assert.equal(movie.title, 'Interstellar')
  assert.equal(movie.overview, 'A team travels through space')
  assert.equal(movie.rating, 8.6)
  assert.equal(movie.genres, 'Adventure, Drama, Sci-Fi')
})
```

- [ ] **Step 2: Rodar e verificar que falha**

```bash
node --test tests/ingest.test.js
```

Expected: `AssertionError` — `movie.rating` é `undefined`

- [ ] **Step 3: Atualizar `normalizeMovie` em `scripts/ingest.js`**

Substituir a função `normalizeMovie` por:

```javascript
export function normalizeMovie(row, index) {
  return {
    id: index + 1,
    title: row.Series_Title,
    overview: row.Overview,
    rating: parseFloat(row.IMDB_Rating) || 0,
    genres: row.Genre || '',
  }
}
```

- [ ] **Step 4: Rodar e verificar que passa**

```bash
node --test tests/ingest.test.js
```

Expected:
```
✔ parseCSV lê colunas do IMDB corretamente
✔ normalizeMovie mapeia colunas do IMDB para formato interno
✔ filterMovies mantém filmes com overview
✔ filterMovies retorna todos quando todos têm overview
ℹ tests 4
ℹ pass 4
```

- [ ] **Step 5: Commit**

```bash
git add scripts/ingest.js tests/ingest.test.js
git commit -m "feat: persist rating and genres in vector store"
```

---

## Chunk 2: recommend.js + verificação

### Task 3: Atualizar `recommend.js` para usar `combinedScore`

**Files:**
- Modify: `scripts/recommend.js`
- Modify: `tests/recommend.test.js`

- [ ] **Step 1: Atualizar os testes de `recommend.js`**

Substituir todo o conteúdo de `tests/recommend.test.js`:

```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findSimilar } from '../scripts/recommend.js'

test('retorna top K filmes ordenados por score combinado', async (t) => {
  const store = [
    { id: 1, title: 'Sci-Fi A', overview: 'Space exploration', rating: 9.0, genres: 'Sci-Fi', embedding: [1, 0, 0] },
    { id: 2, title: 'Sci-Fi B', overview: 'Wormhole travel',  rating: 7.0, genres: 'Sci-Fi', embedding: [0.9, 0.1, 0] },
    { id: 3, title: 'Romance',  overview: 'Love story',       rating: 8.0, genres: 'Romance', embedding: [0, 0, 1] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  const results = await findSimilar([1, 0, 0], 'sci-fi', 2, tmpFile)

  assert.equal(results.length, 2)
  assert.equal(results[0].title, 'Sci-Fi A')
  assert.equal(results[1].title, 'Sci-Fi B')
  assert.ok(results[0].score > results[1].score, 'primeiro resultado deve ter score maior')
})

test('resultado contém id, title, overview, rating, genres e score', async (t) => {
  const store = [
    { id: 42, title: 'Test Movie', overview: 'Test overview', rating: 8.0, genres: 'Drama', embedding: [1, 0] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  const results = await findSimilar([1, 0], 'drama', 1, tmpFile)

  assert.ok('id' in results[0])
  assert.ok('title' in results[0])
  assert.ok('overview' in results[0])
  assert.ok('rating' in results[0])
  assert.ok('genres' in results[0])
  assert.ok('score' in results[0])
})

test('genre boost eleva filme do gênero correto no ranking', async (t) => {
  const store = [
    { id: 1, title: 'Action A', overview: 'Explosions',   rating: 7.0, genres: 'Action', embedding: [0.8, 0.2, 0] },
    { id: 2, title: 'Drama B',  overview: 'Emotional',    rating: 9.0, genres: 'Drama',  embedding: [0.7, 0.3, 0] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  // Query contém "action" — deve boostar Action A
  const results = await findSimilar([1, 0, 0], 'action movie', 2, tmpFile)

  assert.equal(results[0].title, 'Action A', 'Action A deve ser o primeiro com genre boost')
})
```

- [ ] **Step 2: Rodar e verificar que falha**

```bash
node --test tests/recommend.test.js
```

Expected: testes falham porque `findSimilar` ainda não aceita o parâmetro `query`

- [ ] **Step 3: Atualizar `scripts/recommend.js`**

Substituir o conteúdo completo de `scripts/recommend.js`:

```javascript
import { readFile } from 'node:fs/promises'
import { embed } from '../src/embeddings.js'
import { cosineSimilarity } from '../src/similarity.js'
import { combinedScore } from '../src/scoring.js'

const DEFAULT_STORE = new URL('../data/vector-store.json', import.meta.url).pathname

/**
 * Busca os K filmes mais similares usando score combinado:
 * similaridade semântica (60%) + nota IMDB (30%) + boost de gênero (10%).
 * Separado do embed() para permitir testes sem carregar o modelo HuggingFace.
 *
 * @param {number[]} queryEmbedding - Embedding da query gerado por embed()
 * @param {string}   query          - Texto original da query (para detecção de gênero)
 * @param {number}   topK           - Número de resultados
 * @param {string}   storePath      - Caminho para o vector-store.json
 */
export async function findSimilar(queryEmbedding, query, topK = 5, storePath = DEFAULT_STORE) {
  const movies = JSON.parse(await readFile(storePath, 'utf-8'))

  return movies
    .map((movie) => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      rating: movie.rating,
      genres: movie.genres,
      score: combinedScore(
        cosineSimilarity(queryEmbedding, movie.embedding),
        movie.rating,
        movie.genres,
        query
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

// Só executa quando chamado diretamente (não em testes)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const query = process.argv[2]
  if (!query) {
    console.error('Uso: node scripts/recommend.js "Título do Filme"')
    process.exit(1)
  }
  console.log(`\n🔍 Buscando filmes similares a "${query}"...\n`)
  const queryEmbedding = await embed(query)
  const results = await findSimilar(queryEmbedding, query)

  results.forEach((movie, i) => {
    const preview = movie.overview.slice(0, 50) + '...'
    console.log(
      `${i + 1}. ${movie.title.padEnd(28)} (score: ${movie.score.toFixed(2)}) ⭐ ${movie.rating.toFixed(1)} | ${movie.genres} — ${preview}`
    )
  })
}
```

- [ ] **Step 4: Rodar e verificar que passa**

```bash
node --test tests/recommend.test.js
```

Expected:
```
✔ retorna top K filmes ordenados por score combinado
✔ resultado contém id, title, overview, rating, genres e score
✔ genre boost eleva filme do gênero correto no ranking
ℹ tests 3
ℹ pass 3
```

- [ ] **Step 5: Rodar todos os testes**

```bash
npm test
```

Expected: todos os testes passando (6 scoring + 4 ingest + 3 recommend + 5 similarity = 18 testes)

- [ ] **Step 6: Commit**

```bash
git add scripts/recommend.js tests/recommend.test.js
git commit -m "feat: use combined score in recommendations"
```

---

### Task 4: Regenerar `vector-store.json` e verificar

- [ ] **Step 1: Rodar o ingest novamente**

O `vector-store.json` atual não tem `rating` nem `genres` — precisa ser regenerado.

```bash
npm run ingest
```

Expected (5-15 minutos):
```
📖 Lendo CSV...
📊 1000 filmes para indexar, 0 ignorados
⚙ Gerando embeddings: 1000/1000
✅ 1000 filmes indexados
💾 Salvo em data/vector-store.json
```

- [ ] **Step 2: Verificar que o arquivo tem os novos campos**

```bash
node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  const store = JSON.parse(readFileSync('data/vector-store.json', 'utf-8'));
  console.log('Primeiro filme:', store[0].title);
  console.log('Rating:', store[0].rating);
  console.log('Genres:', store[0].genres);
"
```

Expected:
```
Primeiro filme: The Shawshank Redemption
Rating: 9.3
Genres: Drama
```

- [ ] **Step 3: Testar recomendação com score combinado**

```bash
node scripts/recommend.js "romantic comedy"
```

Expected (filmes de comédia e romance bem avaliados aparecem primeiro):
```
🔍 Buscando filmes similares a "romantic comedy"...

1. (500) Days of Summer      (score: 0.70) ⭐ 7.7 | Comedy, Drama, Romance — An offbeat romantic comedy...
2. ...
```

- [ ] **Step 4: Comparar com e sem boost de gênero**

Testar uma query que deve acionar o genre boost:
```bash
node scripts/recommend.js "action thriller"
node scripts/recommend.js "psychological horror"
```

- [ ] **Step 5: Commit final e push**

```bash
git add .
git commit -m "chore: regenerate vector store with rating and genres"
git push origin main
```
