# Movie Recommender — Fase 3: Interface Visual — Design Spec

## Visão Geral

Expor a funcionalidade de recomendação como uma interface web com tema Dark Cinema. O usuário digita uma query e vê os 5 filmes mais similares em um grid de cards com pôsteres, rating e score de similaridade.

**Stack:** React 19 + Vite + Tailwind CSS (frontend), Express (backend API), Node.js 22+

**Princípio:** o frontend é uma camada fina — toda a lógica de recomendação já existe no backend. A Fase 3 apenas expõe isso via HTTP e renderiza os resultados.

---

## Arquitetura

```
movie-recommender/
├── server.js                  ← Express API (novo)
├── client/                    ← React app (novo)
│   ├── package.json
│   ├── vite.config.js         ← proxy /api → Express em dev
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            ← estado global: query, resultados, loading, erro
│       ├── components/
│       │   ├── SearchBar.jsx  ← input + botão + submit via Enter
│       │   ├── MovieGrid.jsx  ← grid de 5 cards
│       │   └── MovieCard.jsx  ← pôster, título, gêneros, rating, score
│       └── index.css          ← Tailwind directives
├── scripts/ingest.js          ← adiciona poster_link (modificado)
├── src/vectorStore/json.js    ← retorna poster_link (modificado)
├── src/vectorStore/neo4j.js   ← retorna poster_link (modificado)
└── ...
```

**Fluxo:**
```
usuário digita → SearchBar → fetch('/api/recommend?q=...')
→ Express (server.js) → getVectorStore().similaritySearch(query)
→ [{title, overview, poster_link, rating, genres, score}] × 5
→ MovieGrid → MovieCard × 5
```

**Dev vs Produção:**
- Dev: Vite na porta 5173, proxy `/api/*` → Express na porta 3001
- Produção: Express serve o build do React em `client/dist/` na porta 3001

---

## API Express

### `server.js`

- Porta: `process.env.PORT || 3001`
- Serve `client/dist/` como arquivos estáticos em produção
- Endpoint único: `GET /api/recommend`

### `GET /api/recommend?q=<query>`

**Parâmetros:**
- `q` (obrigatório) — texto de busca

**Resposta 200:**
```json
[
  {
    "title": "Gravity",
    "overview": "Two astronauts work together...",
    "poster_link": "https://m.media-amazon.com/images/...",
    "rating": 7.7,
    "genres": "Sci-Fi, Thriller",
    "score": 0.94
  }
]
```

**Resposta 400** (q ausente ou vazio):
```json
{ "error": "Parâmetro 'q' é obrigatório" }
```

**Resposta 500:**
```json
{ "error": "Erro interno ao buscar recomendações" }
```

---

## Mudanças no Código Existente

### `scripts/ingest.js` — `normalizeMovie()`

Adicionar campo `poster_link`:
```javascript
export function normalizeMovie(row, index) {
  return {
    id: index + 1,
    title: row.Series_Title,
    overview: row.Overview,
    rating: parseFloat(row.IMDB_Rating) || 0,
    genres: row.Genre || '',
    poster_link: row.Poster_Link || '',  // novo
  }
}
```

### `src/vectorStore/json.js`

- `save()`: persiste `poster_link` junto com os demais campos
- `similaritySearch()`: inclui `poster_link` no objeto retornado

### `src/vectorStore/neo4j.js`

- `save()`: adiciona `poster_link` no `metadata` do `Document`
- `similaritySearch()`: inclui `poster_link` no objeto retornado via `retrievalQuery`

> **Nota:** Após adicionar `poster_link` ao `normalizeMovie`, o ingest precisa ser re-executado para regenerar o `vector-store.json`.

---

## Componentes React

### `App.jsx`

Estado:
```javascript
const [query, setQuery] = useState('')
const [results, setResults] = useState([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
```

Função de busca:
```javascript
async function search(q) {
  setLoading(true)
  setError(null)
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
```

### `SearchBar.jsx`

- Input controlado com `value` e `onChange`
- Submit ao clicar no botão ou pressionar `Enter`
- Desabilitado durante `loading`

### `MovieGrid.jsx`

- Grid responsivo: 5 colunas em desktop, 2-3 em mobile
- Recebe `results: Array` como prop
- Renderiza `<MovieCard>` para cada item

### `MovieCard.jsx`

Props: `{ title, overview, poster_link, rating, genres, score, rank }`

Elementos:
- Pôster via `<img src={poster_link}>` com `onError` exibindo placeholder `🎬`
- Badge de ranking (1–5) no canto superior esquerdo do pôster
- Título (truncado se longo)
- Gêneros (truncados)
- Rating com ⭐ em dourado (`#e5c100`)
- Score numérico em badge
- Barra de progresso proporcional ao score

---

## Visual Design

**Tema:** Dark Cinema
- Background: `#0a0a0a`
- Surface: `#141414`
- Border: `#1f1f1f`
- Accent (dourado): `#e5c100`
- Texto primário: `#ffffff`
- Texto secundário: `#666666`

**Hero:**
- Título em uppercase com letter-spacing, cor dourada
- Subtítulo "Descubra filmes pelo significado — não por palavras-chave"
- Barra de busca centralizada com máximo de 560px, bordas douradas ao focar

**MovieCard:**
- Hover: `translateY(-4px)` + borda dourada
- Pôster com aspect-ratio 2:3
- Placeholder escuro com emoji 🎬 quando imagem falha

---

## Estados da UI

| Estado | Comportamento |
|--------|--------------|
| Inicial | Hero visível, sem resultados, sem loading |
| Loading | Spinner dourado centralizado abaixo do hero |
| Resultados | Label "N resultados para 'query'" + grid de cards |
| Erro | Mensagem de erro em vermelho suave abaixo da busca |
| Pôster quebrado | Placeholder `🎬` substitui a imagem automaticamente |

---

## Configuração

### `client/vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

### Scripts em `package.json` (raiz)
```json
"server": "node server.js",
"client": "cd client && npm run dev",
"dev": "concurrently \"npm run server\" \"npm run client\""
```

### Scripts em `client/package.json`
```json
"dev": "vite",
"build": "vite build",
"preview": "vite preview"
```

---

## Dependências

**Raiz (`package.json`):**
- `express` — servidor HTTP
- `concurrently` — rodar server + client em paralelo no dev

**`client/package.json`:**
- `react`, `react-dom`
- `@vitejs/plugin-react`
- `vite`
- `tailwindcss`, `@tailwindcss/vite`

---

## Testes

Não há novos testes unitários na Fase 3 — a lógica de negócio já é coberta pelas fases anteriores (19 testes). A validação é feita via uso manual do app no browser.

---

## Variáveis de Ambiente

```env
PORT=3001                   # porta do Express (opcional, default 3001)
VECTOR_STORE=json           # ou "neo4j"
```
