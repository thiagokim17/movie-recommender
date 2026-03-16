import express from 'express'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { getVectorStore } from './src/vectorStore/index.js'

const app = express()
const PORT = process.env.PORT || 3001
const __dirname = dirname(fileURLToPath(import.meta.url))

// Inicializa o vector store uma única vez ao subir o servidor
const vectorStore = await getVectorStore()

// Servir o build do React em produção
app.use(express.static(join(__dirname, 'client/dist')))

app.get('/api/recommend', async (req, res) => {
  const q = req.query.q?.trim()
  if (!q) return res.status(400).json({ error: "Parâmetro 'q' é obrigatório" })
  try {
    const results = await vectorStore.similaritySearch(q)
    res.json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro interno ao buscar recomendações' })
  }
})

// Fallback SPA — só funciona após npm run build
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, 'client/dist/index.html'))
})

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
