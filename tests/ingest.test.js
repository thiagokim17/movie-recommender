import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseCSV, filterMovies } from '../scripts/ingest.js'

test('parseCSV lê colunas corretamente', async (t) => {
  const csvContent = `id,title,overview\n157336,Interstellar,A team travels through space\n550,Fight Club,An insomniac office worker`
  const tmpFile = join(tmpdir(), `test-${Date.now()}.csv`)
  await writeFile(tmpFile, csvContent)
  t.after(() => unlink(tmpFile))

  const rows = await parseCSV(tmpFile)

  assert.equal(rows.length, 2)
  assert.equal(rows[0].id, '157336')
  assert.equal(rows[0].title, 'Interstellar')
  assert.equal(rows[0].overview, 'A team travels through space')
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
