import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";
import Auth from "./Auth";
import Showtimes from "./Showtimes";
import Seats from "./Seats";
import BookingConfirmation from "./BookingConfirmation";
import MyBookings from "./MyBookings";
import MyFavorites from "./MyFavorites";
import AdminDashboard from "./AdminDashboard";
import "./App.css";
import { HERO_SCREEN_IMAGES } from "./heroScreenImages";
import { applyTheme, getStoredTheme, THEME_STORAGE_KEY } from "./theme";

const API_URL = "http://localhost:5000";
const CURRENT_YEAR = new Date().getFullYear();
const FEEDBACK_MAX_LENGTH = 500;
const FEEDBACK_CATEGORIES = [
  "Overall experience",
  "Website design",
  "Movie catalogue",
  "Booking experience",
  "Suggestions",
];

function Home({ user, onLogout, theme, onToggleTheme }) {
  const [movies, setMovies] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [failedHeroImages, setFailedHeroImages] = useState(() => new Set());
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackPreview, setFeedbackPreview] = useState(0);
  const [feedbackCategory, setFeedbackCategory] = useState(FEEDBACK_CATEGORIES[0]);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");

  useEffect(() => {
    const preloadedImages = HERO_SCREEN_IMAGES.map((source, index) => {
      const image = new Image();
      image.src = source;
      image.onerror = () => {
        setFailedHeroImages((current) => {
          if (current.has(index)) return current;
          const next = new Set(current);
          next.add(index);
          return next;
        });
      };
      return image;
    });

    return () => {
      preloadedImages.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return undefined;

    const timer = window.setInterval(() => {
      setHeroImageIndex((current) => {
        for (let offset = 1; offset <= HERO_SCREEN_IMAGES.length; offset += 1) {
          const nextIndex = (current + offset) % HERO_SCREEN_IMAGES.length;
          if (!failedHeroImages.has(nextIndex)) return nextIndex;
        }
        return current;
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [failedHeroImages]);

  function handleHeroImageError(index) {
    setFailedHeroImages((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
    setHeroImageIndex((current) => {
      if (current !== index) return current;
      for (let offset = 1; offset <= HERO_SCREEN_IMAGES.length; offset += 1) {
        const nextIndex = (current + offset) % HERO_SCREEN_IMAGES.length;
        if (!failedHeroImages.has(nextIndex) && nextIndex !== index) return nextIndex;
      }
      return current;
    });
  }

  
  async function toggleFavorite(movieId) {
    if (!user) {
      navigate("/login");
      return;
    }

    const token = JSON.parse(
      sessionStorage.getItem("imoviesAuth")
    )?.token;

    if (!token) {
      setFavoriteError("Please log in again to manage favorites.");
      return;
    }

    const isFavorite = favoriteIds.includes(movieId);

    try {
      setFavoriteError("");

      const response = await fetch(
        `${API_URL}/api/favorites/${movieId}`,
        {
          method: isFavorite ? "DELETE" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update favorites.");
      }

      setFavoriteIds((current) =>
        isFavorite
          ? current.filter((id) => id !== movieId)
          : [...current, movieId]
      );
    } catch (error) {
      setFavoriteError(error.message);
    }
  }


  useEffect(() => {
    fetch(`${API_URL}/api/movies`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load movies");
        return response.json();
      })
      .then(setMovies)
      .catch(() => setError("Could not load movies. Check that the backend is running."))
      .finally(() => setLoading(false));
  }, []);

   
useEffect(() => {
  if (!user) {
    setFavoriteIds([]);
    return;
  }

  const token = JSON.parse(
    sessionStorage.getItem("imoviesAuth")
  )?.token;

  if (!token) {
    setFavoriteError("Please log in again to load your favorites.");
    return;
  }

  let cancelled = false;

  async function loadFavorites() {
    try {
      const response = await fetch(`${API_URL}/api/favorites/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load favorites.");
      }

      if (!cancelled) {
        setFavoriteIds(
          data.favorites.map((favorite) => favorite.movie?._id).filter(Boolean)
        );
      }
    } catch (error) {
      if (!cancelled) {
        setFavoriteError(error.message);
      }
    }
  }

  loadFavorites();

  return () => {
    cancelled = true;
  };
}, [user]);

return (
  <div className={`app theme-${theme}`}>
    <header className="navbar">
      <Link className="logo" to="/">
        <span className="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 4v10h2V7H8Zm4 0v10l7-5-7-5Z" />
          </svg>
        </span>
        <span className="logo-wordmark">i<span>MOVIES</span></span>
      </Link>

      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation menu"
        aria-expanded={menuOpen}
        >
         {menuOpen ? "✕" : "☰"}
      </button>

      <nav className={`desktop-nav ${menuOpen ? "menu-open" : ""}`}>
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#movies" onClick={() => setMenuOpen(false)}>Movies</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>

          {user && (
            <Link to="/my-bookings" onClick={() => setMenuOpen(false)}>
              My Bookings
            </Link>
          )}

          {user && (
            <Link to="/my-favorites" onClick={() => setMenuOpen(false)}>
              My Favorites
            </Link>
          )}
      </nav>

      {user ? (
        <div className="user-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} cinema mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} cinema mode`}
          >
            <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <span className="welcome-user">Hi, {user.name}</span>
          <button className="login-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      ) : (
        <div className="guest-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} cinema mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} cinema mode`}
          >
            <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button
            className="login-button"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </div>
      )}
    </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-screen-slideshow" aria-hidden="true">
            <div className="hero-screen-slideshow__shade" />
            {HERO_SCREEN_IMAGES.map((source, index) => (
              <img
                key={source}
                className={`hero-screen-slideshow__image ${
                  index === heroImageIndex ? "is-active" : ""
                } ${failedHeroImages.has(index) ? "is-failed" : ""}`}
                src={source}
                alt=""
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                onError={() => handleHeroImageError(index)}
              />
            ))}
          </div>
          <div className="hero-content">
            <p className="eyebrow">YOUR NEXT MOVIE NIGHT STARTS HERE</p>

            <h1>
              Unfold the Drama.
              <br />
              <span>We've Got the Tickets.</span>
            </h1>

            <p className="hero-description">
              Discover unforgettable movies, choose your seats,
              and make your next cinema night special.
            </p>

            <a className="primary-button" href="#movies">
              Explore Movies ↓
            </a>

            <div className="hero-highlights">
              <span>✦ Discover movies</span>
              <span>✦ Choose your seats</span>
              <span>✦ Book your experience</span>
            </div>
          </div>
        </section>

        <section className="movies-section" id="movies">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NOW SHOWING</p>
              <h2>Explore Movies</h2>
            </div>
            <span className="movie-count">{movies.length} movies</span>
          </div>

          {loading && <p className="message">Loading movies...</p>}
          {error && <p className="message error">{error}</p>}
          {favoriteError && (
          <p className="message error">{favoriteError}</p>
          )}
          {!loading && !error && movies.length === 0 && (
            <p className="message">No movies available right now.</p>
          )}
          <div className="movie-filters">
            <input
              type="text"
              placeholder="Search movies by title..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="movie-search-input"
            />

            <select
              value={selectedGenre}
              onChange={(event) => setSelectedGenre(event.target.value)}
              className="movie-filter-select"
            >
              <option value="All">All Genres</option>
              <option value="Action">Action</option>
              <option value="Comedy">Comedy</option>
              <option value="Drama">Drama</option>
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Thriller">Thriller</option>
              <option value="Romance">Romance</option>
            </select>

            <select
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value)}
              className="movie-filter-select"
            >
              <option value="All">All Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
              <option value="Korean">Korean</option>
            </select>
          </div>

          <div className="movie-grid">
             
          {movies
            .filter((movie) =>
              movie.title.toLowerCase().includes(searchTerm.trim().toLowerCase())
            )
            .filter((movie) =>
              selectedGenre === "All" ||
              movie.genre.some(
                (genre) => genre.toLowerCase() === selectedGenre.toLowerCase()
              )              
            )
            .filter((movie) =>
            selectedLanguage === "All" ||
            movie.language?.toLowerCase() === selectedLanguage.toLowerCase()
            )
            .map((movie) => (

              <article className="movie-card" key={movie._id}>
                                
                <div className="poster-placeholder">
                  {movie.posterUrl ? (
                    <>
                      <img
                        src={movie.posterUrl}
                        alt={`${movie.title} poster`}
                        className="movie-poster-image"
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                          event.currentTarget.parentElement.classList.add(
                            "poster-image-failed"
                          );
                        }}
                      />
                      <div className="poster-image-fallback" aria-hidden="true">
                        <span>IMOVIES</span>
                        <strong>{movie.title}</strong>
                        <small>{movie.language}</small>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>IMOVIES</span>
                      <strong>{movie.title}</strong>
                      <small>{movie.language}</small>
                    </>
                  )}
                </div>

                
          <div className="movie-info">
          <div>
            <h3>{movie.title}</h3>
            <p>{movie.duration} min · {movie.genre.join(" / ")}</p>
          </div>

          <div className="movie-actions">
            <button
              type="button"
              className="favorite-button"
              aria-label={
                favoriteIds.includes(movie._id)
                  ? `Remove ${movie.title} from favorites`
                  : `Add ${movie.title} to favorites`
              }
              aria-pressed={favoriteIds.includes(movie._id)}
              onClick={() => toggleFavorite(movie._id)}
            >
              {favoriteIds.includes(movie._id) ? "♥ Saved" : "♡ Favorite"}
            </button>

            <button
              className="book-button"
              onClick={() => {
                if (user) {
                  navigate(`/showtimes/${movie._id}`);
                } else {
                  navigate(`/login?next=booking&movie=${movie._id}`);
                }
              }}
            >
              Book
            </button>
          </div>
        </div>

              </article>
            ))}
          </div>
        </section>

        <section className="about-section" id="about">
          <p className="about-eyebrow">MAKE IT A MOVIE NIGHT</p>
          <h2>Your movie. Your moment.</h2>
          <p>Find a film, choose a show, and get ready for the big screen.</p>
        </section>

        <section className="feedback-section" aria-labelledby="feedback-heading">
          <div className="feedback-heading">
            <p className="feedback-eyebrow">YOUR TAKE MATTERS</p>
            <h2 id="feedback-heading">Help Us Make Your Movie Experience Better</h2>
            <p>Share a quick thought and help us make every cinema night smoother.</p>
          </div>

          <form
            className="feedback-form"
            onSubmit={(event) => {
              event.preventDefault();
              setFeedbackError("");
              setFeedbackStatus("");

              if (!feedbackRating) {
                setFeedbackError("Please choose a star rating.");
                return;
              }

              if (!feedbackMessage.trim()) {
                setFeedbackError("Please tell us a little about your experience.");
                return;
              }

              if (feedbackMessage.trim().length < 10) {
                setFeedbackError("Please enter at least 10 characters.");
                return;
              }

              setFeedbackStatus(
                "Thanks! Your feedback was validated locally. Persistent submission is not enabled yet."
              );
            }}
          >
            <div className="feedback-rating-field">
              <span className="feedback-field-label" id="feedback-rating-label">
                Rating
              </span>
              <div
                className="feedback-stars"
                role="radiogroup"
                aria-labelledby="feedback-rating-label"
                onMouseLeave={() => setFeedbackPreview(0)}
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`feedback-star ${
                      rating <= (feedbackPreview || feedbackRating) ? "is-active" : ""
                    }`}
                    role="radio"
                    aria-checked={feedbackRating === rating}
                    aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                    onMouseEnter={() => setFeedbackPreview(rating)}
                    onFocus={() => setFeedbackPreview(rating)}
                    onBlur={() => setFeedbackPreview(0)}
                    onClick={() => {
                      setFeedbackRating(rating);
                      setFeedbackError("");
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <label className="feedback-control">
              <span>Feedback category</span>
              <select
                value={feedbackCategory}
                onChange={(event) => setFeedbackCategory(event.target.value)}
              >
                {FEEDBACK_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className="feedback-message-field">
              <textarea
                value={feedbackMessage}
                maxLength={FEEDBACK_MAX_LENGTH}
                placeholder=" "
                aria-describedby="feedback-counter"
                onChange={(event) => {
                  setFeedbackMessage(event.target.value);
                  setFeedbackError("");
                  setFeedbackStatus("");
                }}
              />
              <span>Tell us what you think</span>
            </label>

            <div className="feedback-form-footer">
              <span id="feedback-counter" className="feedback-counter">
                {feedbackMessage.length}/{FEEDBACK_MAX_LENGTH}
              </span>
              <button className="feedback-submit-button" type="submit">
                Send Feedback
              </button>
            </div>

            {feedbackError && (
              <p className="feedback-feedback feedback-error" role="alert">
                {feedbackError}
              </p>
            )}
            {feedbackStatus && (
              <p className="feedback-feedback feedback-success" role="status">
                {feedbackStatus}
              </p>
            )}
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <Link className="logo" to="/">
              <span className="logo-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 4v10h2V7H8Zm4 0v10l7-5-7-5Z" />
                </svg>
              </span>
              <span className="logo-wordmark">i<span>MOVIES</span></span>
            </Link>
            <p className="footer-tagline">Your movie. Your moment.</p>
            <p className="footer-description">Discover films, choose your seats, and make every screening memorable.</p>
          </div>
          <div className="footer-links">
            <div>
              <h3>Explore</h3>
              <Link to="/">Home</Link>
              <a href="#movies">Movies</a>
              <a href="#about">About</a>
            </div>
            <div>
              <h3>Your iMovies</h3>
              <Link to="/my-bookings">My Bookings</Link>
              <Link to="/my-favorites">My Favorites</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {CURRENT_YEAR} iMOVIES. All rights reserved.</p>
          <p className="footer-credit" tabIndex="0">
            <span className="footer-credit-default">Made by --RSR and team--</span>
            <span className="footer-credit-hover" aria-hidden="true">Sachin Kumar</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function AppContent() {
  const [authData, setAuthData] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("imoviesAuth")) || null;
    } catch {
      return null;
    }
  });
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme state still applies when storage is unavailable.
    }
    applyTheme(theme);
  }, [theme]);

  function handleLogin(data) {
    const next = new URLSearchParams(window.location.search).get("next");
    sessionStorage.setItem("imoviesAuth", JSON.stringify(data));
    setAuthData(data);
    if (next === "booking") {
      // Booking flow will be connected in the next step.
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("imoviesAuth");
    setAuthData(null);
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home
            user={authData?.user}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          />
        }
      />
      <Route path="/login" element={<Auth mode="login" onLogin={handleLogin} />} />
      <Route path="/register" element={<Auth mode="register" onLogin={handleLogin} />} />
      <Route path="/showtimes/:movieId" element={<Showtimes />} />
      <Route path="/seats/:showId" element={<Seats />} />
      <Route path="/confirm-booking/:showId" element={<BookingConfirmation />}/>
      <Route path="/my-favorites" element={<MyFavorites />} />
      <Route path="/my-bookings" element={<MyBookings />} />
      <Route
         path="/admin"
          element={
            authData?.user?.role === "admin" ? (
          <AdminDashboard
            theme={theme}
            onToggleTheme={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          />
       ) : (
      <Navigate to="/login" replace />
    )
  }
/>
      <Route
        path="*"
        element={
          <Home
            user={authData?.user}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          />
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
