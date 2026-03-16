import { test } from 'node:test'
import assert from 'node:assert/strict'
import { combinedScore } from '../src/scoring.js'

test('retorna objeto com total, similarity, ratingScore, genreBoost', () => {
  const result = combinedScore(0.9, 9.0, 'Action', 'action movie')
  assert.ok('total' in result)
  assert.ok('similarity' in result)
  assert.ok('ratingScore' in result)
  assert.ok('genreBoost' in result)
  assert.equal(result.similarity, 0.9)
  assert.equal(result.ratingScore, 0.9)
  assert.equal(result.genreBoost, 1)
})

test('combina similarity, rating e genre boost corretamente', () => {
  // 0.9*0.6 + (9.0/10)*0.3 + 1*0.1 = 0.54 + 0.27 + 0.10 = 0.91
  const result = combinedScore(0.9, 9.0, 'Action', 'action movie')
  assert.ok(Math.abs(result.total - 0.91) < 1e-10)
})

test('aplica genre boost quando query contém gênero do filme', () => {
  const comBoost = combinedScore(0.5, 8.0, 'Comedy, Romance', 'romantic comedy')
  const semBoost = combinedScore(0.5, 8.0, 'Drama', 'romantic comedy')
  assert.ok(comBoost.total > semBoost.total)
})

test('não aplica genre boost quando query não contém gênero', () => {
  // 0.5*0.6 + (8.0/10)*0.3 + 0*0.1 = 0.30 + 0.24 + 0.00 = 0.54
  const result = combinedScore(0.5, 8.0, 'Drama', 'space exploration')
  assert.ok(Math.abs(result.total - 0.54) < 1e-10)
})

test('rating nulo não causa erro e vale 0', () => {
  assert.doesNotThrow(() => combinedScore(0.5, null, 'Drama', 'drama'))
  const result = combinedScore(0.5, null, 'Drama', 'drama')
  assert.ok(result.total >= 0)
})

test('genres vazio não causa erro', () => {
  assert.doesNotThrow(() => combinedScore(0.5, 8.0, '', 'drama'))
})

test('score máximo possível é 1.0', () => {
  const result = combinedScore(1.0, 10.0, 'Action', 'action')
  assert.ok(Math.abs(result.total - 1.0) < 1e-10)
})
