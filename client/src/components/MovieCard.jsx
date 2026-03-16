import { useState } from 'react'

export default function MovieCard({ movie, rank }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[#e5c100] cursor-default">
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
          <span className="text-[#e5c100] text-xs font-semibold">⭐ {movie.rating?.toFixed(1)}</span>
          <span className="text-xs text-[#555] bg-[#1f1f1f] px-2 py-0.5 rounded-full">
            {movie.score?.toFixed(2)}
          </span>
        </div>
        {/* Score bar */}
        <div className="mt-2 bg-[#1f1f1f] rounded h-0.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#e5c100] to-[#f0ce00] rounded"
            style={{ width: `${(movie.score || 0) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
