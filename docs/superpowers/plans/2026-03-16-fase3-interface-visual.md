# Fase 3: Interface Visual — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor a recomendação de filmes como interface web React com tema Dark Cinema, incluindo pôsteres do dataset IMDB.

**Architecture:** Express serve a API em `/api/recommend`; React (Vite + Tailwind) consome a API e exibe 5 cards com pôster, título, rating e score. O vector store existente é estendido com `poster_link`.

**Tech Stack:** Node.js 22+, Express, React 19, Vite 6, Tailwind CSS v4, concurrently

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `scripts/ingest.js` | Modificar | Adicionar `poster_link` em `normalizeMovie` |
| `src/vectorStore/json.js` | Modificar | Retornar `poster_link` em `similaritySearch` |
| `src/vectorStore/neo4j.js` | Modificar | Persistir e retornar `poster_link` |
| `tests/ingest.test.js` | Modificar | Adicionar asserção de `poster_link` |
| `tests/vectorStore/json.test.js` | Modificar | Adicionar `poster_link` nos dados de teste e asserção |
| `server.js` | Criar | API Express com `GET /api/recommend` |
| `package.json` | Modificar | Adicionar scripts `server`, `client`, `dev`, `build` |
| `client/package.json` | Criar | Config do projeto React |
| `client/vite.config.js` | Criar | Vite + Tailwind + proxy para Express |
| `client/index.html` | Criar | HTML raiz do SPA |
| `client/src/main.jsx` | Criar | Ponto de entrada React |
| `client/src/index.css` | Criar | Tailwind v4 import |
| `client/src/App.jsx` | Criar | Estado global + hero layout |
| `client/src/components/SearchBar.jsx` | Criar | Input + botão de busca |
| `client/src/components/MovieGrid.jsx` | Criar | Grid de 5 cards |
| `client/src/components/MovieCard.jsx` | Criar | Card com pôster, título, rating, score |

---

## Chunk 1: poster_link no pipeline existente

### Task 1: Adicionar `poster_link` ao ingest e ao json vector store

**Files:**
- Modify: `scripts/ingest.js`
- Modify: `src/vectorStore/json.js`
- Modify: `tests/ingest.test.js`
- Modify: `tests/vectorStore/json.test.js`

- [ ] **Step 1: Verificar testes atuais antes de qualquer mudança**

```bash
npm test
```

Expected: 19 testes passando.

- [ ] **Step 2: Atualizar `normalizeMovie` em `scripts/ingest.js`**

Substituir a função `normalizeMovie` existente:

```javascript
export function normalizeMovie(row, index) {
  return {
    id: index + 1,
    title: row.Series_Title,
    overview: row.Overview,
    rating: parseFloat(row.IMDB_Rating) || 0,
    genres: row.Genre || '',
    poster_link: row.Poster_Link || '',
  }
}
```

- [ ] **Step 3: Atualizar o teste de `normalizeMovie` em `tests/ingest.test.js`**

Adicionar `Poster_Link` ao objeto `row` e adicionar asserção:

```javascript
test('normalizeMovie mapeia colunas do IMDB para formato interno', () => {
  const row = {
    Series_Title: 'Interstellar',
    Overview: 'A team travels through space',
    IMDB_Rating: '8.6',
    Genre: 'Adventure, Drama, Sci-Fi',
    Poster_Link: 'https://m.media-amazon.com/images/test.jpg',
  }

  const movie = normalizeMovie(row, 0)

  assert.equal(movie.id, 1)
  assert.equal(movie.title, 'Interstellar')
  assert.equal(movie.overview, 'A team travels through space')
  assert.equal(movie.rating, 8.6)
  assert.equal(movie.genres, 'Adventure, Drama, Sci-Fi')
  assert.equal(movie.poster_link, 'https://m.media-amazon.com/images/test.jpg')
})
```

- [ ] **Step 4: Rodar testes de ingest e verificar que passam**

```bash
node --test tests/ingest.test.js
```

Expected: 4 testes passando.

- [ ] **Step 5: Atualizar `src/vectorStore/json.js` — adicionar `poster_link` no `.map()` de `similaritySearch`**

Substituir o bloco `.map()` dentro de `similaritySearch`:

