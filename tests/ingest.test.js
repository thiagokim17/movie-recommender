import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseCSV, normalizeMovie, filterMovies } from '../scripts/ingest.js'

test('parseCSV lê colunas do IMDB corretamente', async (t) => {
  const csvContent = `Series_Title,Overview,Released_Year\nInterstellar,A team travels through space,2014\nFight Club,An insomniac office worker,1999`
  const tmpFile = join(tmpdir(), `test-${Date.now()}.csv`)
  await writeFile(tmpFile, csvContent)
  t.after(() => unlink(tmpFile))

  const rows = await parseCSV(tmpFile)

  assert.equal(rows.length, 2)
  assert.equal(rows[0].Series_Title, 'Interstellar')
  assert.equal(rows[0].Overview, 'A team travels through space')
})

test('normalizeMovie mapeia colunas do IMDB para formato interno', () => {
  const row = {
    Series_Title: 'Interstellar',
    Overview: 'A team travels through space',
    IMDB_Rating: '8.6',
    Genre: 'Adventure, Drama, Sci-Fi',
    Poster_Link: 'https://m.media-amazon.com/images/test.jpg',
  }

  const movie = normalizeMovie(row, 0)

  assert.equal(movie.id, 1)
  assert.equal(movie.title, 'Interstellar')
  assert.equal(movie.overview, 'A team travels through space')
  assert.equal(movie.rating, 8.6)
  assert.equal(movie.genres, 'Adventure, Drama, Sci-Fi')
  assert.equal(movie.poster_link, 'https://m.media-amazon.com/images/test.jpg')
})

test('filterMovies mantém filmes com overview', () => {
  const movies = [
    { id: '1', title: 'Movie A', overview: 'Has overview' },
    { id: '2', title: 'Movie B', overview: '' },
    { id: '3', title: 'Movie C', overview: '   ' },
  ]

  const { valid, skipped } = filterMovies(movies)

  assert.equal(valid.length, 1)
  assert.equal(skipped, 2)
  assert.equal(valid[0].title, 'Movie A')
})

test('filterMovies retorna todos quando todos têm overview', () => {
  const movies = [
    { id: '1', title: 'A', overview: 'Overview A' },
    { id: '2', title: 'B', overview: 'Overview B' },
  ]

  const { valid, skipped } = filterMovies(movies)

  assert.equal(valid.length, 2)
  assert.equal(skipped, 0)
})
