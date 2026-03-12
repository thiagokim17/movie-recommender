import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findSimilar } from '../scripts/recommend.js'

test('retorna top K filmes ordenados por similaridade', async (t) => {
  const store = [
    { id: 1, title: 'Sci-Fi A', overview: 'Space exploration', embedding: [1, 0, 0] },
    { id: 2, title: 'Sci-Fi B', overview: 'Wormhole travel', embedding: [0.9, 0.1, 0] },
    { id: 3, title: 'Romance', overview: 'Love story', embedding: [0, 0, 1] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  // Query embedding similar a Sci-Fi (vetor próximo de [1, 0, 0])
  const results = await findSimilar([1, 0, 0], 2, tmpFile)

  assert.equal(results.length, 2)
  assert.equal(results[0].title, 'Sci-Fi A')
  assert.equal(results[1].title, 'Sci-Fi B')
  assert.ok(results[0].score > results[1].score, 'primeiro resultado deve ter score maior')
})

test('score está entre -1 e 1', async (t) => {
  const store = [
    { id: 1, title: 'Movie', overview: 'Overview', embedding: [0.5, 0.5, 0] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  const results = await findSimilar([1, 0, 0], 1, tmpFile)

  assert.ok(results[0].score >= -1 && results[0].score <= 1)
})

test('resultado contém id, title, overview e score', async (t) => {
  const store = [
    { id: 42, title: 'Test Movie', overview: 'Test overview', embedding: [1, 0] },
  ]

  const tmpFile = join(tmpdir(), `test-store-${Date.now()}.json`)
  await writeFile(tmpFile, JSON.stringify(store))
  t.after(() => unlink(tmpFile))

  const results = await findSimilar([1, 0], 1, tmpFile)

  assert.ok('id' in results[0])
  assert.ok('title' in results[0])
  assert.ok('overview' in results[0])
  assert.ok('score' in results[0])
})
