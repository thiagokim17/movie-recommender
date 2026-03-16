import MovieCard from './MovieCard.jsx'

export default function MovieGrid({ results }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {results.map((movie, i) => (
        <MovieCard key={movie.id} movie={movie} rank={i + 1} />
      ))}
    </div>
  )
}
