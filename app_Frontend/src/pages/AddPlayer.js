import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const PROGRESS_STEPS = [
  { icon: '🔍', text: 'Searching football databases...' },
  { icon: '📊', text: 'Fetching player statistics...' },
  { icon: '🔄', text: 'Loading transfer history...' },
  { icon: '🏆', text: 'Retrieving achievements...' },
  { icon: '🤖', text: 'Generating AI scouting analysis...' },
  { icon: '📈', text: 'Building transfer intelligence...' },
  { icon: '✅', text: 'Assembling player profile...' }
];

function AddPlayer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    playerName: '',
    nationality: '',
    imageUrl: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { playerName, nationality } = formData;
    if (!playerName || !nationality) {
      setError('Player name and nationality are required.');
      return;
    }

    setLoading(true);
    setCurrentStep(0);

    // Animate progress steps
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= PROGRESS_STEPS.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);

    try {
      const res = await api.post('/api/players', formData);
      clearInterval(stepInterval);
      setCurrentStep(PROGRESS_STEPS.length - 1);

      // Brief success state then redirect
      setTimeout(() => {
        navigate(`/player/${res.data._id}`);
      }, 800);
    } catch (err) {
      clearInterval(stepInterval);
      setLoading(false);

      if (err.response?.status === 409) {
        // Player already exists — redirect to their page
        const playerId = err.response.data.playerId;
        if (playerId) {
          setError('This player already exists! Redirecting...');
          setTimeout(() => navigate(`/player/${playerId}`), 1500);
          return;
        }
      }
      setError(err.response?.data?.message || 'Error generating player profile. Please try again.');
    }
  };

  return (
    <div className="form-page" id="add-player-page">
      <div className="form-card ai-form-card">
        {!loading ? (
          <>
            <div className="form-header">
              <span className="form-icon">🤖</span>
              <h1>AI Player Intelligence</h1>
              <p>Enter a player's name and nationality — our AI engine will automatically fetch their complete profile, stats, and scouting analysis.</p>
            </div>

            {error && (
              <div className="alert alert-error" id="error-alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} id="add-player-form">
              <div className="form-group">
                <label htmlFor="playerName">Player Full Name</label>
                <input
                  type="text"
                  id="playerName"
                  name="playerName"
                  placeholder="e.g. Cristiano Ronaldo"
                  value={formData.playerName}
                  onChange={handleChange}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="nationality">Nationality</label>
                <input
                  type="text"
                  id="nationality"
                  name="nationality"
                  placeholder="e.g. Portugal"
                  value={formData.nationality}
                  onChange={handleChange}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="imageUrl">Image URL <span className="optional">(optional)</span></label>
                <input
                  type="url"
                  id="imageUrl"
                  name="imageUrl"
                  placeholder="https://example.com/player.jpg"
                  value={formData.imageUrl}
                  onChange={handleChange}
                />
              </div>

              <button type="submit" className="btn-submit btn-ai-generate" id="submit-player-btn">
                <span className="btn-icon">⚡</span>
                Generate Player Profile
              </button>
            </form>

            <div className="ai-info-banner">
              <span>💡</span>
              <p>Our AI fetches data from multiple football databases, generates FIFA-style ratings, and creates scouting & transfer analysis reports.</p>
            </div>
          </>
        ) : (
          <div className="ai-loading-state">
            <div className="ai-loading-header">
              <div className="ai-pulse-ring"></div>
              <h2>Generating Profile</h2>
              <p className="ai-loading-player">{formData.playerName}</p>
            </div>

            <div className="ai-progress-steps">
              {PROGRESS_STEPS.map((step, index) => (
                <div
                  key={index}
                  className={`ai-step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
                >
                  <span className="ai-step-icon">
                    {index < currentStep ? '✅' : step.icon}
                  </span>
                  <span className="ai-step-text">{step.text}</span>
                  {index === currentStep && <span className="ai-step-spinner"></span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddPlayer;
