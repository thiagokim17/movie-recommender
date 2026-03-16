export default function SearchBar({ query, setQuery, onSearch, loading }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter') onSearch(query)
  }

  return (
    <div className="flex max-w-[560px] w-full mx-auto rounded-lg overflow-hidden shadow-[0_4px_24px_rgba(229,193,0,0.12)]">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ex: romantic comedy, psychological thriller..."
        disabled={loading}
        className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] border-r-0 rounded-l-lg px-5 py-3.5 text-white placeholder-[#555] outline-none focus:border-[#e5c100] disabled:opacity-50 transition-colors"
      />
      <button
        onClick={() => onSearch(query)}
        disabled={loading || !query.trim()}
        className="bg-[#e5c100] hover:bg-[#f0ce00] px-7 py-3.5 text-black text-sm font-bold tracking-wide rounded-r-lg disabled:opacity-50 transition-colors cursor-pointer"
      >
        BUSCAR
      </button>
    </div>
  )
}
