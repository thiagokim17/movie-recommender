# Movie Recommender — Fase 1: Core CLI — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um CLI em Node.js que indexa ~5000 filmes do dataset TMDB em um arquivo JSON usando embeddings semânticos e permite buscar filmes similares pelo significado da sinopse.

**Architecture:** O `ingest.js` lê o CSV, gera embeddings de cada sinopse via HuggingFace e salva um `vector-store.json`. O `recommend.js` gera o embedding da query do usuário, calcula cosine similarity contra todos os vetores salvos e retorna os top 5. A lógica de similaridade fica isolada em `src/similarity.js` para ser testável independentemente.

**Tech Stack:** Node.js 22+, `@huggingface/transformers` (modelo `Xenova/all-MiniLM-L6-v2`), `csv-parse`, Node.js built-in test runner (`node:test`)

---

## Chunk 1: Setup + Cosine Similarity

### Task 1: Setup do Projeto

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `data/.gitkeep`

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "movie-recommender",
  "version": "1.0.0",
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "ingest": "node scripts/ingest.js",
    "recommend": "node scripts/recommend.js",
    "test": "node --test 'tests/**/*.test.js'"
  },
  "dependencies": {
    "@huggingface/transformers": "^3.4.0",
    "csv-parse": "^5.5.6"
  }
}
```

- [ ] **Step 2: Criar `.gitignore`**

```
node_modules/
data/vector-store.json
data/*.csv
.env*
!.env.example
```

- [ ] **Step 3: Criar `.env.example`**

```env
# Fase 2+
VECTOR_STORE=json
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Fase 3
TMDB_API_KEY=
```

- [ ] **Step 4: Criar pasta `data/` com `.gitkeep`**

```bash
mkdir -p data tests scripts src
touch data/.gitkeep
```

- [ ] **Step 5: Instalar dependências**

```bash
npm install
```

Expected: `node_modules/` criado, sem erros.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example data/.gitkeep
git commit -m "chore: project setup"
```

---

### Task 2: Cosine Similarity

**Files:**
- Create: `src/similarity.js`
- Create: `tests/similarity.test.js`

- [ ] **Step 1: Escrever o teste**

`tests/similarity.test.js`:
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cosineSimilarity } from '../src/similarity.js'

test('vetores idênticos têm score 1.0', () => {
  const v = [1, 0, 0]
  assert.ok(Math.abs(cosineSimilarity(v, v) - 1) < 1e-10)
})

test('vetores ortogonais têm score 0.0', () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0)
})

test('vetores opostos têm score -1.0', () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [-1, 0]) - (-1)) < 1e-10)
})

test('retorna 0 para vetor nulo', () => {
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0)
})

test('calcula corretamente para vetores arbitrários', () => {
  const a = [1, 2, 3]
  const b = [4, 5, 6]
  // dot = 32, normA = sqrt(14), normB = sqrt(77)
  const expected = 32 / (Math.sqrt(14) * Math.sqrt(77))
  assert.ok(Math.abs(cosineSimilarity(a, b) - expected) < 1e-10)
})
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

```bash
node --test tests/similarity.test.js
```

Expected: erro `Cannot find module '../src/similarity.js'`

- [ ] **Step 3: Implementar `src/similarity.js`**

```javascript
/**
 * Calcula a similaridade de cosseno entre dois vetores.
 * Retorna um valor entre -1 (opostos) e 1 (idênticos).
 */
