import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Header() {
  const { isAuthenticated, user, logout, getInitials } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header className="navbar" id="main-navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMobile}>
          <span className="brand-icon">⚽</span>
          <span className="brand-text">Football News Hub</span>
        </Link>

        <button
          className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          id="hamburger-btn"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`navbar-nav ${mobileMenuOpen ? 'open' : ''}`}>
          <Link to="/" className="nav-link" id="nav-home" onClick={closeMobile}>Home</Link>
          <Link to="/market" className="nav-link" id="nav-market" onClick={closeMobile}>Player Market</Link>
          {isAuthenticated && (
            <Link to="/add-player" className="nav-link" id="nav-add-player" onClick={closeMobile}>Add Player</Link>
          )}

          {isAuthenticated ? (
            <div className="nav-user" id="nav-user-menu">
              <button
                className="user-avatar"
                onClick={() => setShowDropdown(!showDropdown)}
                id="user-avatar-btn"
              >
                {getInitials()}
              </button>
              {showDropdown && (
                <div className="user-dropdown">
                  <p className="dropdown-username">{user?.username}</p>
                  <p className="dropdown-email">{user?.email}</p>
                  <hr className="dropdown-divider" />
                  <button onClick={handleLogout} className="dropdown-logout" id="logout-btn">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-auth">
              <Link to="/login" className="nav-link auth-link" id="nav-login" onClick={closeMobile}>Login</Link>
              <Link to="/signup" className="btn-signup" id="nav-signup" onClick={closeMobile}>Sign Up</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;