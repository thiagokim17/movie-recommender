import { readFile } from 'node:fs/promises'
import { embed } from '../src/embeddings.js'
import { cosineSimilarity } from '../src/similarity.js'
import { combinedScore } from '../src/scoring.js'

const DEFAULT_STORE = new URL('../data/vector-store.json', import.meta.url).pathname

/**
 * Busca os K filmes mais similares usando score combinado:
 * similaridade semântica (60%) + nota IMDB (30%) + boost de gênero (10%).
 * Separado do embed() para permitir testes sem carregar o modelo HuggingFace.
 *
 * @param {number[]} queryEmbedding - Embedding da query gerado por embed()
 * @param {string}   query          - Texto original da query (para detecção de gênero)
 * @param {number}   topK           - Número de resultados
 * @param {string}   storePath      - Caminho para o vector-store.json
 */
export async function findSimilar(queryEmbedding, query, topK = 5, storePath = DEFAULT_STORE) {
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
  const results = await findSimilar(queryEmbedding, query)

  results.forEach((movie, i) => {
    const preview = movie.overview.slice(0, 50) + '...'
    console.log(
      `${i + 1}. ${movie.title.padEnd(28)} (score: ${movie.score.toFixed(2)}) ⭐ ${movie.rating.toFixed(1)} | ${movie.genres} — ${preview}`
    )
  })
}
