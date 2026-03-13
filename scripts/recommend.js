import { getVectorStore } from '../src/vectorStore/index.js'

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const query = process.argv[2]
  if (!query) {
    console.error('Uso: node scripts/recommend.js "Título do Filme"')
    process.exit(1)
  }

  console.log(`\n🔍 Buscando filmes similares a "${query}"...\n`)

  const vectorStore = await getVectorStore()
  const results = await vectorStore.similaritySearch(query)

  results.forEach((movie, i) => {
    const preview = movie.overview.slice(0, 50) + '...'
    console.log(
      `${i + 1}. ${movie.title.padEnd(28)} (score: ${movie.score.toFixed(2)}) ⭐ ${movie.rating.toFixed(1)} | ${movie.genres} — ${preview}`
    )
  })
}
