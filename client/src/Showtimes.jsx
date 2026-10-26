import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";

function Showtimes() {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
});

  useEffect(() => {
    fetch(`${API_URL}/api/movies/${movieId}/shows`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load showtimes");
        }
        return response.json();
      })
      .then((data) => {
        setShows(Array.isArray(data) ? data : data.shows || []);
      })
      .catch(() => {
        setError("Could not load showtimes. Please check the backend.");
      })
      .finally(() => setLoading(false));
  }, [movieId]);

  return (
    <main
           style={{
              width: "100%",
              maxWidth: "1400px",
              margin: "0 auto",
              padding: "32px clamp(16px, 4vw, 48px) 56px",
              color: "white",
              minHeight: "70vh",
              boxSizing: "border-box",
              overflow: "visible",
          }}
         >
          <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            marginTop: "20px",
            marginBottom: "8px",
            borderRadius: "10px",
            border: "1px solid #49376a",
            background: "#211a35",
            color: "#e9ddff",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
            transition: "background 0.2s ease, border-color 0.2s ease",
          }}
        >
          ← Back to Movies
        </Link>
      <h1
        style={{
            marginTop: "32px",
            marginBottom: "24px",
            paddingBottom: "12px",
            fontSize: "clamp(32px, 4vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-1.5px",
            lineHeight: 1.25,
            background: "linear-gradient(90deg, #ffffff, #c084fc)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Choose Your Showtime
      </h1>
      
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid #29272f",
          background: "#141419",
        }}
      >
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "18px",
            color: "#ffffff",
          }}
        >
          Choose Your Date
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {[
            {
              label: "Today",
              date: (() => {
                const d = new Date();
                return [
                  d.getFullYear(),
                  String(d.getMonth() + 1).padStart(2, "0"),
                  String(d.getDate()).padStart(2, "0"),
                ].join("-");
              })(),
            },
            {
              label: "Tomorrow",
              date: (() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                return [
                  d.getFullYear(),
                  String(d.getMonth() + 1).padStart(2, "0"),
                  String(d.getDate()).padStart(2, "0"),
                ].join("-");
              })(),
            },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => setSelectedDate(option.date)}
              style={{
                padding: "11px 20px",
                borderRadius: "10px",
                border:
                  selectedDate === option.date
                    ? "1px solid #ffffff"
                    : "1px solid #3a3742",
                background:
                  selectedDate === option.date ? "#ffffff" : "#222127",
                color: selectedDate === option.date ? "#111111" : "#eeeeee",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          ))}

          <input
            type="date"
            min={(() => {
              const d = new Date();
              return [
                d.getFullYear(),
                String(d.getMonth() + 1).padStart(2, "0"),
                String(d.getDate()).padStart(2, "0"),
              ].join("-");
            })()}
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            style={{
              padding: "11px 12px",
              borderRadius: "10px",
              border: "1px solid #3a3742",
              background: "#222127",
              color: "#ffffff",
              colorScheme: "dark",
              fontSize: "14px",
            }}
          />
        </div>
      </div>


      {loading && (
        <div
          style={{
            marginTop: "24px",
            padding: "32px 24px",
            borderRadius: "16px",
            border: "1px solid #49376a",
            background: "linear-gradient(145deg, #241936, #17111f)",
            textAlign: "center",
            color: "#d8b4fe",
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎟️</div>
          Loading showtimes...
        </div>
      )}
      {error && (
          <div
            role="alert"
            style={{
              marginTop: "24px",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1px solid #f87171",
              background: "rgba(248, 113, 113, 0.1)",
              color: "#fca5a5",
              fontSize: "15px",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ display: "block", marginBottom: "4px" }}>
              Unable to load showtimes
            </strong>
            {error}
          </div>
      )}

      {!loading && !error && shows.filter((show) => {
          const d = new Date(show.showDate);

          const dateString = [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0"),
          ].join("-");

          return dateString === selectedDate;
        }).length === 0 &&(
        <div
          style={{
            marginTop: "24px",
            padding: "32px 24px",
            borderRadius: "16px",
            border: "1px solid #49376a",
            background: "linear-gradient(145deg, #241936, #17111f)",
            textAlign: "center",
            color: "#cbd5e1",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎬</div>
          <h2 style={{ color: "#e9ddff", margin: "0 0 10px" }}>
            No Showtimes Available
          </h2>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            There are no upcoming showtimes for this movie yet. Please check back later.
          </p>
        </div>
        )}

      <div
         className="showtimes-grid"
         style={{
         display: "grid",
         gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "22px",
          marginTop: "32px",
         }}
        >
        {shows
          .filter((show) => {
            const showDate = new Date(show.showDate);

            const showDateString = [
              showDate.getFullYear(),
              String(showDate.getMonth() + 1).padStart(2, "0"),
              String(showDate.getDate()).padStart(2, "0"),
            ].join("-");
            console.log("Show date:", show.showDate, "Selected date:", selectedDate, "Parsed date:", showDateString);
            return showDateString === selectedDate;
          })
          .map((show) => (
          <article
            key={show._id}
            style={{
              background: "linear-gradient(145deg, #241936, #17111f)",
              padding: "26px",
              display: "flex",
              flexDirection: "column",
              borderRadius: "18px",
              border: "1px solid #49376a",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.22)",
              transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
              cursor: "default",
            }}
          >
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: "24px",
                fontWeight: 800,
                color: "#e9ddff",
              }}
            >
              {show.cinemaName}
            </h3>
            <p
              style={{
                margin: "12px 0",
                color: "#cbd5e1",
                fontSize: "15px",
              }}
            >
              🎬 Screen: <strong style={{ color: "#f5f3ff" }}>{show.screenName}</strong>
            </p>
            <p>
              <span
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(192, 132, 252, 0.12)",
                  border: "1px solid rgba(192, 132, 252, 0.3)",
                  borderRadius: "8px",
                  color: "#d8b4fe",
                  fontWeight: 600,
                }}
              >
                📅 {new Date(show.showDate).toLocaleDateString()}
              </span>
            </p>
           <p
              style={{
                margin: "14px 0",
                fontSize: "22px",
                fontWeight: 800,
                color: "#c084fc",
              }}
            >
              🕒 {show.startTime}
            </p>
            <p
              style={{
                margin: "12px 0",
                fontSize: "18px",
                fontWeight: 700,
                color: "#86efac",
              }}
            >
              Ticket price: ₹{show.ticketPrice}
            </p>
            <p
            style={{
              margin: "16px 0",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "rgba(134, 239, 172, 0.08)",
                border: "1px solid rgba(134, 239, 172, 0.2)",
                color: "#86efac",
                fontSize: "15px",
                fontWeight: 600,
                  }}
                >
              <span style={{ marginRight: "8px" }}>🎟️</span>
              Available seats:{" "}
              <strong>
                {Math.max(
                0,
                  show.totalSeats - (show.bookedSeats?.length || 0)
                )}
              </strong>
            </p>
              <button
                className="select-seats-button"
                onClick={() => navigate(`/seats/${show._id}`)}
                style={{
                marginTop: "auto",
                width: "100%",
                padding: "14px 20px",
                borderRadius: "12px",
                border: "1px solid #c084fc",
                background: "linear-gradient(135deg, #c084fc, #a78bfa)",
                color: "#171020",
                fontSize: "16px",
                fontWeight: 800,
                letterSpacing: "0.3px",
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(167, 139, 250, 0.22)",
                transform: "translateY(0)",
              }}      
            >
                Select Seats
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}

export default Showtimes;
