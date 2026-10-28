const PALETTE = ['#7a1f3d', '#1f4d5c', '#4a3a78', '#8a5a1c', '#2f5d3a', '#6b2d2d'];

// uploaded image if the movie has one, otherwise a generated colour poster
export default function Poster({ movie }) {
  if (movie.poster) return <img className="im-poster im-poster-img" src={movie.poster} alt={`${movie.title} poster`} />;
  const hash = [...movie.title].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <div className="im-poster" style={{ background: `linear-gradient(160deg, ${PALETTE[hash % PALETTE.length]}, #14121a 90%)` }}>
      <span className="im-poster-genre">{movie.genre}</span>
      <span className="im-poster-title">{movie.title}</span>
    </div>
  );
}
