import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import defaultPlayerImage from '../assets/Default_Player_Image.png';

const FALLBACK_PLAYER = defaultPlayerImage;

function PlayerMarket() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  const fetchPlayers = useCallback(async (search = '') => {
    try {
      setLoading(true);
      const url = search ? `/api/players?search=${encodeURIComponent(search)}` : '/api/players';
      const res = await api.get(url);
      setPlayers(res.data);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      fetchPlayers(value);
    }, 400);
    setSearchTimeout(timeout);
  };

  const handleImageError = (e) => {
    e.target.src = FALLBACK_PLAYER;
  };

  return (
    <div className="market-page">
      <section className="market-header" id="market-header">
        <h1>Player Market</h1>
        <p>Browse and discover football players from around the world</p>
        <div className="search-container" id="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by player name or club..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
            id="search-input"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => { setSearchTerm(''); fetchPlayers(); }}>✕</button>
          )}
        </div>
      </section>

      <section className="player-market-grid" id="player-grid">
        {loading ? (
          <div className="player-grid">
            {[...Array(6)].map((_, i) => (
              <div className="player-card skeleton" key={i}>
                <div className="skeleton-image"></div>
                <div className="skeleton-content">
                  <div className="skeleton-line wide"></div>
                  <div className="skeleton-line medium"></div>
                </div>
              </div>
            ))}
          </div>
        ) : players.length > 0 ? (
          <div className="player-grid">
            {players.map((player) => (
              <Link to={`/player/${player._id}`} className="player-card" key={player._id} id={`player-${player._id}`}>
                <div className="player-card-image">
                  <img
                    src={player.imageUrl || FALLBACK_PLAYER}
                    alt={player.playerName}
                    onError={handleImageError}
                    loading="lazy"
                  />
                  <span className="position-badge">{player.position}</span>
                </div>
                <div className="player-card-body">
                  <h3>{player.playerName}</h3>
                  <p className="player-club">{player.club}</p>
                  <div className="player-meta">
                    <span className="player-age">Age: {player.age}</span>
                    <span className="player-value">€{player.transferValue}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">⚽</span>
            <h3>{searchTerm ? 'No players found' : 'No players yet'}</h3>
            <p>{searchTerm ? `No results for "${searchTerm}"` : 'Be the first to add a player to the market!'}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default PlayerMarket;
