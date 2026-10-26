
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./MyBookings.css";

const API_URL = "http://localhost:5000";

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");

  async function handleCancelBooking(bookingId) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    setCancellingId(bookingId);
    setCancelMessage("");

    try {
      const authData = JSON.parse(
        sessionStorage.getItem("imoviesAuth") || "null"
      );

      const response = await fetch(
        `${API_URL}/api/bookings/${bookingId}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${authData?.token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel booking");
      }

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking._id === bookingId
            ? { ...booking, status: "cancelled" }
            : booking
        )
      );

      setCancelMessage("Booking cancelled successfully.");
    } catch (error) {
      setCancelMessage(error.message);
    } finally {
      setCancellingId("");
    }
  }

  useEffect(() => {
    async function loadBookings() {
      try {
        const authData = JSON.parse(
          sessionStorage.getItem("imoviesAuth") || "null"
        );

        if (!authData?.token) {
          setError("Please log in to view your bookings.");
          return;
        }

        const response = await fetch(`${API_URL}/api/bookings/my`, {
          headers: {
            Authorization: `Bearer ${authData.token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load bookings.");
        }

        setBookings(Array.isArray(data) ? data : data.bookings || []);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);

  return (
    <main className="my-bookings-page">
      <Link to="/" className="bookings-back-link">
        ← Back to Movies
      </Link>

      <h1 className="bookings-heading">
        Your <span>Bookings</span>
      </h1>

      {loading && <p className="bookings-message">Loading your bookings...</p>}
      {error && <p className="bookings-error">{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p className="bookings-message">
          You haven't booked any tickets yet.
        </p>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="bookings-grid">
          {bookings.map((booking) => {
            const show = booking.show;
            const movie = show?.movie;

            console.log("Booking movie data:", movie);

            // Use a poster field only if your movie data provides one.
           const poster = movie?.posterUrl;
            return (
              <article className="booking-card" key={booking._id}>
                <div className="booking-poster">
                  {poster ? (
                    <img
                      src={poster}
                      alt={`${movie?.title || "Movie"} poster`}
                    />
                  ) : (
                    <div className="booking-poster-placeholder">
                      <span>iMOVIES</span>
                      <small>Movie poster</small>
                    </div>
                  )}
                </div>

                <div className="booking-details">
                  <h2>{movie?.title || "Movie details unavailable"}</h2>

                  <p>
                    <span>Cinema:</span>{" "}
                    {show?.cinemaName || "Not available"}
                  </p>

                  <p>
                    <span>Screen:</span>{" "}
                    {show?.screenName || "Not available"}
                  </p>

                  <p>
                    <span>Show date:</span>{" "}
                    {show?.showDate
                      ? new Date(show.showDate).toLocaleDateString()
                      : "Not available"}
                  </p>

                  <p>
                    <span>Showtime:</span>{" "}
                    {show?.startTime || "Not available"}
                  </p>

                  <p>
                    <span>Seats:</span>{" "}
                    {booking.seats?.join(", ") || "Not available"}
                  </p>

                  <p>
                    <span>Total price:</span> ₹{booking.totalAmount}
                  </p>

                  <p>
                    <span>Status:</span>{" "}
                    <strong
                      className={
                        booking.status === "cancelled"
                          ? "booking-status-cancelled"
                          : "booking-status-confirmed"
                      }
                    >
                      {booking.status || "confirmed"}
                    </strong>
                  </p>

                  {booking.status !== "cancelled" && (
                    <button
                      className="cancel-booking-button"
                      onClick={() => handleCancelBooking(booking._id)}
                      disabled={cancellingId === booking._id}
                    >
                      {cancellingId === booking._id
                        ? "Cancelling..."
                        : "Cancel Booking"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {cancelMessage && (
        <p className="bookings-message" role="status">
          {cancelMessage}
        </p>
      )}
    </main>
  );
}

export default MyBookings;
