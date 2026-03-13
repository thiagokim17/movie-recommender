import { readFile, writeFile } from 'node:fs/promises'
import { embed as defaultEmbed } from '../embeddings.js'
import { cosineSimilarity } from '../similarity.js'
import { combinedScore } from '../scoring.js'

const DEFAULT_PATH = new URL('../../data/vector-store.json', import.meta.url).pathname

export function createJsonVectorStore(storePath = DEFAULT_PATH, embedFn = defaultEmbed) {
  return {
    async save(movies) {
      const indexed = []
      for (const [i, movie] of movies.entries()) {
        process.stdout.write(`\r⚙ Gerando embeddings: ${i + 1}/${movies.length}`)
        const embedding = await embedFn(movie.overview)
        indexed.push({ ...movie, embedding })
      }
      console.log()
      await writeFile(storePath, JSON.stringify(indexed, null, 2))
      console.log(`💾 Salvo em ${storePath}`)
    },

    async similaritySearch(query, topK = 5) {
      const queryEmbedding = await embedFn(query)
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
    },
  }
}
