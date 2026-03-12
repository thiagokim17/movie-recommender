import { createReadStream } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { parse } from 'csv-parse'
import { embed } from '../src/embeddings.js'

const CSV_PATH = new URL('../data/imdb_top_1000.csv', import.meta.url).pathname
const OUTPUT_PATH = new URL('../data/vector-store.json', import.meta.url).pathname

export function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = []
    createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => records.push(row))
      .on('end', () => resolve(records))
      .on('error', reject)
  })
}

/**
 * Normaliza uma linha do CSV do IMDB para o formato interno.
 * Series_Title → title, Overview → overview, índice → id
 * IMDB_Rating → rating (parseFloat), Genre → genres
 */
export function normalizeMovie(row, index) {
  return {
    id: index + 1,
    title: row.Series_Title,
    overview: row.Overview,
    rating: parseFloat(row.IMDB_Rating) || 0,
    genres: row.Genre || '',
  }
}

export function filterMovies(movies) {
  const valid = []
  let skipped = 0

  for (const movie of movies) {
    if (!movie.overview?.trim()) {
      console.warn(`⚠ Ignorando "${movie.title}" — overview vazio`)
      skipped++
    } else {
      valid.push(movie)
    }
  }

  return { valid, skipped }
}

async function main() {
  console.log('📖 Lendo CSV...')
  const rows = await parseCSV(CSV_PATH)
  const normalized = rows.map(normalizeMovie)
  const { valid, skipped } = filterMovies(normalized)

  console.log(`📊 ${valid.length} filmes para indexar, ${skipped} ignorados\n`)

  const movies = []
  for (const [i, movie] of valid.entries()) {
    process.stdout.write(`\r⚙ Gerando embeddings: ${i + 1}/${valid.length}`)
    const embedding = await embed(movie.overview)
    movies.push({ ...movie, embedding })
  }

  console.log(`\n✅ ${movies.length} filmes indexados`)
  await writeFile(OUTPUT_PATH, JSON.stringify(movies, null, 2))
  console.log('💾 Salvo em data/vector-store.json')
}

// Só executa quando chamado diretamente (não em testes)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error)
}
