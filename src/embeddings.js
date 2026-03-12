import { pipeline } from '@huggingface/transformers'

// Instância singleton do modelo — carregado uma única vez por processo
let extractor = null

async function getExtractor() {
  if (!extractor) {
    console.log('⏳ Carregando modelo (primeira vez ~2 min)...')
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return extractor
}

/**
 * Gera um embedding semântico para o texto fornecido.
 * Retorna um array de 384 números (float32[]).
 */
export async function embed(text) {
  const model = await getExtractor()
  const output = await model(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}
