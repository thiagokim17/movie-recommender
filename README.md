# Movie Recommender

Recomendador de filmes por similaridade semântica com interface web. Dado um texto de busca, encontra os filmes do IMDB Top 1000 mais relevantes usando uma combinação de similaridade semântica, nota IMDB e boost de gênero — e explica como cada pontuação foi calculada.

## Como funciona

```
Texto de busca → Embedding (384 dimensões) → Cosine Similarity → Score combinado → Top 5 filmes
```

O score final de cada filme é calculado como:

```
score = (similarity × 0.6) + (rating/10 × 0.3) + (genreBoost × 0.1)
```

- **Similaridade semântica (60%)** — cosine similarity entre o embedding da busca e o embedding da sinopse
- **Nota IMDB (30%)** — favorece filmes bem avaliados
- **Boost de gênero (10%)** — bônus quando a busca menciona um gênero do filme (ex: "action thriller")

Clique em qualquer card para ver como cada componente contribuiu para o score daquele filme.

## Requisitos

- Node.js 22+
- Dataset IMDB Top 1000: [Kaggle](https://www.kaggle.com/datasets/harshitshankhdhar/imdb-dataset-of-top-1000-movies-and-tv-shows) → salvar em `data/imdb_top_1000.csv`
- Docker Desktop (apenas para o modo Neo4j)

## Instalação

```bash
npm install
```

## Uso

### Interface Web

**1. Gerar os embeddings** — só precisa rodar uma vez (~5–15 min):

```bash
npm run ingest
```

Lê o CSV, gera embeddings para cada sinopse via HuggingFace `Xenova/all-MiniLM-L6-v2` e salva em `data/vector-store.json`. Inclui poster, rating e gêneros.

**2. Subir o servidor de desenvolvimento:**

```bash
npm run dev
```

Abre em `http://localhost:5173`. O servidor API sobe automaticamente em `http://localhost:3001`.

Para subir apenas o servidor (sem o cliente Vite):

```bash
npm run server
```

Para fazer build do cliente e servir via Express:

```bash
npm run build   # gera client/dist/
npm run server  # serve a SPA + API na porta 3001
```

### CLI

**Buscar filmes pelo terminal:**

```bash
npm run recommend -- "romantic comedy"
npm run recommend -- "action thriller with revenge"
npm run recommend -- "psychological horror"
```

Exemplo de saída:

```
🔍 Buscando filmes similares a "romantic comedy"...

1. (500) Days of Summer        (score: 0.70) ⭐ 7.7 | Comedy, Drama, Romance — An offbeat romantic comedy...
2. Annie Hall                  (score: 0.68) ⭐ 8.0 | Comedy, Drama, Romance — Neurotic New York comedian...
```

### Modo Neo4j

Armazena os embeddings no Neo4j. Requer Docker.

**1. Subir o banco:**

```bash
npm run infra:up
```

**2. Indexar os filmes** — só precisa rodar uma vez:

```bash
VECTOR_STORE=neo4j node scripts/ingest.js
```

**3. Buscar filmes:**

```bash
VECTOR_STORE=neo4j node scripts/recommend.js "Interstellar"
```

**4. Derrubar o banco quando terminar:**

```bash
npm run infra:down
```

## Testes

```bash
npm test
```

20 testes unitários cobrindo similaridade, scoring, ingest e vector store JSON.

## Estrutura

```
src/
  similarity.js        # Cosine similarity pura (sem dependências)
  embeddings.js        # Wrapper HuggingFace (singleton)
  scoring.js           # Score combinado — retorna { total, similarity, ratingScore, genreBoost }
  vectorStore/
    index.js           # Factory: seleciona implementação via VECTOR_STORE env
    json.js            # Implementação JSON (arquivo local) — inclui score_breakdown na resposta
    neo4j.js           # Implementação Neo4j via LangChain
scripts/
  ingest.js            # Lê CSV → indexa via vector store
  recommend.js         # Busca os K filmes mais similares
server.js              # API Express + serve SPA (porta 3001)
client/                # Frontend React 19 + Vite 6 + Tailwind CSS v4
  src/
    App.jsx            # Layout principal, busca, estados
    components/
      SearchBar.jsx    # Input controlado com submit por Enter
      MovieGrid.jsx    # Grid responsivo (2→5 colunas)
      MovieCard.jsx    # Card com poster, score, expand/collapse de breakdown
tests/                 # Testes unitários (node:test)
data/                  # imdb_top_1000.csv (não versionado) e vector-store.json (não versionado)
docker-compose.yml     # Sobe Neo4j local para o modo Neo4j
```