```javascript
return movies
  .map((movie) => ({
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    rating: movie.rating,
    genres: movie.genres,
    poster_link: movie.poster_link || '',
    score: combinedScore(
      cosineSimilarity(queryEmbedding, movie.embedding),
      movie.rating,
      movie.genres,
      query
    ),
  }))
  .sort((a, b) => b.score - a.score)
  .slice(0, topK)
```

- [ ] **Step 6: Atualizar `tests/vectorStore/json.test.js` — adicionar `poster_link` nos dados de teste e na asserção de campos**

No teste `'similaritySearch resultado contém os campos esperados'`, atualizar o objeto `movies` e adicionar asserção:

```javascript
test('similaritySearch resultado contém os campos esperados', async (t) => {
  const path = makeTmpPath()
  t.after(() => unlink(path).catch(() => {}))

  const movies = [
    {
      id: 42,
      title: 'Test Movie',
      overview: 'Test overview',
      rating: 8.0,
      genres: 'Drama',
      poster_link: 'https://example.com/poster.jpg',
      embedding: [1, 0],
    },
  ]
  await writeFile(path, JSON.stringify(movies))

  const store = createJsonVectorStore(path, async () => [1, 0])
  const results = await store.similaritySearch('test query', 1)

  assert.ok('id' in results[0], 'deve ter id')
  assert.ok('title' in results[0], 'deve ter title')
  assert.ok('overview' in results[0], 'deve ter overview')
  assert.ok('rating' in results[0], 'deve ter rating')
  assert.ok('genres' in results[0], 'deve ter genres')
  assert.ok('score' in results[0], 'deve ter score')
  assert.ok('poster_link' in results[0], 'deve ter poster_link')
})
```

- [ ] **Step 7: Rodar todos os testes e verificar que passam**

```bash
npm test
```

Expected: 19 testes passando (nenhum quebrado).

- [ ] **Step 8: Commit**

```bash
git add scripts/ingest.js src/vectorStore/json.js tests/ingest.test.js tests/vectorStore/json.test.js
git commit -m "feat: add poster_link to ingest pipeline and json vector store"
```

---

### Task 2: Adicionar `poster_link` ao neo4j vector store

**Files:**
- Modify: `src/vectorStore/neo4j.js`

> Esta task não tem testes unitários — neo4j.js requer infra rodando. A validação é visual via E2E na Task 7.

- [ ] **Step 1: Atualizar `save()` — adicionar `poster_link` no metadata do Document**

No objeto `metadata` dentro de `save()`, adicionar:

```javascript
metadata: {
  id: movie.id,
  title: movie.title,
  overview: movie.overview,
  rating: movie.rating || 0,
  genres: movie.genres || '',
  poster_link: movie.poster_link || '',
},
```

- [ ] **Step 2: Atualizar `config` — substituir `retrievalQuery` para incluir `poster_link`**

Substituir a propriedade `retrievalQuery` existente no objeto `config`:

```javascript
retrievalQuery: `
  RETURN node.overview AS text, score,
  { id: node.id, title: node.title, overview: node.overview,
    rating: node.rating, genres: node.genres, poster_link: node.poster_link } AS metadata
`,
```

- [ ] **Step 3: Atualizar `.map()` em `similaritySearch` — adicionar `poster_link`**

```javascript
return results.map(([doc, score]) => ({
  id: doc.metadata.id,
  title: doc.metadata.title,
  overview: doc.metadata.overview,
  rating: doc.metadata.rating,
  genres: doc.metadata.genres,
  poster_link: doc.metadata.poster_link || '',
  score,
}))
```

- [ ] **Step 4: Rodar os testes para garantir que nada quebrou**

```bash
npm test
```

Expected: 19 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/vectorStore/neo4j.js
git commit -m "feat: add poster_link to neo4j vector store"
```

---

## Chunk 2: API Express

### Task 3: Criar `server.js` e instalar dependências

**Files:**
- Create: `server.js`
- Modify: `package.json`

- [ ] **Step 1: Instalar dependências na raiz**

```bash
npm install express concurrently
```

- [ ] **Step 2: Criar `server.js`**

```javascript
import express from 'express'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { getVectorStore } from './src/vectorStore/index.js'

const app = express()
const PORT = process.env.PORT || 3001
const __dirname = dirname(fileURLToPath(import.meta.url))

// Inicializa o vector store uma única vez ao subir o servidor
const vectorStore = await getVectorStore()

