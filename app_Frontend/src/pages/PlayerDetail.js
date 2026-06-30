import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import defaultPlayerImage from '../assets/Default_Player_Image.png';

const FALLBACK_PLAYER = defaultPlayerImage;

// SVG Radar Chart Component
function RadarChart({ ratings }) {
  const attributes = ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defending', 'Physical'];
  const values = [
    ratings?.pace || 50,
    ratings?.shooting || 50,
    ratings?.passing || 50,
    ratings?.dribbling || 50,
    ratings?.defending || 50,
    ratings?.physical || 50
  ];

  const cx = 150, cy = 150, maxR = 110;
  const angleStep = (2 * Math.PI) / 6;
  const startAngle = -Math.PI / 2;

  const getPoint = (index, value) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 99) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  };

  // Background grid rings
  const rings = [20, 40, 60, 80, 99];

  return (
    <svg viewBox="0 0 300 300" className="radar-chart">
      {/* Grid rings */}
      {rings.map(ring => {
        const points = Array.from({ length: 6 }, (_, i) => {
          const p = getPoint(i, ring);
          return `${p.x},${p.y}`;
        }).join(' ');
        return <polygon key={ring} points={points} className="radar-ring" />;
      })}

      {/* Axis lines */}
      {Array.from({ length: 6 }, (_, i) => {
        const p = getPoint(i, 99);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} className="radar-axis" />;
      })}

      {/* Data polygon */}
      <polygon
        points={values.map((v, i) => {
          const p = getPoint(i, v);
          return `${p.x},${p.y}`;
        }).join(' ')}
        className="radar-data"
      />

      {/* Data points */}
      {values.map((v, i) => {
        const p = getPoint(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r="4" className="radar-point" />;
      })}

      {/* Labels */}
      {attributes.map((label, i) => {
        const p = getPoint(i, 130);
        return (
          <text key={i} x={p.x} y={p.y} className="radar-label" textAnchor="middle" dominantBaseline="middle">
            {label}
          </text>
        );
      })}

      {/* Value labels */}
      {values.map((v, i) => {
        const p = getPoint(i, v + 14);
        return (
          <text key={`v${i}`} x={p.x} y={p.y} className="radar-value" textAnchor="middle" dominantBaseline="middle">
            {v}
          </text>
        );
      })}
    </svg>
  );
}

// Circular Progress for suitability score
function CircularProgress({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="circular-progress">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} className="progress-bg" />
        <circle
          cx="60" cy="60" r={radius}
          className="progress-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-text">
        <span className="progress-number">{score}</span>
        <span className="progress-label">%</span>
      </div>
    </div>
  );
}

