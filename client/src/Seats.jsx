import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const API_URL = "http://localhost:5000";

function Seats() {
  const { showId } = useParams();
  const navigate = useNavigate();

  const [show, setShow] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState(
  () => window.history.state?.usr?.seats || []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seatLimitMessage, setSeatLimitMessage] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/shows/${showId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Show not found");
        }
        return response.json();
      })
      .then((data) => setShow(data.show || data))
      .catch(() => setError("Could not load this show."))
      .finally(() => setLoading(false));
  }, [showId]);

  
  
function toggleSeat(seat) {
  setSeatLimitMessage("");

  setSelectedSeats((current) => {
    if (current.includes(seat)) {
      return current.filter((item) => item !== seat);
    }

    if (current.length >= 6) {
      setSeatLimitMessage("seat selection limit reached.");
      return current;
    }

    return [...current, seat];
  });
}



  if (loading) return <main style={{ padding: 30 }}>Loading seats...</main>;

  if (error || !show) {
    return (
      <main style={{ padding: 30 }}>
        <p>{error || "Show not found."}</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </main>
    );
  }

  const bookedSeats = show.bookedSeats || [];
  const seatRows = ["A", "B", "C", "D", "E", "F"];
  const total = selectedSeats.length * show.ticketPrice;

  return (
    <main style={{ padding: 30, color: "white", minHeight: "70vh" }}>
      <Link
      to={`/showtimes/${show.movie?._id || ""}`}
      style={{
        display: "block",
        width: "fit-content",
        margin: "0 0 16px 0",
        padding: "8px 12px",
        borderRadius: "8px",
        border: "1px solid #a78bfa",
        background: "#211a35",
        color: "#e9ddff",
        textDecoration: "none",
        fontWeight: 600,
        fontSize: "13px",
        cursor: "pointer",
      }}
    >
      ← Back to Showtimes
    </Link>

      <h1 style={{ marginTop: 24 }}>Choose Your Seats</h1>
      <p>{show.cinemaName} · {show.screenName}</p>

      
      <div
        style={{
          maxWidth: "560px",
          margin: "36px auto 44px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            height: "8px",
            width: "85%",
            margin: "0 auto 12px",
            borderRadius: "50%",
            background: "linear-gradient(90deg, transparent, #c084fc, #ffffff, #c084fc, transparent)",
            boxShadow: "0 6px 22px rgba(192, 132, 252, 0.35)",
          }}
        />
        <div
          style={{
            color: "#c4b5fd",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "5px",
          }}
        >
          SCREEN
        </div>
        <p
          style={{
            margin: "6px 0 0",
            color: "#8b7ba6",
            fontSize: "12px",
          }}
        >
          All eyes this way
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "24px repeat(4, minmax(28px, 1fr)) 20px repeat(4, minmax(28px, 1fr))",
          columnGap: "8px",
          rowGap: "12px",
          maxWidth: "620px",
          margin: "0 auto",
          alignItems: "center",
        }}
      >


      {seatRows.map((row) => (
        <>
          <span
            key={`${row}-label`}
            style={{
              color: "#c4b5fd",
              fontSize: "13px",
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {row}
          </span>

                  
          {Array.from({ length: 8 }, (_, index) => {
            const seatNumber = index + 1;
            const seat = `${row}${seatNumber}`;
            const booked = bookedSeats.includes(seat);
            const selected = selectedSeats.includes(seat);

            return (
              <>
                {seatNumber === 5 && (
                  <span
                    key={`${row}-aisle`}
                    aria-hidden="true"
                  />
                )}
                <button
                  key={seat}
                  disabled={booked}
                  onClick={() => toggleSeat(seat)}
                  style={{
                    padding: "8px 2px",
                    minWidth: 0,
                    borderRadius: "8px 8px 4px 4px",
                    border: `1px solid ${
                      booked ? "#64748b" : selected ? "#86efac" : "#8b5cf6"
                    }`,
                    color: booked ? "#94a3b8" : selected ? "#052e16" : "#e9d5ff",
                    background: booked
                      ? "#374151"
                      : selected
                        ? "#4ade80"
                        : "#211a35",
                    cursor: booked ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    boxShadow: selected
                      ? "0 0 12px rgba(74, 222, 128, 0.25)"
                      : "none",
                  }}
                  title={booked ? "Already booked" : `Seat ${seat}`}
                >
                  {seatNumber}
                </button>
              </>
            );
          })}

        </>
      ))}

      </div>

      {seatLimitMessage && (
        <p
          role="status"
          style={{
            textAlign: "center",
            color: "#fca5a5",
            fontSize: "13px",
            margin: "16px 0 0",
          }}
        >
          {seatLimitMessage}
        </p>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "24px",
          flexWrap: "wrap",
          margin: "28px auto",
          color: "#ddd1eb",
          fontSize: "13px",
        }}
      >
        {[
          { label: "Available", color: "#211a35", border: "#a78bfa" },
          { label: "Selected", color: "#4ade80", border: "#86efac" },
          { label: "Booked", color: "#374151", border: "#64748b" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "18px",
                height: "18px",
                borderRadius: "5px 5px 3px 3px",
                background: item.color,
                border: `1px solid ${item.border}`,
                boxSizing: "border-box",
              }}
            />
            {item.label}
          </div>
        ))}
      </div>
    
      <div
        style={{
          maxWidth: "560px",
          margin: "28px auto 0",
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid #49376a",
          background: "linear-gradient(145deg, #241936, #17111f)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px",
                color: "#b9a8ce",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "1px",
              }}
            >
              SELECTED SEATS
            </p>
            <p
              style={{
                margin: 0,
                color: "#e9ddff",
                fontSize: "16px",
                fontWeight: 700,
              }}
            >
              {selectedSeats.length > 0
                ? [...selectedSeats].sort().join(", ")
                : "No seats selected"}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <p
              style={{
                margin: "0 0 6px",
                color: "#b9a8ce",
                fontSize: "12px",
              }}
            >
              TOTAL PRICE
            </p>
            <p
              style={{
                margin: 0,
                color: "#86efac",
                fontSize: "26px",
                fontWeight: 800,
              }}
            >
              ₹{total}
            </p>
          </div>
        </div>
      </div>


      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button
          disabled={selectedSeats.length === 0}
          onClick={() =>
            navigate(`/confirm-booking/${showId}`, {
              state: { seats: selectedSeats },
            })
          }
          
        style={{
          padding: "14px 32px",
          minWidth: "200px",
          borderRadius: "12px",
          border: "1px solid #c084fc",
          background: selectedSeats.length
            ? "linear-gradient(135deg, #c084fc, #a78bfa)"
            : "#403650",
          color: selectedSeats.length ? "#171020" : "#a89bbd",
          fontSize: "16px",
          fontWeight: 800,
          letterSpacing: "0.3px",
          cursor: selectedSeats.length ? "pointer" : "not-allowed",
          boxShadow: selectedSeats.length
            ? "0 8px 24px rgba(167, 139, 250, 0.25)"
            : "none",
          transition: "all 0.2s ease",
        }}

        >
          Continue
        </button>
      </div>
    </main>
  );
}

export default Seats;