export function cosineSimilarity(a, b) {
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

```bash
node --test tests/similarity.test.js
```

Expected:
```
✔ vetores idênticos têm score 1.0
✔ vetores ortogonais têm score 0.0
✔ vetores opostos têm score -1.0
✔ retorna 0 para vetor nulo
✔ calcula corretamente para vetores arbitrários
ℹ tests 5
ℹ pass 5
```

- [ ] **Step 5: Commit**

```bash
git add src/similarity.js tests/similarity.test.js
git commit -m "feat: add cosine similarity"
```

---

## Chunk 2: Embeddings + Ingest

### Task 3: Wrapper de Embeddings HuggingFace

**Files:**
- Create: `src/embeddings.js`

> **Nota:** Este módulo não tem teste unitário — carregar o modelo HuggingFace leva ~2 min na primeira execução (download) e exige internet. A validação é feita manualmente no Step 3.

- [ ] **Step 1: Implementar `src/embeddings.js`**

```javascript
import { pipeline } from '@huggingface/transformers'

// Instância singleton do modelo — carregado uma única vez por processo
let extractor = null

async function getExtractor() {
  if (!extractor) {
    console.log('⏳ Carregando modelo (primeira vez ~2 min)...')
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return extractor
}

/**
 * Gera um embedding semântico para o texto fornecido.
 * Retorna um array de 384 números (float32[]).
 */
export async function embed(text) {
  const model = await getExtractor()
  const output = await model(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}
```

- [ ] **Step 2: Verificar manualmente que o embedding tem 384 dimensões**

Criar arquivo temporário `scripts/test-embed.js`:
```javascript
import { embed } from '../src/embeddings.js'

const v = await embed('A spacecraft travels through a wormhole')
console.log('Dimensões:', v.length)        // esperado: 384
console.log('Tipo:', typeof v[0])          // esperado: number
console.log('Primeiros 5:', v.slice(0, 5)) // valores entre -1 e 1
```

```bash
node scripts/test-embed.js
```

Expected:
```
⏳ Carregando modelo (primeira vez ~2 min)...
Dimensões: 384
Tipo: number
Primeiros 5: [ 0.021, -0.043, 0.118, ... ]
```

- [ ] **Step 3: Remover o arquivo temporário e commitar**

```bash
rm scripts/test-embed.js
git add src/embeddings.js
git commit -m "feat: add HuggingFace embeddings wrapper"
```

---

### Task 4: Ingest — Indexação dos Filmes

**Files:**
- Create: `scripts/ingest.js`
- Create: `tests/ingest.test.js`

- [ ] **Step 1: Escrever os testes**

`tests/ingest.test.js`:
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseCSV, filterMovies } from '../scripts/ingest.js'

test('parseCSV lê colunas corretamente', async (t) => {
  const csvContent = `id,title,overview\n157336,Interstellar,A team travels through space\n550,Fight Club,An insomniac office worker`
  const tmpFile = join(tmpdir(), `test-${Date.now()}.csv`)
  await writeFile(tmpFile, csvContent)
  t.after(() => unlink(tmpFile))

  const rows = await parseCSV(tmpFile)

  assert.equal(rows.length, 2)
  assert.equal(rows[0].id, '157336')
  assert.equal(rows[0].title, 'Interstellar')
  assert.equal(rows[0].overview, 'A team travels through space')
})

test('filterMovies mantém filmes com overview', () => {
  const movies = [
    { id: '1', title: 'Movie A', overview: 'Has overview' },
    { id: '2', title: 'Movie B', overview: '' },
    { id: '3', title: 'Movie C', overview: '   ' },
  ]

  const { valid, skipped } = filterMovies(movies)

  assert.equal(valid.length, 1)
  assert.equal(skipped, 2)
  assert.equal(valid[0].title, 'Movie A')
})

test('filterMovies retorna todos quando todos têm overview', () => {
  const movies = [
    { id: '1', title: 'A', overview: 'Overview A' },
    { id: '2', title: 'B', overview: 'Overview B' },
  ]

  const { valid, skipped } = filterMovies(movies)

  assert.equal(valid.length, 2)
  assert.equal(skipped, 0)
})
```

- [ ] **Step 2: Rodar os testes e verificar que falham**

```bash
node --test tests/ingest.test.js
```

Expected: erro `Cannot find module '../scripts/ingest.js'`

- [ ] **Step 3: Implementar `scripts/ingest.js`**

```javascript
import { createReadStream } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { parse } from 'csv-parse'
import { embed } from '../src/embeddings.js'

