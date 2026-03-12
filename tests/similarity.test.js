import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cosineSimilarity } from '../src/similarity.js'

test('vetores idênticos têm score 1.0', () => {
  const v = [1, 0, 0]
  assert.ok(Math.abs(cosineSimilarity(v, v) - 1) < 1e-10)
})

test('vetores ortogonais têm score 0.0', () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0)
})

test('vetores opostos têm score -1.0', () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [-1, 0]) - (-1)) < 1e-10)
})

test('retorna 0 para vetor nulo', () => {
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0)
})

test('calcula corretamente para vetores arbitrários', () => {
  const a = [1, 2, 3]
  const b = [4, 5, 6]
  // dot = 32, normA = sqrt(14), normB = sqrt(77)
  const expected = 32 / (Math.sqrt(14) * Math.sqrt(77))
  assert.ok(Math.abs(cosineSimilarity(a, b) - expected) < 1e-10)
})
