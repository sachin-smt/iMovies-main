import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./AdminDashboard.css";

const API_URL = "http://localhost:5000";

function AdminDashboard({ theme, onToggleTheme }) {
  const [activePage, setActivePage] = useState(() => {
    const page = window.location.hash.slice(1);
    return ["overview", "movies", "showtimes"].includes(page) ? page : "overview";
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    genre: "",
    duration: "",
    language: "English",
    posterUrl: "",
    releaseDate: "",
    certificate: "UA",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
const [movies, setMovies] = useState([]);
const [showMessage, setShowMessage] = useState("");
const [showError, setShowError] = useState("");
const [showLoading, setShowLoading] = useState(false);
const [editingMovieId, setEditingMovieId] = useState(null);

async function loadShowtimes() {
  setShowtimesLoading(true);

  try {
    const auth = JSON.parse(
      sessionStorage.getItem("imoviesAuth")
    );
    const token = auth?.token;

    const response = await fetch(`${API_URL}/api/shows`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load showtimes");
    }

    setShowtimes(data);
  } catch (error) {
    setShowError(error.message);
  } finally {
    setShowtimesLoading(false);
  }
}

const [showForm, setShowForm] = useState({
  movieId: "",
  cinemaName: "IMovies Cinema",
  screenName: "Screen 1",
  showDate: "",
  startTime: "",
  ticketPrice: "200",
  totalSeats: "50",
});
const [showtimes, setShowtimes] = useState([]);
const [showtimesLoading, setShowtimesLoading] = useState(false);


useEffect(() => {
  function handleHashChange() {
    const page = window.location.hash.slice(1);
    setActivePage(["overview", "movies", "showtimes"].includes(page) ? page : "overview");
    setMobileNavOpen(false);
  }

  window.addEventListener("hashchange", handleHashChange);
  if (!window.location.hash) {
    window.location.hash = "overview";
  }

  return () => window.removeEventListener("hashchange", handleHashChange);
}, []);

useEffect(() => {
  async function loadMovies() {
    try {
      const response = await fetch(`${API_URL}/api/movies`);

      if (!response.ok) {
        throw new Error("Could not load movies");
      }

      const data = await response.json();
      setMovies(data);
    } catch (err) {
      setShowError(err.message);
    }
  }

   loadMovies();
   loadShowtimes();
}, []);


async function handleDeleteShowtime(showId) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this showtime?"
  );

  if (!confirmed) return;

  try {
    const auth = JSON.parse(
      sessionStorage.getItem("imoviesAuth")
    );
    const token = auth?.token;

    const response = await fetch(`${API_URL}/api/shows/${showId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete showtime");
    }

    setShowtimes((current) =>
      current.filter((show) => show._id !== showId)
    );
    setShowMessage("Showtime deleted successfully!");
    setShowError("");
  } catch (error) {
    setShowError(error.message);
  }
}


  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  
function handleEditMovie(movie) {
  setEditingMovieId(movie._id);

  setForm({
    title: movie.title || "",
    description: movie.description || "",
    genre: Array.isArray(movie.genre) ? movie.genre.join(", ") : "",
    duration: String(movie.duration ?? ""),
    language: movie.language || "English",
    posterUrl: movie.posterUrl || "",
    releaseDate: movie.releaseDate
      ? movie.releaseDate.slice(0, 10)
      : "",
    certificate: movie.certificate || "UA",
  });

  setMessage("");
  setError("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}


async function handleDeleteMovie(movieId) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this movie? This action cannot be undone."
  );

  if (!confirmed) return;

  setMessage("");
  setError("");

  try {
    const authData = JSON.parse(
      sessionStorage.getItem("imoviesAuth") || "null"
    );

    const response = await fetch(`${API_URL}/api/movies/${movieId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authData?.token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete movie");
    }

    setMovies((currentMovies) =>
      currentMovies.filter((movie) => movie._id !== movieId)
    );

    setMessage("Movie deleted successfully!");
  } catch (err) {
    setError(err.message);
  }
}

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const authData = JSON.parse(
      sessionStorage.getItem("imoviesAuth") || "null"
    );

    if (!authData?.token) {
      setError("Please log in first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
         editingMovieId
          ? `${API_URL}/api/movies/${editingMovieId}`
         : `${API_URL}/api/movies`,
          {
        method: editingMovieId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify({
          ...form,
          genre: form.genre.split(",").map((item) => item.trim()).filter(Boolean),
          duration: Number(form.duration),
          releaseDate: form.releaseDate || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add the movie.");
      }

      setMessage(
        editingMovieId
         ? "Movie updated successfully!"
         : "Movie added successfully!"
    );

    setEditingMovieId(null);

      setForm({
        title: "",
        description: "",
        genre: "",
        duration: "",
        language: "English",
        posterUrl: "",
        releaseDate: "",
        certificate: "UA",
      });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  
async function handleShowSubmit(event) {
  event.preventDefault();
  setShowMessage("");
  setShowError("");

  const authData = JSON.parse(
    sessionStorage.getItem("imoviesAuth") || "null"
  );

  if (!authData?.token) {
    setShowError("Please log in first.");
    return;
  }

  setShowLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/shows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.token}`,
      },
      body: JSON.stringify({
        ...showForm,
        ticketPrice: Number(showForm.ticketPrice),
        totalSeats: Number(showForm.totalSeats),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not create showtime.");
    }

    setShowMessage("Showtime created successfully!");
    setShowForm((current) => ({
      ...current,
      showDate: "",
      startTime: "",
    }));
  } catch (err) {
    setShowError(err.message || "Something went wrong.");
  } finally {
    setShowLoading(false);
  }
}


  const fields = [
    ["title", "Movie title", "text"],
    ["description", "Description", "textarea"],
    ["genre", "Genres (comma-separated)", "text"],
    ["duration", "Duration in minutes", "number"],
    ["language", "Language", "text"],
    ["posterUrl", "Poster image URL", "url"],
    ["releaseDate", "Release date", "date"],
    ["certificate", "Certificate (e.g. U, UA, A)", "text"],
  ];

  const pageDetails = {
    overview: ["ADMIN / OVERVIEW", "Dashboard", "Manage your cinema catalogue and screening schedule."],
    movies: ["ADMIN / MOVIES", "Movie management", "Add, edit, and maintain the films available to guests."],
    showtimes: ["ADMIN / SHOWTIMES", "Showtime management", "Schedule and manage published screening times."],
  };
  const [breadcrumb, pageTitle, pageDescription] = pageDetails[activePage];

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <Link className="admin-brand" to="/">
          <span className="admin-brand-mark" aria-hidden="true">▶</span>
          <span>i<span>MOVIES</span></span>
        </Link>
        <p className="admin-sidebar-label">WORKSPACE</p>
        <button
          className="admin-mobile-nav-toggle"
          type="button"
          aria-expanded={mobileNavOpen}
          aria-controls="admin-navigation"
          onClick={() => setMobileNavOpen((current) => !current)}
        >
          {mobileNavOpen ? "✕ Close menu" : "☰ Workspace menu"}
        </button>
        <nav className={`admin-sidebar-nav ${mobileNavOpen ? "is-open" : ""}`} id="admin-navigation">
          <a className={activePage === "overview" ? "is-active" : ""} href="#overview">▦ <span>Overview</span></a>
          <a className={activePage === "movies" ? "is-active" : ""} href="#movies">▣ <span>Movie management</span></a>
          <a className={activePage === "showtimes" ? "is-active" : ""} href="#showtimes">◷ <span>Showtime management</span></a>
        </nav>
        <Link className="admin-sidebar-back" to="/">← Back to public site</Link>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div>
            <p className="admin-breadcrumb">{breadcrumb}</p>
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
          </div>
          <div className="admin-header-actions">
            <button
              className="admin-theme-toggle"
              type="button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-pressed={theme === "dark"}
            >
              <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
              <strong>{theme === "dark" ? "Light" : "Dark"}</strong>
              <small>Mode</small>
            </button>
            <div className="admin-header-status"><span /> Live workspace</div>
          </div>
        </header>

        {(message || error || showMessage || showError) && (
          <div className="admin-notifications" aria-live="polite">
            {message && <p className="admin-notice success">{message}</p>}
            {showMessage && <p className="admin-notice success">{showMessage}</p>}
            {error && <p className="admin-notice error">{error}</p>}
            {showError && <p className="admin-notice error">{showError}</p>}
          </div>
        )}

        {activePage === "overview" && (
          <section className="admin-page" id="overview" aria-label="Dashboard summary">
            <section className="admin-summary">
              <article className="summary-card"><span className="summary-icon">▣</span><div><span>Catalogue</span><strong>{movies.length}</strong><small>Movies in catalogue</small></div></article>
              <article className="summary-card"><span className="summary-icon">◷</span><div><span>Schedule</span><strong>{showtimes.length}</strong><small>Published showtimes</small></div></article>
            </section>
            <section className="admin-panel admin-shortcuts" aria-labelledby="shortcuts-title">
              <div className="panel-heading compact"><div><p className="panel-kicker">QUICK ACCESS</p><h2 id="shortcuts-title">Choose a workspace</h2><p>Jump directly to the task you want to manage.</p></div></div>
              <div className="admin-shortcut-grid">
                <a className="admin-shortcut" href="#movies"><span className="summary-icon">▣</span><span><strong>Movie management</strong><small>Add, edit, or remove catalogue entries.</small></span><b aria-hidden="true">→</b></a>
                <a className="admin-shortcut" href="#showtimes"><span className="summary-icon">◷</span><span><strong>Showtime management</strong><small>Schedule screenings and review availability.</small></span><b aria-hidden="true">→</b></a>
              </div>
            </section>
          </section>
        )}

        {activePage === "movies" && <section className="admin-page" id="movies">
        <section className="admin-panel">
          <div className="panel-heading">
            <div><p className="panel-kicker">CATALOGUE</p><h2>{editingMovieId ? "Edit movie" : "Add a movie"}</h2><p>Keep your movie catalogue accurate and ready for guests.</p></div>
            {editingMovieId && <button className="button secondary" type="button" onClick={() => setEditingMovieId(null)}>Cancel editing</button>}
          </div>
          <form className="admin-form" onSubmit={handleSubmit}>
            {fields.map(([name, label, type]) => (
              <label className={type === "textarea" ? "field field-wide" : "field"} key={name}>
                <span>{label}{["title", "genre", "duration", "language"].includes(name) && <b>*</b>}</span>
                {type === "textarea" ? <textarea name={name} value={form[name]} onChange={handleChange} required rows={4} /> : <input name={name} type={type} value={form[name]} onChange={handleChange} required={["title", "genre", "duration", "language"].includes(name)} min={type === "number" ? 1 : undefined} />}
              </label>
            ))}
            <button className="button primary field-wide" type="submit" disabled={loading}>{loading ? "Saving movie..." : editingMovieId ? "Save changes" : "Add movie"}</button>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="manage-movies-title">
          <div className="panel-heading compact"><div><p className="panel-kicker">LIBRARY</p><h2 id="manage-movies-title">Manage movies</h2></div></div>
          {movies.length === 0 ? <p className="admin-empty">No movies found.</p> : <div className="movie-admin-list">{movies.map((movie) => <article className="movie-admin-row" key={movie._id}>
            <div className="movie-thumb">{movie.posterUrl ? <img src={movie.posterUrl} alt="" /> : <span>iM</span>}</div>
            <div className="movie-admin-details"><strong>{movie.title}</strong><span>{movie.language} · {movie.duration} min</span><small>{Array.isArray(movie.genre) ? movie.genre.join(" · ") : movie.genre}</small></div>
            <div className="row-actions"><button className="button secondary" type="button" onClick={() => handleEditMovie(movie)}>Edit</button><button className="button danger" type="button" onClick={() => handleDeleteMovie(movie._id)}>Delete</button></div>
          </article>)}</div>}
        </section>
        </section>}

        {activePage === "showtimes" && <section className="admin-page" id="showtimes">
        <section className="admin-panel">
          <div className="panel-heading"><div><p className="panel-kicker">SCHEDULING</p><h2>Schedule a showtime</h2><p>Choose a movie and define its screening details.</p></div></div>
          <form className="admin-form" onSubmit={handleShowSubmit}>
            <label className="field field-wide"><span>Movie<b>*</b></span><select required value={showForm.movieId} onChange={(event) => setShowForm((current) => ({ ...current, movieId: event.target.value }))}><option value="">Select a movie</option>{movies.map((movie) => <option key={movie._id} value={movie._id}>{movie.title}</option>)}</select></label>
            {[["cinemaName", "Cinema name", "text"], ["screenName", "Screen name", "text"], ["showDate", "Show date", "date"], ["startTime", "Start time", "time"], ["ticketPrice", "Ticket price (₹)", "number"], ["totalSeats", "Total seats", "number"]].map(([name, label, type]) => <label className="field" key={name}><span>{label}<b>*</b></span><input type={type} required min={name === "ticketPrice" ? 0 : name === "totalSeats" ? 1 : undefined} value={showForm[name]} onChange={(event) => setShowForm((current) => ({ ...current, [name]: event.target.value }))} /></label>)}
            <button className="button primary field-wide" type="submit" disabled={showLoading}>{showLoading ? "Saving showtime..." : "Create showtime"}</button>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="manage-showtimes-title">
          <div className="panel-heading compact"><div><p className="panel-kicker">SCHEDULE</p><h2 id="manage-showtimes-title">Manage showtimes</h2></div></div>
          {showtimesLoading ? <p className="admin-empty">Loading showtimes...</p> : showtimes.length === 0 ? <p className="admin-empty">No showtimes found.</p> : <div className="showtime-list">{showtimes.map((show) => <article className="showtime-row" key={show._id}><div><strong>{show.movie?.title || "Unknown movie"}</strong><span>{show.cinemaName} · {show.screenName}</span></div><div className="showtime-meta"><span>{new Date(show.showDate).toLocaleDateString()}</span><span>{show.startTime}</span><span>₹{show.ticketPrice}</span><small>{show.bookedSeats?.length || 0} / {show.totalSeats} seats</small></div><button className="button danger" type="button" onClick={() => handleDeleteShowtime(show._id)}>Delete</button></article>)}</div>}
        </section>
        </section>}
      </div>
    </main>
  );
}

export default AdminDashboard;
