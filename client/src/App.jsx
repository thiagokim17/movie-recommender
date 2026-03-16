import { useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import MovieGrid from './components/MovieGrid.jsx'

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastQuery, setLastQuery] = useState('')

  async function search(q) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setLastQuery(q)
    try {
      const res = await fetch(`/api/recommend?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Erro na busca')
      setResults(await res.json())
    } catch (e) {
      setError('Não foi possível buscar filmes. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#141414] to-[#0a0a0a] border-b border-[#1f1f1f] px-6 py-14 text-center">
        <div className="text-4xl mb-3">🎬</div>
        <h1 className="text-2xl font-extrabold tracking-[4px] text-[#e5c100] uppercase mb-2">
          Movie Finder
        </h1>
        <p className="text-[#666] text-sm tracking-wide mb-8">
          Descubra filmes pelo significado — não por palavras-chave
        </p>
        <SearchBar query={query} setQuery={setQuery} onSearch={search} loading={loading} />
        {error && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}
      </div>

      {/* Results */}
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {loading && (
          <div className="text-center py-16">
            <div className="w-9 h-9 border-3 border-[#1f1f1f] border-t-[#e5c100] rounded-full mx-auto mb-4 animate-spin" />
            <p className="text-[#555] text-sm">Buscando filmes...</p>
          </div>
        )}
        {!loading && results.length > 0 && (
          <>
            <p className="text-[#555] text-xs tracking-[2px] uppercase mb-6">
              {results.length} resultados para <span className="text-[#e5c100]">"{lastQuery}"</span>
            </p>
            <MovieGrid results={results} />
          </>
        )}
      </div>
    </div>
  )
}
