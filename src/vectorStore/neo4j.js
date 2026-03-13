import { Neo4jVectorStore } from '@langchain/community/vectorstores/neo4j_vector'
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers'
import { Document } from '@langchain/core/documents'

/**
 * Cria um vector store baseado em Neo4j via LangChain.
 * A instância de embeddings é criada uma única vez e reutilizada.
 */
export function createNeo4jVectorStore() {
  const embeddings = new HuggingFaceTransformersEmbeddings({ model: 'Xenova/all-MiniLM-L6-v2' })
  const config = {
    url: process.env.NEO4J_URI || 'bolt://localhost:7687',
    username: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
    indexName: 'movie_embeddings',
    nodeLabel: 'Movie',
    textNodeProperty: 'overview',
    embeddingNodeProperty: 'embedding',
    retrievalQuery: `
      RETURN node.overview AS text, score,
      node { .title, .overview, .rating, .genres, id: node.id } AS metadata
    `,
  }

  return {
    /**
     * Converte filmes em Documents do LangChain e indexa no Neo4j.
     * @param {Array<{ id, title, overview, rating, genres }>} movies
     */
    async save(movies) {
      const docs = movies.map(
        (movie) =>
          new Document({
            pageContent: movie.overview,
            metadata: {
              id: movie.id,
              title: movie.title,
              overview: movie.overview,
              rating: movie.rating || 0,
              genres: movie.genres || '',
            },
          })
      )

      console.log(`⏳ Indexando ${docs.length} filmes no Neo4j...`)
      const store = await Neo4jVectorStore.fromDocuments(docs, embeddings, config)
      await store.close()
      console.log(`✅ ${docs.length} filmes indexados no Neo4j`)
    },

    /**
     * Busca os K filmes mais similares no Neo4j.
     * @param {string} query  - Texto de busca
     * @param {number} topK   - Número de resultados (padrão: 5)
     * @returns {Promise<Array<{ id, title, overview, rating, genres, score }>>}
     */
    async similaritySearch(query, topK = 5) {
      const store = await Neo4jVectorStore.fromExistingIndex(embeddings, config)
      const results = await store.similaritySearchWithScore(query, topK)
      await store.close()

      return results.map(([doc, score]) => ({
        id: doc.metadata.id,
        title: doc.metadata.title,
        overview: doc.metadata.overview,
        rating: doc.metadata.rating,
        genres: doc.metadata.genres,
        score,
      }))
    },
  }
}
