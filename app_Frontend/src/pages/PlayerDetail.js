import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

const FALLBACK_PLAYER = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&q=80';

function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const res = await api.get(`/api/players/${id}`);
        setPlayer(res.data);
      } catch (err) {
        console.error('Error fetching player:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayer();
  }, [id]);

  const handleImageError = (e) => {
    e.target.src = FALLBACK_PLAYER;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading player details...</p>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="not-found-page">
        <div className="not-found-content">
          <span className="not-found-icon">⚽</span>
          <h1>404</h1>
          <h2>Player Not Found</h2>
          <p>The player you're looking for doesn't exist or has been removed.</p>
          <Link to="/market" className="btn-primary">Back to Player Market</Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(player.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="detail-page" id="player-detail">
      <button className="back-btn" onClick={() => navigate(-1)} id="back-btn">
        ← Back
      </button>

      <div className="detail-card">
        <div className="detail-image">
          <img
            src={player.imageUrl || FALLBACK_PLAYER}
            alt={player.playerName}
            onError={handleImageError}
          />
          <span className="detail-position-badge">{player.position}</span>
        </div>

        <div className="detail-info">
          <h1>{player.playerName}</h1>
          <p className="detail-club">{player.club}</p>

          <div className="detail-stats">
            <div className="stat-item">
              <span className="stat-label">Age</span>
              <span className="stat-value">{player.age}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Position</span>
              <span className="stat-value">{player.position}</span>
            </div>
            <div className="stat-item highlight">
              <span className="stat-label">Transfer Value</span>
              <span className="stat-value">€{player.transferValue}</span>
            </div>
          </div>

          <div className="detail-meta">
            <div className="meta-item">
              <span className="meta-label">Added By</span>
              <span className="meta-value">{player.createdBy?.username || 'Unknown'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Date Added</span>
              <span className="meta-value">{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerDetail;