const CSV_PATH = new URL('../data/tmdb_5000_movies.csv', import.meta.url).pathname
const OUTPUT_PATH = new URL('../data/vector-store.json', import.meta.url).pathname

export function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = []
    createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => records.push(row))
      .on('end', () => resolve(records))
      .on('error', reject)
  })
}

export function filterMovies(movies) {
  const valid = []
  let skipped = 0

  for (const movie of movies) {
    if (!movie.overview?.trim()) {
      console.warn(`⚠ Ignorando "${movie.title}" — overview vazio`)
      skipped++
    } else {
      valid.push(movie)
    }
  }

  return { valid, skipped }
}

async function main() {
  console.log('📖 Lendo CSV...')
  const rows = await parseCSV(CSV_PATH)
  const { valid, skipped } = filterMovies(rows)

  console.log(`📊 ${valid.length} filmes para indexar, ${skipped} ignorados\n`)

  const movies = []
  for (const [i, row] of valid.entries()) {
    process.stdout.write(`\r⚙ Gerando embeddings: ${i + 1}/${valid.length}`)
    const embedding = await embed(row.overview)
    movies.push({
      id: Number(row.id),
      title: row.title,
      overview: row.overview,
      embedding,
    })
  }

  console.log(`\n✅ ${movies.length} filmes indexados`)
  await writeFile(OUTPUT_PATH, JSON.stringify(movies, null, 2))
  console.log('💾 Salvo em data/vector-store.json')
}

// Só executa quando chamado diretamente (não em testes)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error)
}
```

- [ ] **Step 4: Rodar os testes e verificar que passam**

```bash
node --test tests/ingest.test.js
```

Expected:
```
✔ parseCSV lê colunas corretamente
✔ filterMovies mantém filmes com overview
✔ filterMovies retorna todos quando todos têm overview
ℹ tests 3
ℹ pass 3
```

- [ ] **Step 5: Commit**

```bash
git add scripts/ingest.js tests/ingest.test.js
git commit -m "feat: add ingest script with CSV parsing and embedding generation"
```

---

## Chunk 3: Recommend + Verificação

### Task 5: Recommend — Busca por Similaridade

**Files:**
- Create: `scripts/recommend.js`
- Create: `tests/recommend.test.js`

- [ ] **Step 1: Escrever os testes**

`tests/recommend.test.js`:
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findSimilar } from '../scripts/recommend.js'

test('retorna top K filmes ordenados por similaridade', async (t) => {
  const store = [
    { id: 1, title: 'Sci-Fi A', overview: 'Space exploration', embedding: [1, 0, 0] },
    { id: 2, title: 'Sci-Fi B', overview: 'Wormhole travel', embedding: [0.9, 0.1, 0] },
    { id: 3, title: 'Romance', overview: 'Love story', embedding: [0, 0, 1] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  // Query embedding similar a Sci-Fi (vetor próximo de [1, 0, 0])
  const results = await findSimilar([1, 0, 0], 2, tmpFile)

  assert.equal(results.length, 2)
  assert.equal(results[0].title, 'Sci-Fi A')
  assert.equal(results[1].title, 'Sci-Fi B')
  assert.ok(results[0].score > results[1].score, 'primeiro resultado deve ter score maior')
})

test('score está entre -1 e 1', async (t) => {
  const store = [
    { id: 1, title: 'Movie', overview: 'Overview', embedding: [0.5, 0.5, 0] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  const results = await findSimilar([1, 0, 0], 1, tmpFile)

  assert.ok(results[0].score >= -1 && results[0].score <= 1)
})

test('resultado contém id, title, overview e score', async (t) => {
  const store = [
    { id: 42, title: 'Test Movie', overview: 'Test overview', embedding: [1, 0] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  const results = await findSimilar([1, 0], 1, tmpFile)

  assert.ok('id' in results[0])
  assert.ok('title' in results[0])
  assert.ok('overview' in results[0])
  assert.ok('score' in results[0])
})
```

- [ ] **Step 2: Rodar os testes e verificar que falham**

```bash
node --test tests/recommend.test.js
```

