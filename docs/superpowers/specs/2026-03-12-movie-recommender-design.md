# Movie Recommender — Design Spec

## Visão Geral

Sistema de recomendação de filmes por similaridade semântica. O usuário informa um título e recebe os 5 filmes mais similares com base no significado das sinopses, não em palavras-chave exatas.

**Stack:**
- Fase 1: Node.js, HuggingFace (`@huggingface/transformers`), cosine similarity manual
- Fase 2: + LangChain.js (`@langchain/community`), Neo4j
- Fase 3: + Express, TMDB API

**Dados:** Dataset TMDB do Kaggle (~5000 filmes, CSV com `title`, `overview`, `id`)
**Node.js:** >= 22 (necessário para `@huggingface/transformers` com ESM)

---

## Fase 1 — Core CLI

Foco em aprender o fluxo completo de embeddings e cosine similarity **sem abstrações** — o estudante vê a matemática acontecendo.

**Fluxo:**
```
[CSV Kaggle]
    ↓ (roda uma vez)
[ingest.js] → gera embeddings via HuggingFace → [data/vector-store.json]
                                                         ↓
[recommend.js "Interestelar"] → embedding da busca → cosine similarity → top 5
```

**Componentes:**
- `scripts/ingest.js` — lê o CSV, gera embedding de cada sinopse, salva `data/vector-store.json`. Filmes com `overview` vazio são ignorados com aviso.
- `scripts/recommend.js` — recebe título via argumento CLI, calcula similaridade contra todos os embeddings e exibe top 5 no terminal
- `src/embeddings.js` — wrapper do modelo HuggingFace (`all-MiniLM-L6-v2`), retorna vetor float32[]
- `src/similarity.js` — implementação de cosine similarity: `dot(a,b) / (norm(a) * norm(b))`
- `data/` — CSV original + `vector-store.json` gerado pelo ingest

**Schema do `vector-store.json`:**
```json
[
  {
    "id": 157336,
    "title": "Interstellar",
    "overview": "A team of explorers travel through a wormhole...",
    "embedding": [0.021, -0.043, 0.118, "...384 números no total"]
  }
]
```

**Dependências:** `@huggingface/transformers`, `csv-parse`

**Uso:**
```bash
node scripts/ingest.js                        # roda uma vez (~5 min)
node scripts/recommend.js "Interestelar"
```

**Output esperado:**
```
Buscando filmes similares a "Interstellar"...

1. Gravity              (score: 0.94) — Two astronauts work together...
2. The Martian          (score: 0.91) — An astronaut becomes stranded...
3. 2001: A Space Odyssey (score: 0.88) — After discovering a mysterious...
4. Contact              (score: 0.85) — A scientist receives signals...
5. Ad Astra             (score: 0.82) — An astronaut travels to the edge...
```

---

## Fase 2 — Vector Store com Neo4j

**Esta fase é uma refatoração da Fase 1.** A lógica de embeddings (`src/embeddings.js`) e a lógica de negócio (`scripts/recommend.js`, `scripts/ingest.js`) são modificadas para consumirem uma interface comum de vector store.

**O que muda:**
- `scripts/ingest.js` e `scripts/recommend.js` são atualizados para usar `vectorStore` em vez de acessar o arquivo JSON diretamente
- Adiciona `src/vectorStore/json.js` — extrai a implementação de arquivo local da Fase 1
- Adiciona `src/vectorStore/neo4j.js` — nova implementação usando `Neo4jVectorStore` do LangChain, que gerencia o índice vetorial automaticamente
- Adiciona `docker-compose.yml` para subir o Neo4j localmente

**Padrão aplicado:** Strategy — troca de implementação via variável de ambiente (`VECTOR_STORE=neo4j` ou `VECTOR_STORE=json`) sem alterar os scripts.

**Interface do vectorStore (contrato compartilhado entre as duas implementações):**

```javascript
// Entrada: array de objetos { id, title, overview }
// A implementação gera os embeddings internamente
vectorStore.save(movies: Array<{ id, title, overview }>): Promise<void>

// Entrada: texto de busca + número de resultados
// Saída: filmes ordenados por similaridade
vectorStore.similaritySearch(
  query: string,
  topK: number = 5
): Promise<Array<{ id, title, overview, score }>>
```

**Sobre o índice vetorial no Neo4j:** `Neo4jVectorStore` do LangChain cria e gerencia o índice automaticamente — o estudante não precisa escrever Cypher de criação de índice manualmente.

**Uso:**
```bash
npm run infra:up
node scripts/ingest.js
node scripts/recommend.js "Interestelar"
npm run infra:down
```

---

## Fase 3 — Interface Visual

Expõe a funcionalidade como produto usável via navegador.

**Novas peças:**
- `server.js` — API Express com endpoint `GET /recommend?title=`
- `public/index.html` — página de busca com campo de input e grid de cards
- `public/app.js` — lógica do frontend (fetch da API, renderização dos cards)
- `public/style.css` — estilos

**O que não muda:** `src/embeddings.js`, `src/vectorStore/` — reaproveitados pelo servidor.

**Endpoint:**
```
GET /recommend?title=Interstellar

[
  {
    "id": 49046,
    "title": "Gravity",
    "overview": "Two astronauts work together...",
    "poster_url": "https://image.tmdb.org/t/p/w500/...",
    "score": 0.94
  }
]
```

**Pôsteres:** TMDB API buscada pelo campo `id` do dataset (mais confiável que busca por título). Quando o pôster não estiver disponível, exibe um placeholder com o título do filme.

**Layout:**
```
┌─────────────────────────────────────┐
│  🎬 Movie Recommender               │
│                                     │
│  [ Interestelar          ] [Buscar] │
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │poster│  │poster│  │poster│      │
│  │      │  │      │  │      │      │
│  │Gravity│  │Martian│  │2001 │      │
│  │ 0.94 │  │ 0.91 │  │ 0.88 │      │
│  └──────┘  └──────┘  └──────┘      │
└─────────────────────────────────────┘
```

---

## Estrutura de Arquivos Final

```
movie-recommender/
├── data/
│   ├── tmdb_5000_movies.csv     # dataset do Kaggle
│   └── vector-store.json        # gerado na Fase 1
├── src/
│   ├── embeddings.js            # wrapper HuggingFace
│   ├── similarity.js            # cosine similarity (Fase 1 only)
│   └── vectorStore/
│       ├── json.js              # implementação arquivo local
│       └── neo4j.js             # implementação Neo4j via LangChain
├── scripts/
│   ├── ingest.js                # indexação dos filmes
│   └── recommend.js             # busca via CLI
├── public/
│   ├── index.html               # Fase 3
│   ├── app.js                   # Fase 3
│   └── style.css                # Fase 3
├── server.js                    # Fase 3: API Express
├── docker-compose.yml           # Fase 2: Neo4j
├── .env.example
└── package.json
```

---

## Variáveis de Ambiente

```env
VECTOR_STORE=json               # ou "neo4j" para Fase 2+
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
TMDB_API_KEY=                   # Fase 3: pôsteres
```

---

## Aprendizados por Fase

| Fase | Conceito principal |
|------|-------------------|
| 1 | O que são embeddings, como gerar com HuggingFace, como comparar com cosine similarity |
| 2 | Separação entre lógica e infraestrutura, vector store em banco de grafos, LangChain abstractions |
| 3 | Exposição como API REST, integração frontend + backend, TMDB API |
