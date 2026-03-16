import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, unlink, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createJsonVectorStore } from '../../src/vectorStore/json.js'

// Stub de embed: vetores simples que representam "espaço" vs "romance"
const spaceEmbed = async () => [1, 0, 0]
const romanceEmbed = async () => [0, 0, 1]

function makeTmpPath() {
  return join(tmpdir(), `vs-test-${Date.now()}.json`)
}

test('save persiste os filmes com embeddings no arquivo JSON', async (t) => {
  const path = makeTmpPath()
  t.after(() => unlink(path).catch(() => {}))

  const movies = [
    { id: 1, title: 'Gravity', overview: 'Two astronauts in space', rating: 7.7, genres: 'Sci-Fi' },
  ]

  const store = createJsonVectorStore(path, spaceEmbed)
  await store.save(movies)

  const saved = JSON.parse(await readFile(path, 'utf-8'))
  assert.equal(saved.length, 1)
  assert.equal(saved[0].title, 'Gravity')
  assert.deepEqual(saved[0].embedding, [1, 0, 0])
})

test('similaritySearch retorna os K filmes mais similares ordenados por score', async (t) => {
  const path = makeTmpPath()
  t.after(() => unlink(path).catch(() => {}))

  const movies = [
    { id: 1, title: 'Gravity', overview: 'Astronauts in space', rating: 7.7, genres: 'Sci-Fi', embedding: [1, 0, 0] },
    { id: 2, title: 'The Notebook', overview: 'A love story', rating: 7.9, genres: 'Romance', embedding: [0, 0, 1] },
    { id: 3, title: 'Interstellar', overview: 'Space wormhole', rating: 8.6, genres: 'Sci-Fi', embedding: [0.95, 0.05, 0] },
  ]
  await writeFile(path, JSON.stringify(movies))

  // query embedding próximo de "espaço" → deve retornar Gravity e Interstellar
  const store = createJsonVectorStore(path, spaceEmbed)
  const results = await store.similaritySearch('space adventure', 2)

  assert.equal(results.length, 2)
  // Gravity e Interstellar são mais similares ao vetor [1,0,0]
  const titles = results.map((r) => r.title)
  assert.ok(titles.includes('Gravity'), 'deve incluir Gravity')
  assert.ok(titles.includes('Interstellar'), 'deve incluir Interstellar')
  assert.ok(results[0].score >= results[1].score, 'resultados devem estar ordenados por score')
})

test('similaritySearch resultado contém os campos esperados', async (t) => {
  const path = makeTmpPath()
  t.after(() => unlink(path).catch(() => {}))

  const movies = [
    { id: 42, title: 'Test Movie', overview: 'Test overview', rating: 8.0, genres: 'Drama', poster_link: 'https://example.com/poster.jpg', embedding: [1, 0] },
  ]
  await writeFile(path, JSON.stringify(movies))

  const store = createJsonVectorStore(path, async () => [1, 0])
  const results = await store.similaritySearch('test query', 1)

  assert.ok('id' in results[0], 'deve ter id')
  assert.ok('title' in results[0], 'deve ter title')
  assert.ok('overview' in results[0], 'deve ter overview')
  assert.ok('rating' in results[0], 'deve ter rating')
  assert.ok('genres' in results[0], 'deve ter genres')
  assert.ok('poster_link' in results[0], 'deve ter poster_link')
  assert.ok('score' in results[0], 'deve ter score')
  assert.ok('score_breakdown' in results[0], 'deve ter score_breakdown')
  assert.ok('similarity' in results[0].score_breakdown, 'deve ter similarity')
  assert.ok('ratingScore' in results[0].score_breakdown, 'deve ter ratingScore')
  assert.ok('genreBoost' in results[0].score_breakdown, 'deve ter genreBoost')
})

test('similaritySearch score está entre 0 e 1', async (t) => {
  const path = makeTmpPath()
  t.after(() => unlink(path).catch(() => {}))

  const movies = [
    { id: 1, title: 'Movie', overview: 'Overview', rating: 7.0, genres: 'Action', embedding: [0.5, 0.5, 0] },
  ]
  await writeFile(path, JSON.stringify(movies))

  const store = createJsonVectorStore(path, async () => [1, 0, 0])
  const results = await store.similaritySearch('query', 1)

  assert.ok(results[0].score >= 0 && results[0].score <= 1, `score fora do range: ${results[0].score}`)
})