Expected: erro `Cannot find module '../scripts/recommend.js'`

- [ ] **Step 3: Implementar `scripts/recommend.js`**

```javascript
import { readFile } from 'node:fs/promises'
import { embed } from '../src/embeddings.js'
import { cosineSimilarity } from '../src/similarity.js'

const DEFAULT_STORE = new URL('../data/vector-store.json', import.meta.url).pathname

/**
 * Busca os K filmes mais similares ao embedding da query.
 * Separado do embed() para permitir testes sem carregar o modelo HuggingFace.
 */
export async function findSimilar(queryEmbedding, topK = 5, storePath = DEFAULT_STORE) {
  const movies = JSON.parse(await readFile(storePath, 'utf-8'))

  return movies
    .map((movie) => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      score: cosineSimilarity(queryEmbedding, movie.embedding),
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
  const results = await findSimilar(queryEmbedding)

  results.forEach((movie, i) => {
    const preview = movie.overview.slice(0, 65) + '...'
    console.log(`${i + 1}. ${movie.title.padEnd(28)} (score: ${movie.score.toFixed(2)}) — ${preview}`)
  })
}
```

- [ ] **Step 4: Rodar os testes e verificar que passam**

```bash
node --test tests/recommend.test.js
```

Expected:
```
✔ retorna top K filmes ordenados por similaridade
✔ score está entre -1 e 1
✔ resultado contém id, title, overview e score
ℹ tests 3
ℹ pass 3
```

- [ ] **Step 5: Rodar todos os testes juntos**

```bash
npm test
```

Expected: todos os 11 testes passando (5 similarity + 3 ingest + 3 recommend)

- [ ] **Step 6: Commit**

```bash
git add scripts/recommend.js tests/recommend.test.js
git commit -m "feat: add recommend script with similarity search"
```

---

### Task 6: Verificação End-to-End

> **Pré-requisito:** Baixar o dataset do Kaggle (TMDB 5000 Movie Dataset) e salvar o arquivo `tmdb_5000_movies.csv` em `data/`.
> Link: https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata

- [ ] **Step 1: Rodar o ingest**

```bash
npm run ingest
```

Expected (pode levar 5-15 minutos na primeira execução — download do modelo + geração de embeddings):
```
⏳ Carregando modelo (primeira vez ~2 min)...
📖 Lendo CSV...
📊 4803 filmes para indexar, 3 ignorados

⚙ Gerando embeddings: 4803/4803
✅ 4803 filmes indexados
💾 Salvo em data/vector-store.json
```

- [ ] **Step 2: Verificar que o arquivo foi criado corretamente**

```bash
node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  const store = JSON.parse(readFileSync('data/vector-store.json', 'utf-8'));
  console.log('Total de filmes:', store.length);
  console.log('Primeiro filme:', store[0].title);
  console.log('Dimensões do embedding:', store[0].embedding.length);
"
```

Expected:
```
Total de filmes: 4803
Primeiro filme: Avatar
Dimensões do embedding: 384
```

- [ ] **Step 3: Testar uma recomendação**

```bash
node scripts/recommend.js "Interstellar"
```

Expected (filmes de sci-fi / espaço nos top resultados):
```
🔍 Buscando filmes similares a "Interstellar"...

1. Gravity                     (score: 0.87) — Two astronauts work together...
2. The Martian                 (score: 0.84) — An astronaut becomes stranded...
3. ...
```

- [ ] **Step 4: Testar com outros títulos para validar a qualidade**

```bash
node scripts/recommend.js "The Godfather"
node scripts/recommend.js "The Notebook"
```

Expected: filmes de drama/crime para Godfather, romances para Notebook.

- [ ] **Step 5: Rodar os testes uma última vez para confirmar que tudo está verde**

```bash
npm test
```

Expected: 11 testes passando.

- [ ] **Step 6: Commit final**

```bash
git add scripts/ src/ tests/ package.json package-lock.json
git commit -m "feat: complete phase 1 - CLI movie recommender with embeddings"
git push origin main
```
