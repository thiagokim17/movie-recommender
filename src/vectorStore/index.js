import { createJsonVectorStore } from './json.js'

/**
 * Retorna a implementação de vector store conforme a variável de ambiente VECTOR_STORE.
 * Valores: 'json' (padrão) | 'neo4j'
 *
 * É async para permitir dynamic import do neo4j.js (que tem dependências pesadas)
 * sem quebrar o carregamento do módulo quando VECTOR_STORE=json.
 */
export async function getVectorStore() {
  const type = process.env.VECTOR_STORE || 'json'

  if (type === 'neo4j') {
    const { createNeo4jVectorStore } = await import('./neo4j.js')
    return createNeo4jVectorStore()
  }

  return createJsonVectorStore()
}
