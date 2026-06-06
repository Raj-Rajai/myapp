import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="not-found-page" id="not-found">
      <div className="not-found-content">
        <span className="not-found-icon">⚽</span>
        <h1>404</h1>
        <h2>Player Not Found</h2>
        <p>Looks like this page has been transferred to another club!</p>
        <Link to="/" className="btn-primary" id="back-home-btn">Back to Home</Link>
      </div>
    </div>
  );
}

export default NotFound;
