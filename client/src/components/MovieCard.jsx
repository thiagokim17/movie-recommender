import { useState } from 'react'

export default function MovieCard({ movie, rank }) {
  const [imgError, setImgError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const hasBreakdown = !!movie.score_breakdown

  return (
    <div
      className={`bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[#e5c100] ${hasBreakdown ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={() => hasBreakdown && setExpanded(prev => !prev)}
    >
      {/* Poster */}
      <div className="relative">
        {!imgError && movie.poster_link ? (
          <img
            src={movie.poster_link}
            alt={movie.title}
            onError={() => setImgError(true)}
            className="w-full aspect-[2/3] object-cover block"
          />
        ) : (
          <div className="w-full aspect-[2/3] bg-gradient-to-br from-[#1a1a1a] to-[#222] flex items-center justify-center text-4xl">
            🎬
          </div>
        )}
        {/* Rank badge */}
        <div className="absolute top-2 left-2 bg-black/75 text-[#e5c100] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-[#e5c100]">
          {rank}
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="text-sm font-semibold text-[#eee] mb-1 truncate" title={movie.title}>
          {movie.title}
        </div>
        <div className="text-xs text-[#666] mb-2 truncate">{movie.genres}</div>
        <div className="flex justify-between items-center">
          <span className="text-[#e5c100] text-xs font-semibold">⭐ {(movie.rating || 0).toFixed(1)}</span>
          <span className="text-xs text-[#555] bg-[#1f1f1f] px-2 py-0.5 rounded-full">
            {(movie.score || 0).toFixed(2)}
          </span>
        </div>
        {/* Score bar */}
        <div className="mt-2 bg-[#1f1f1f] rounded h-0.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e5c100] to-[#f0ce00] rounded"
            style={{ width: `${(movie.score || 0) * 100}%` }}
          />
        </div>

        {/* Score breakdown — expandido ao clicar */}
        {expanded && movie.score_breakdown && (
          <div className="border-t border-[#2a2a2a] pt-3 mt-3">
            <p className="text-[#e5c100] text-[0.6rem] uppercase tracking-widest font-bold mb-2">
              Como chegamos aqui
            </p>

            {/* Barra segmentada — proporções fixas dos pesos: 60% / 30% / 10% */}
            <div className="flex h-2 rounded overflow-hidden gap-px mb-3">
              <div className="flex-[6] bg-[#e5c100] rounded-l" />
              <div className="flex-[3] bg-[#f0a500]" />
              <div className={`flex-[1] rounded-r ${movie.score_breakdown.genreBoost ? 'bg-[#4ade80]' : 'bg-[#2a2a2a]'}`} />
            </div>

            {/* 3 colunas: Tema + Rating + Gênero */}
            <div className="flex justify-between text-center">
              <div>
                <div className="text-[0.55rem] text-[#888] mb-1">🧠 Tema</div>
                <div className="text-[0.65rem] text-[#e5c100] font-bold">
                  {(movie.score_breakdown.similarity * 0.6).toFixed(2)}
                </div>
                <div className="text-[0.5rem] text-[#555]">×0.6</div>
              </div>
              <div className="text-[#555] self-center text-sm">+</div>
              <div>
                <div className="text-[0.55rem] text-[#888] mb-1">⭐ Rating</div>
                <div className="text-[0.65rem] text-[#f0a500] font-bold">
                  {(movie.score_breakdown.ratingScore * 0.3).toFixed(2)}
                </div>
                <div className="text-[0.5rem] text-[#555]">×0.3</div>
              </div>
              <div className="text-[#555] self-center text-sm">+</div>
              <div>
                <div className="text-[0.55rem] text-[#888] mb-1">🎭 Gênero</div>
                <div className={`text-[0.65rem] font-bold ${movie.score_breakdown.genreBoost ? 'text-[#4ade80]' : 'text-[#555]'}`}>
                  {(movie.score_breakdown.genreBoost * 0.1).toFixed(2)}
                </div>
                <div className="text-[0.5rem] text-[#555]">×0.1</div>
              </div>
            </div>

            {/* Total */}
            <div className="text-center mt-2 pt-2 border-t border-[#2a2a2a]">
              <span className="text-[0.55rem] text-[#555]">= </span>
              <span className="text-[0.75rem] text-[#e5c100] font-bold">{(movie.score || 0).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Hint para clicar — só quando há breakdown e não está expandido */}
        {hasBreakdown && !expanded && (
          <p className="text-[0.55rem] text-[#444] text-center mt-2">toque para ver detalhes</p>
        )}
      </div>
    </div>
  )
}
