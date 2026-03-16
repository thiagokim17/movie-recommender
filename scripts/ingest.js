import { createReadStream } from 'node:fs'
import { parse } from 'csv-parse'
import { getVectorStore } from '../src/vectorStore/index.js'

const CSV_PATH = new URL('../data/imdb_top_1000.csv', import.meta.url).pathname

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
 */
export function normalizeMovie(row, index) {
  return {
    id: index + 1,
    title: row.Series_Title,
    overview: row.Overview,
    rating: parseFloat(row.IMDB_Rating) || 0,
    genres: row.Genre || '',
    poster_link: row.Poster_Link || '',
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

  const vectorStore = await getVectorStore()
  await vectorStore.save(valid)
  console.log(`✅ ${valid.length} filmes indexados`)
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error)
}
