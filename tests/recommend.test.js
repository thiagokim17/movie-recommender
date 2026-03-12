import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findSimilar } from '../scripts/recommend.js'

test('retorna top K filmes ordenados por score combinado', async (t) => {
  const store = [
    { id: 1, title: 'Sci-Fi A', overview: 'Space exploration', rating: 9.0, genres: 'Sci-Fi', embedding: [1, 0, 0] },
    { id: 2, title: 'Sci-Fi B', overview: 'Wormhole travel',  rating: 7.0, genres: 'Sci-Fi', embedding: [0.9, 0.1, 0] },
    { id: 3, title: 'Romance',  overview: 'Love story',       rating: 8.0, genres: 'Romance', embedding: [0, 0, 1] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  const results = await findSimilar([1, 0, 0], 'sci-fi', 2, tmpFile)

  assert.equal(results.length, 2)
  assert.equal(results[0].title, 'Sci-Fi A')
  assert.equal(results[1].title, 'Sci-Fi B')
  assert.ok(results[0].score > results[1].score, 'primeiro resultado deve ter score maior')
})

test('resultado contém id, title, overview, rating, genres e score', async (t) => {
  const store = [
    { id: 42, title: 'Test Movie', overview: 'Test overview', rating: 8.0, genres: 'Drama', embedding: [1, 0] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  const results = await findSimilar([1, 0], 'drama', 1, tmpFile)

  assert.ok('id' in results[0])
  assert.ok('title' in results[0])
  assert.ok('overview' in results[0])
  assert.ok('rating' in results[0])
  assert.ok('genres' in results[0])
  assert.ok('score' in results[0])
})

test('genre boost eleva filme do gênero correto no ranking', async (t) => {
  const store = [
    { id: 1, title: 'Action A', overview: 'Explosions',   rating: 7.0, genres: 'Action', embedding: [0.8, 0.2, 0] },
    { id: 2, title: 'Drama B',  overview: 'Emotional',    rating: 9.0, genres: 'Drama',  embedding: [0.7, 0.3, 0] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  // Query contém "action" — deve boostar Action A
  const results = await findSimilar([1, 0, 0], 'action movie', 2, tmpFile)

  assert.equal(results[0].title, 'Action A', 'Action A deve ser o primeiro com genre boost')
})
