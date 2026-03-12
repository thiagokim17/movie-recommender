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