// Servir o build do React em produção
app.use(express.static(join(__dirname, 'client/dist')))

app.get('/api/recommend', async (req, res) => {
  const q = req.query.q?.trim()
  if (!q) return res.status(400).json({ error: "Parâmetro 'q' é obrigatório" })
  try {
    const results = await vectorStore.similaritySearch(q)
    res.json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro interno ao buscar recomendações' })
  }
})

// Fallback SPA — só funciona após npm run build
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'client/dist/index.html'))
})

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
```

- [ ] **Step 3: Adicionar scripts ao `package.json` raiz**

Dentro de `"scripts"`, adicionar:

```json
"server": "node server.js",
"client": "cd client && npm run dev",
"dev": "concurrently \"npm run server\" \"npm run client\"",
"build": "cd client && npm run build"
```

- [ ] **Step 4: Verificar que o server sobe e responde**

Em um terminal:
```bash
npm run server
```

Em outro terminal:
```bash
curl "http://localhost:3001/api/recommend?q=space+adventure"
```

Expected: array JSON com 5 filmes (pode demorar alguns segundos para carregar o modelo HuggingFace na primeira vez).

```bash
curl "http://localhost:3001/api/recommend"
```

Expected: `{"error":"Parâmetro 'q' é obrigatório"}` com status 400.

- [ ] **Step 5: Commit**

```bash
git add server.js package.json package-lock.json
git commit -m "feat: add Express API server with /api/recommend endpoint"
```

---

## Chunk 3: Setup do Frontend React

### Task 4: Scaffolding do `client/`

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/index.html`
- Create: `client/src/main.jsx`
- Create: `client/src/index.css`

- [ ] **Step 1: Criar `client/package.json`**

```json
{
  "name": "movie-recommender-client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Instalar dependências do client**

```bash
cd client && npm install
```

- [ ] **Step 3: Criar `client/vite.config.js`**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

- [ ] **Step 4: Criar `client/index.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Movie Finder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Criar `client/src/main.jsx`**

```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 6: Criar `client/src/index.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 7: Verificar que o Vite sobe sem erros**

```bash
cd client && npm run dev
```

Expected: Vite inicia em `http://localhost:5173`. Abrir no browser — pode mostrar tela em branco (App ainda não existe) mas não deve ter erros no terminal.

Parar com `Ctrl+C`.

- [ ] **Step 8: Commit**

```bash
git add client/
git commit -m "feat: scaffold React client with Vite and Tailwind v4"
```

---

## Chunk 4: Componentes React

### Task 5: `App.jsx` e `SearchBar.jsx`

**Files:**
- Create: `client/src/App.jsx`
- Create: `client/src/components/SearchBar.jsx`

- [ ] **Step 1: Criar `client/src/components/SearchBar.jsx`**

