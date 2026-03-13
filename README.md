# Movie Recommender

Recomendador de filmes por similaridade semântica usando embeddings e busca vetorial. Dado um texto de busca, encontra os filmes do IMDB Top 1000 mais relevantes usando uma combinação de similaridade semântica, nota IMDB e boost de gênero.

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

## Requisitos

- Node.js 22+
- Dataset IMDB Top 1000: [Kaggle](https://www.kaggle.com/datasets/harshitshankhdhar/imdb-dataset-of-top-1000-movies-and-tv-shows) → salvar em `data/imdb_top_1000.csv`

## Instalação

```bash
npm install
```

## Uso

**1. Gerar os embeddings (só precisa rodar uma vez — ~5-15 min):**

```bash
npm run ingest
```

Lê o CSV, gera embeddings para cada sinopse via HuggingFace `Xenova/all-MiniLM-L6-v2` e salva em `data/vector-store.json`.

**2. Buscar filmes:**

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

## Testes

```bash
npm test
```

18 testes unitários cobrindo similaridade, scoring, ingest e recomendação.

## Estrutura

```
src/
  similarity.js   # Cosine similarity pura (sem dependências)
  embeddings.js   # Wrapper HuggingFace (singleton)
  scoring.js      # Score combinado (similarity + rating + genre boost)
scripts/
  ingest.js       # Lê CSV → gera embeddings → salva vector-store.json
  recommend.js    # Busca os K filmes mais similares
tests/            # Testes unitários (node:test)
data/             # imdb_top_1000.csv (não versionado) e vector-store.json (não versionado)
```
