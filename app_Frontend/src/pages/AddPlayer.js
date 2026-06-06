import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function AddPlayer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    playerName: '',
    age: '',
    position: '',
    club: '',
    transferValue: '',
    imageUrl: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { playerName, age, position, club, transferValue } = formData;
    if (!playerName || !age || !position || !club || !transferValue) {
      setError('All fields except Image URL are required.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/players', formData);
      setSuccess(true);
      setTimeout(() => navigate('/market'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page" id="add-player-page">
      <div className="form-card">
        <div className="form-header">
          <span className="form-icon">⚽</span>
          <h1>Add Player</h1>
          <p>Add a new player to the transfer market</p>
        </div>

        {success && (
          <div className="alert alert-success" id="success-alert">
            ✅ Player added successfully! Redirecting...
          </div>
        )}
        {error && (
          <div className="alert alert-error" id="error-alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="add-player-form">
          <div className="form-group">
            <label htmlFor="playerName">Player Name</label>
            <input
              type="text"
              id="playerName"
              name="playerName"
              placeholder="e.g. Kylian Mbappé"
              value={formData.playerName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input
                type="number"
                id="age"
                name="age"
                placeholder="e.g. 26"
                value={formData.age}
                onChange={handleChange}
                min="15"
                max="50"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="position">Position</label>
              <input
                type="text"
                id="position"
                name="position"
                placeholder="e.g. LW, ST, CM"
                value={formData.position}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="club">Club</label>
            <input
              type="text"
              id="club"
              name="club"
              placeholder="e.g. Real Madrid"
              value={formData.club}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="transferValue">Transfer Value</label>
            <input
              type="text"
              id="transferValue"
              name="transferValue"
              placeholder="e.g. 180M"
              value={formData.transferValue}
              onChange={handleChange}
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

          <button type="submit" className="btn-submit" disabled={loading} id="submit-player-btn">
            {loading ? 'Adding Player...' : 'Add Player to Market'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddPlayer;
