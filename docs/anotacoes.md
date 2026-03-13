# Anotações de Estudo — Movie Recommender

## Fase 1 — Embeddings e Cosine Similarity

### O que são embeddings?

Embeddings são **representações numéricas de texto** — um vetor de números (ex: 384 números) que captura o *significado semântico* de uma frase. Textos com significado parecido têm vetores parecidos.

```
"A spacecraft travels through a wormhole"  → [0.021, -0.043, 0.118, ...]
"Two astronauts survive in outer space"    → [0.019, -0.038, 0.115, ...]  ← próximo
"A love story in Paris"                    → [-0.12,  0.091, -0.034, ...] ← distante
```

O modelo usado é o `all-MiniLM-L6-v2` do HuggingFace — leve, rápido, produz vetores de 384 dimensões.

### Como funciona a cosine similarity?

Mede o **ângulo entre dois vetores**. Não importa o tamanho dos vetores, só a direção.

```
cos(θ) = dot(a, b) / (norm(a) * norm(b))
```

- `1.0` → vetores idênticos (mesma direção)
- `0.0` → vetores ortogonais (sem relação)
- `-1.0` → vetores opostos

### Por que cosine e não distância euclidiana?

Embeddings normalizados têm norma 1, então cosine similarity e distância euclidiana são equivalentes. Mas cosine é mais comum em NLP porque é invariante à magnitude — um texto curto e um longo sobre o mesmo assunto ficam próximos mesmo tendo tamanhos diferentes.

### O que é o combined score? (adicionado após a Fase 1 base)

Para melhorar a qualidade das recomendações, o score final combina três fatores:

```
score = (similarity × 0.6) + (rating/10 × 0.3) + (genreBoost × 0.1)
```

- **Similaridade semântica** (60%): quão parecida é a sinopse
- **Nota IMDB** (30%): filmes bem avaliados têm preferência
- **Boost de gênero** (10%): se a query menciona um gênero do filme, leva um bônus

---

## Fase 2 — Vector Store e LangChain

### Por que sair do arquivo JSON?

Na Fase 1, o `recommend.js` carrega **todos os embeddings na memória** e calcula a distância um por um. Com 1000 filmes funciona. Com 1 milhão, inviável.

A solução é usar um banco com **índice vetorial**: a busca acontece dentro do banco, de forma eficiente, sem carregar tudo na memória.

### O que é o Neo4j?

Banco de dados de **grafos** com suporte nativo a vetores (desde v5). Cria um índice vetorial (HNSW) que permite busca por similaridade em tempo sub-linear.

```
Fase 1: app carrega N embeddings → calcula N distâncias → retorna top K   O(n)
Fase 2: app pergunta pro Neo4j   → índice HNSW → retorna top K             O(log n)
```

### O que é o LangChain?

Biblioteca de abstrações para IA — o "ORM do mundo de IA". Sem ele, você escreveria Cypher (linguagem do Neo4j) manualmente para criar índices e fazer queries. Com ele:

```javascript
// Cria o índice, gera os embeddings, salva no Neo4j — tudo em uma chamada
const store = await Neo4jVectorStore.fromDocuments(docs, embeddings, config)

// Busca vetorial + scores
const results = await store.similaritySearchWithScore("space adventure", 5)
```

A vantagem real: você pode trocar Neo4j por Pinecone, Chroma, pgvector, etc. **sem mudar o código de negócio** — só troca a implementação do vectorStore.

### O que é o padrão Strategy?

Padrão de design que permite **trocar algoritmos/implementações em runtime** sem alterar o código que os usa.

No projeto:
```javascript
// src/vectorStore/index.js
export async function getVectorStore() {
  if (process.env.VECTOR_STORE === 'neo4j') {
    return createNeo4jVectorStore()  // implementação Neo4j
  }
  return createJsonVectorStore()     // implementação JSON
}
```

Os scripts `ingest.js` e `recommend.js` chamam `getVectorStore()` sem saber qual implementação está por baixo. A troca é feita pela variável de ambiente `VECTOR_STORE`.

### O que é o Docker Compose e por que precisamos dele?

Docker é uma ferramenta que roda aplicações dentro de **containers** — ambientes isolados e reproduzíveis. Em vez de instalar o Neo4j na sua máquina (o que pode conflitar com outras versões, sujar o sistema, etc.), você roda ele num container que some quando você não precisa mais.

Docker Compose é uma camada acima do Docker que permite **descrever e gerenciar múltiplos containers** num único arquivo `docker-compose.yml`.

No projeto, o `docker-compose.yml` descreve o Neo4j:

```yaml
services:
  neo4j:
    image: neo4j:5          # qual versão usar (baixa do Docker Hub automaticamente)
    ports:
      - "7474:7474"         # porta do browser (interface web)
      - "7687:7687"         # porta bolt (onde a aplicação conecta)
    environment:
      - NEO4J_AUTH=neo4j/password   # usuário e senha
    volumes:
      - neo4j_data:/data    # persiste os dados entre restarts
```

Com dois comandos você sobe e derruba o banco:

```bash
npm run infra:up    # docker compose up -d   → sobe o Neo4j em background
npm run infra:down  # docker compose down    → derruba e libera os recursos
```

**Por que não instalar o Neo4j direto na máquina?**

| | Docker | Instalação local |
|---|---|---|
| Versão | Fixada no arquivo, igual pra todo time | Depende do que cada um instalou |
| Limpeza | `docker compose down` remove tudo | Desinstalar é trabalhoso |
| Conflitos | Isolado do sistema | Pode conflitar com outras ferramentas |
| Subir/derrubar | Um comando | Processo manual |

No contexto deste projeto, o Docker Compose é só infraestrutura de desenvolvimento local — você só precisa dele quando está testando com `VECTOR_STORE=neo4j`.

### Divisão de responsabilidades na Fase 2

| Responsabilidade | Quem faz |
|---|---|
| Gerar embeddings | HuggingFace (`all-MiniLM-L6-v2`) |
| Armazenar e indexar vetores | Neo4j (ou arquivo JSON) |
| Interface com o Neo4j | LangChain (`Neo4jVectorStore`) |
| Selecionar implementação | `src/vectorStore/index.js` |
| Orquestrar o fluxo | `scripts/ingest.js` e `scripts/recommend.js` |

---

## Fase 3 — API REST e Interface Visual

> *A preencher quando a Fase 3 for implementada.*