function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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

  const handleImageError = (e) => { e.target.src = FALLBACK_PLAYER; };

  const handleRegenerate = async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      const res = await api.put(`/api/players/${id}/regenerate`);
      setPlayer(res.data);
    } catch (err) {
      console.error('Error regenerating player:', err);
      alert('Failed to regenerate. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading player intelligence...</p>
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

  const scout = player.aiScoutReport || {};
  const transfer = player.aiTransferAnalysis || {};
  const stats = player.statistics || {};
  const personal = player.personal || {};
  const club = player.currentClub || {};
  const market = player.market || {};

  return (
    <div className="player-detail-page" id="player-detail">
      <div className="pd-top-bar">
        <button className="back-btn" onClick={() => navigate(-1)} id="back-btn">← Back</button>
        <button
          className={`regenerate-btn ${regenerating ? 'regenerating' : ''}`}
          onClick={handleRegenerate}
          disabled={regenerating}
          id="regenerate-btn"
        >
          {regenerating ? (
            <><span className="regen-spinner"></span> Regenerating...</>
          ) : (
            <>🔄 Regenerate Data</>
          )}
        </button>
      </div>

      {/* === SECTION 1: PLAYER PROFILE HEADER === */}
      <section className="pd-hero">
        <div className="pd-hero-image">
          <img src={player.imageUrl || FALLBACK_PLAYER} alt={player.playerName} onError={handleImageError} />
        </div>
        <div className="pd-hero-info">
          <h1>{player.playerName}</h1>
          <p className="pd-nationality">{player.nationality}</p>
          <div className="pd-tags">
            {club.clubName && <span className="pd-tag pd-tag-club">{club.clubName}</span>}
            {club.league && <span className="pd-tag pd-tag-league">{club.league}</span>}
            {player.isDeceased && <span className="pd-tag pd-tag-deceased">✝ Deceased ({player.deathYear})</span>}
            {player.isRetired && !player.isDeceased && <span className="pd-tag pd-tag-retired">🏁 Retired</span>}
          </div>
          <div className="pd-quick-stats">
            {personal.age > 0 && <div className="pd-qs"><span className="pd-qs-label">{player.isDeceased ? 'Died at Age' : 'Age'}</span><span className="pd-qs-value">{personal.age}</span></div>}
            {personal.height && <div className="pd-qs"><span className="pd-qs-label">Height</span><span className="pd-qs-value">{personal.height}</span></div>}
            {personal.weight && <div className="pd-qs"><span className="pd-qs-label">Weight</span><span className="pd-qs-value">{personal.weight}</span></div>}
            {personal.preferredFoot && <div className="pd-qs"><span className="pd-qs-label">Foot</span><span className="pd-qs-value">{personal.preferredFoot}</span></div>}
          </div>
          <div className="pd-value-box">
            <span className="pd-value-label">{player.isRetired ? 'Status' : 'Market Value'}</span>
            <span className="pd-value-amount">{market.transferValue || '—'}</span>
          </div>
          <div className="pd-meta-row">
            <span>Added by <strong>{player.createdBy?.username || 'Unknown'}</strong></span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </section>

      <div className="pd-grid">
        <section className="pd-section pd-radar-section">
          <h2 className="pd-section-title">📊 Player Ratings</h2>
          <RadarChart ratings={player.ratings} />
          <div className="pd-overall-rating">
            {player.ovrData?.overallRating || Math.round(
              ((player.ratings?.pace || 50) + (player.ratings?.shooting || 50) +
               (player.ratings?.passing || 50) + (player.ratings?.dribbling || 50) +
               (player.ratings?.defending || 50) + (player.ratings?.physical || 50)) / 6
            )}
            <span>OVR</span>
          </div>
          {player.ovrData?.bestPosition && (
            <div className="pd-best-position">
              <span className="pd-bp-badge">{player.ovrData.bestPosition}</span>
            </div>
          )}
        </section>

        {/* === SECTION 3: STATISTICS === */}
        <section className="pd-section pd-stats-section">
          <h2 className="pd-section-title">⚽ Statistics</h2>
          <div className="pd-stat-grid">
            <div className="pd-stat"><span className="pd-stat-num">{stats.appearances || 0}</span><span className="pd-stat-label">Appearances</span></div>
            <div className="pd-stat"><span className="pd-stat-num">{stats.goals || 0}</span><span className="pd-stat-label">Goals</span></div>
            <div className="pd-stat"><span className="pd-stat-num">{stats.assists || 0}</span><span className="pd-stat-label">Assists</span></div>
            <div className="pd-stat"><span className="pd-stat-num">{stats.yellowCards || 0}</span><span className="pd-stat-label">Yellow Cards</span></div>
            <div className="pd-stat"><span className="pd-stat-num">{stats.redCards || 0}</span><span className="pd-stat-label">Red Cards</span></div>
            <div className="pd-stat"><span className="pd-stat-num">{stats.internationalCaps || 0}</span><span className="pd-stat-label">Int'l Caps</span></div>
          </div>
        </section>

        {/* === SECTION 4: ACHIEVEMENTS === */}
        {player.achievements?.length > 0 && (
          <section className="pd-section pd-achievements-section">
            <h2 className="pd-section-title">🏆 Achievements</h2>
            <div className="pd-achievement-list">
              {player.achievements.map((a, i) => (
                <div key={i} className="pd-achievement-item">
                  <span className="pd-trophy-icon">🏆</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* === SECTION 5: CAREER TIMELINE === */}
        {player.previousClubs?.length > 0 && (
          <section className="pd-section pd-timeline-section">
            <h2 className="pd-section-title">📋 Career Timeline</h2>
            <div className="pd-timeline">
              {player.previousClubs.map((club, i) => (
                <div key={i} className="pd-timeline-item">
                  <div className="pd-timeline-dot"></div>
                  <div className="pd-timeline-content">
                    <span className="pd-timeline-club">{club.clubName}</span>
                    <span className="pd-timeline-date">
                      {club.from || ''}
                      {club.to ? ` → ${club.to}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* === SECTION 6: AI SCOUT REPORT === */}
        {scout.playingStyle && (
          <section className="pd-section pd-scout-section">
            <h2 className="pd-section-title">🤖 AI Scout Report</h2>

            <div className="pd-scout-style">
              <span className="pd-scout-style-label">Playing Style</span>
              <span className="pd-scout-style-value">{scout.playingStyle}</span>
            </div>

            <div className="pd-scout-row">
              {scout.strengths?.length > 0 && (
                <div className="pd-scout-col">
                  <h4 className="pd-scout-h4 pd-green">Strengths</h4>
                  {scout.strengths.map((s, i) => (
                    <div key={i} className="pd-scout-tag pd-tag-green">✓ {s}</div>
                  ))}
                </div>
              )}
              {scout.weaknesses?.length > 0 && (
                <div className="pd-scout-col">
                  <h4 className="pd-scout-h4 pd-red">Weaknesses</h4>
                  {scout.weaknesses.map((w, i) => (
                    <div key={i} className="pd-scout-tag pd-tag-red">✗ {w}</div>
                  ))}
                </div>
              )}
            </div>

            {scout.tacticalSystems?.length > 0 && (
              <div className="pd-scout-systems">
                <h4>Best Systems</h4>
                <div className="pd-system-tags">
                  {scout.tacticalSystems.map((s, i) => (
                    <span key={i} className="pd-system-tag">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="pd-scout-meta-grid">
              {scout.leadership && <div className="pd-scout-meta"><span className="pd-sm-label">Leadership</span><span className="pd-sm-value">{scout.leadership}</span></div>}
              {scout.careerStage && <div className="pd-scout-meta"><span className="pd-sm-label">Career Stage</span><span className="pd-sm-value">{scout.careerStage}</span></div>}
              {scout.transferRisk && <div className="pd-scout-meta"><span className="pd-sm-label">Transfer Risk</span><span className="pd-sm-value">{scout.transferRisk}</span></div>}
            </div>
          </section>
        )}

        {/* === SECTION 7: AI TRANSFER ANALYSIS === */}
        {transfer && transfer.suitabilityScore > 0 && !player.isRetired && !player.isDeceased && (
          <section className="pd-section pd-transfer-section">
            <h2 className="pd-section-title">📈 AI Transfer Analysis</h2>

            <div className="pd-transfer-top">
              <CircularProgress score={transfer.suitabilityScore || 0} />
              <div className="pd-transfer-label">
                <span>Transfer Suitability</span>
                <span className="pd-transfer-score">{transfer.suitabilityScore}%</span>
              </div>
            </div>

            {transfer.recommendedClubs?.length > 0 && (
              <div className="pd-recommended">
                <h4>Recommended Clubs</h4>
                <div className="pd-club-list">
                  {transfer.recommendedClubs.map((c, i) => (
                    <div key={i} className="pd-club-item">
                      <span className="pd-club-rank">#{i + 1}</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pd-transfer-meta-grid">
              {transfer.financialRisk && <div className="pd-scout-meta"><span className="pd-sm-label">Financial Risk</span><span className="pd-sm-value">{transfer.financialRisk}</span></div>}
              {transfer.tacticalFit && <div className="pd-scout-meta"><span className="pd-sm-label">Tactical Fit</span><span className="pd-sm-value">{transfer.tacticalFit}</span></div>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default PlayerDetail;