```javascript
export default function SearchBar({ query, setQuery, onSearch, loading }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter') onSearch(query)
  }

  return (
    <div className="flex max-w-[560px] w-full mx-auto rounded-lg overflow-hidden shadow-[0_4px_24px_rgba(229,193,0,0.12)]">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ex: romantic comedy, psychological thriller..."
        disabled={loading}
        className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] border-r-0 rounded-l-lg px-5 py-3.5 text-white placeholder-[#555] outline-none focus:border-[#e5c100] disabled:opacity-50 transition-colors"
      />
      <button
        onClick={() => onSearch(query)}
        disabled={loading || !query.trim()}
        className="bg-[#e5c100] hover:bg-[#f0ce00] px-7 py-3.5 text-black text-sm font-bold tracking-wide rounded-r-lg disabled:opacity-50 transition-colors cursor-pointer"
      >
        BUSCAR
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Criar `client/src/App.jsx`**

```javascript
import { useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import MovieGrid from './components/MovieGrid.jsx'

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastQuery, setLastQuery] = useState('')

  async function search(q) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setLastQuery(q)
    try {
      const res = await fetch(`/api/recommend?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Erro na busca')
      setResults(await res.json())
    } catch (e) {
      setError('Não foi possível buscar filmes. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#141414] to-[#0a0a0a] border-b border-[#1f1f1f] px-6 py-14 text-center">
        <div className="text-4xl mb-3">🎬</div>
        <h1 className="text-2xl font-extrabold tracking-[4px] text-[#e5c100] uppercase mb-2">
          Movie Finder
        </h1>
        <p className="text-[#666] text-sm tracking-wide mb-8">
          Descubra filmes pelo significado — não por palavras-chave
        </p>
        <SearchBar query={query} setQuery={setQuery} onSearch={search} loading={loading} />
        {error && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}
      </div>

      {/* Results */}
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {loading && (
          <div className="text-center py-16">
            <div className="w-9 h-9 border-3 border-[#1f1f1f] border-t-[#e5c100] rounded-full mx-auto mb-4 animate-spin" />
            <p className="text-[#555] text-sm">Buscando filmes...</p>
          </div>
        )}
        {!loading && results.length > 0 && (
          <>
            <p className="text-[#555] text-xs tracking-[2px] uppercase mb-6">
              {results.length} resultados para <span className="text-[#e5c100]">"{lastQuery}"</span>
            </p>
            <MovieGrid results={results} />
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar placeholder de `MovieGrid` para o App compilar**

```bash
mkdir -p client/src/components
```

Criar `client/src/components/MovieGrid.jsx` temporário:

```javascript
export default function MovieGrid({ results }) {
  return <div>{results.length} filmes</div>
}
```

- [ ] **Step 4: Verificar que o app compila e roda**

Em um terminal, subir o Express (se não estiver rodando):
```bash
npm run server
```

Em outro terminal:
```bash
cd client && npm run dev
```

Abrir `http://localhost:5173`. Deve mostrar o hero com busca. Fazer uma busca e verificar que o spinner aparece e resultados chegam (mostrando "5 filmes").

- [ ] **Step 5: Commit**

```bash
git add client/src/App.jsx client/src/components/SearchBar.jsx client/src/components/MovieGrid.jsx
git commit -m "feat: add App hero layout and SearchBar component"
```

---

### Task 6: `MovieCard.jsx` e `MovieGrid.jsx` (final)

**Files:**
- Create: `client/src/components/MovieCard.jsx`
- Modify: `client/src/components/MovieGrid.jsx`

- [ ] **Step 1: Criar `client/src/components/MovieCard.jsx`**

```javascript
import { useState } from 'react'

export default function MovieCard({ movie, rank }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[#e5c100] cursor-default">
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
          <span className="text-[#e5c100] text-xs font-semibold">⭐ {movie.rating?.toFixed(1)}</span>
          <span className="text-xs text-[#555] bg-[#1f1f1f] px-2 py-0.5 rounded-full">
            {movie.score?.toFixed(2)}
          </span>
        </div>
        {/* Score bar */}
        <div className="mt-2 bg-[#1f1f1f] rounded h-0.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e5c100] to-[#f0ce00] rounded"
            style={{ width: `${(movie.score || 0) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Substituir `MovieGrid.jsx` pela versão final**

```javascript
import MovieCard from './MovieCard.jsx'

export default function MovieGrid({ results }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {results.map((movie, i) => (
        <MovieCard key={movie.id} movie={movie} rank={i + 1} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verificar o app completo no browser**

Com o servidor rodando (`npm run server`) e o Vite rodando (`cd client && npm run dev`):

1. Abrir `http://localhost:5173`
2. Digitar `space adventure` e clicar Buscar
3. Verificar que 5 cards aparecem com pôsteres, título, rating e score
4. Verificar que o hover no card mostra borda dourada
5. Verificar que pôsteres quebrados mostram o placeholder 🎬
6. Digitar `romantic comedy` e buscar novamente

- [ ] **Step 4: Commit**

```bash
git add client/src/components/MovieCard.jsx client/src/components/MovieGrid.jsx
git commit -m "feat: add MovieCard and MovieGrid components"
```

---

## Chunk 5: Integração e Finalização

### Task 7: Verificação final e push

**Files:** nenhum novo

- [ ] **Step 1: Rodar os testes unitários**

```bash
npm test
```

Expected: 19 testes passando.

- [ ] **Step 2: Testar o build de produção**

```bash
npm run build
npm run server
```

Abrir `http://localhost:3001` — o React deve ser servido pelo Express (não pelo Vite). Fazer uma busca e verificar que funciona.

- [ ] **Step 3: Testar o endpoint direto**

```bash
curl "http://localhost:3001/api/recommend?q=crime+drama" | head -c 500
```

Expected: JSON com filmes contendo `poster_link`.

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "feat: complete phase 3 - React frontend with Dark Cinema theme"
```
