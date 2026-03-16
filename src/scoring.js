/**
 * Score combinado: similaridade semântica + nota IMDB + boost de gênero.
 * Fórmula: (similarity × 0.6) + (rating/10 × 0.3) + (genreBoost × 0.1)
 *
 * @param {number} similarity - Cosine similarity entre query e sinopse (0 a 1)
 * @param {number} rating     - Nota IMDB (ex: 8.6). Null/undefined tratado como 0.
 * @param {string} genres     - Gêneros do filme separados por vírgula (ex: "Action, Drama")
 * @param {string} query      - Texto da busca do usuário
 * @returns {{ total: number, similarity: number, ratingScore: number, genreBoost: number }}
 */
export function combinedScore(similarity, rating, genres, query) {
  const ratingScore = (rating || 0) / 10
  const genreBoost = (genres || '').toLowerCase().split(',')
    .some(g => query.toLowerCase().includes(g.trim())) ? 1 : 0

  return {
    total: (similarity * 0.6) + (ratingScore * 0.3) + (genreBoost * 0.1),
    similarity,
    ratingScore,
    genreBoost,
  }
}
