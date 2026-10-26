import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

const API_URL = "http://localhost:5000";

function BookingConfirmation() {
  const { showId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);
  const [show, setShow] = useState(null);

  useEffect(() => {
  fetch(`${API_URL}/api/shows/${showId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Show not found");
      }
      return response.json();
    })
    .then((data) => setShow(data.show || data))
    .catch(() => setError("Could not load show details."));
}, [showId]);

  const seats = location.state?.seats || [];
  const authData = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("imoviesAuth"));
    } catch {
      return null;
    }
  })();


  async function confirmBooking() {
    if (loading) return;

    if (!authData?.token) {
      navigate("/login");
      return;
    }

    if (seats.length === 0) {
      setError("No seats were selected. Please select seats first.");
      return;
    }

    if (!window.Razorpay) {
      setError("Razorpay Checkout could not load. Refresh the page and try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Create the order on the backend.
      const orderResponse = await fetch(
        `${API_URL}/api/payments/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.token}`,
          },
          body: JSON.stringify({ showId, seats }),
        }
      );

      const orderData = await orderResponse.json().catch(() => ({}));

      if (!orderResponse.ok) {
        throw new Error(orderData.message || "Could not create payment order.");
      }

      // 2. Open Razorpay Checkout.
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "iMovies",
        description: "Movie ticket booking",
        order_id: orderData.orderId,

        handler: async function (paymentResponse) {
          try {
            // 3. Verify payment on the backend.
            const verifyResponse = await fetch(
              `${API_URL}/api/payments/verify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${authData.token}`,
                },
                body: JSON.stringify(paymentResponse),
              }
            );

            const verifyData = await verifyResponse.json().catch(() => ({}));

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.message || "Payment verification failed."
              );
            }

            if (!verifyData.booking) {
              throw new Error(
                "Payment was verified, but the booking confirmation was not returned. Please check My Bookings before retrying."
              );
            }

            // Display success only after the backend confirms the booking.
            setBooking(verifyData.booking);
          } catch (err) {
            setError(
              err.message ||
                "We could not confirm your booking. Check My Bookings before trying again."
            );
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },

        theme: {
          color: "#7c3aed",
        },
      };

      const checkout = new window.Razorpay(options);

      
    checkout.on("payment.failed", function (response) {
      console.error("Razorpay payment failed:", {
        code: response.error?.code,
        description: response.error?.description,
        orderId: response.error?.metadata?.order_id,
        paymentId: response.error?.metadata?.payment_id,
      });

      setError(
        response.error?.description ||
          "Payment failed. Please try again."
      );

      setLoading(false);
    });


      checkout.open();
    } catch (err) {
      setError(err.message || "Could not start the payment process.");
      setLoading(false);
    }
  }

      if (booking) {
        return (
          <main
            style={{
              padding: "40px 24px",
              color: "white",
              minHeight: "70vh",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                padding: "32px",
                borderRadius: "18px",
                border: "1px solid #6d28d9",
                background: "linear-gradient(145deg, #211a35, #120d20)",
                textAlign: "center",
                boxShadow: "0 12px 35px rgba(124, 58, 237, 0.18)",
              }}
            >
              <div style={{ fontSize: "42px", marginBottom: "12px" }}>✓</div>
            <h1
              style={{
                margin: "0 0 16px",
                color: "#c4b5fd",
                fontSize: "32px",
                lineHeight: 1.2,
                fontWeight: 700,
              }}
            >
              Booking Confirmed!
            </h1>

              <p style={{ margin: "0 0 14px", fontSize: "16px" }}>
                  Your seats: {booking.seats?.join(", ") || seats.join(", ")}
              </p>

              <p
                style={{
                  margin: "0 0 16px",
                  fontSize: "19px",
                  fontWeight: 700,
                }}
              >
                Total paid: ₹{booking.totalAmount ?? "N/A"}
              </p>

              
              <p style={{ color: "#a99cbd", fontSize: "13px" }}>
                Thank you for booking with iMovies.
              </p>

              <button
                onClick={() => navigate("/")}
                style={{
                  marginTop: "12px",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: "1px solid #a78bfa",
                  background: "#7c3aed",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
              >
                ← Back to Home
              </button>

            </div>
          </main>
        );
      }

  return (
    <main style={{ padding: 32, color: "white", minHeight: "70vh" }}>
      <Link
        to={`/seats/${showId}`}
        state={{ seats }}
        
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
        ← Edit Selected Seats
      </Link>
      <h1
        style={{
          marginTop: "8px",
          marginBottom: "24px",
          color: "#c4b5fd",
          fontSize: "30px",
          fontWeight: 800,
        }}
      >
        Confirm Your Booking
      </h1>
      {seats.length === 0 ? (
        <p>No seats selected. Please return to the seat-selection page.</p>
      ) : (
        <>
         <div
          style={{
            marginTop: "20px",
            padding: "18px",
            borderRadius: "12px",
            border: "1px solid #4c3b69",
            background: "#171126",
          }}
        >
          <p style={{ margin: "0 0 12px", color: "#a99cbd", fontSize: "13px" }}>
            SELECTED SEATS
          </p>

          <p
            style={{
              margin: "0 0 16px",
              color: "#4ade80",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            {seats.join(", ")}
          </p>

          <p style={{ margin: 0, color: "#e9ddff", fontSize: "14px" }}>
            Number of seats: <strong>{seats.length}</strong>
          </p>
        </div>
        <div
          style={{
            marginTop: "16px",
            padding: "18px",
            borderRadius: "12px",
            border: "1px solid #6d28d9",
            background: "linear-gradient(145deg, #211a35, #171126)",
          }}
        >
          <p style={{ margin: "0 0 8px", color: "#a99cbd", fontSize: "13px" }}>
            TOTAL BOOKING AMOUNT
          </p>

          <p
            style={{
              margin: 0,
              color: "#4ade80",
              fontSize: "26px",
              fontWeight: 800,
            }}
          >
            {show
              ? `₹${seats.length * show.ticketPrice}`
              : "Calculating..."}
          </p>

          <p style={{ margin: "8px 0 0", color: "#a99cbd", fontSize: "12px" }}>
            {seats.length} seat(s) × ₹{show?.ticketPrice ?? "—"} per seat
          </p>
        </div>
          <button
            onClick={confirmBooking}
            disabled={loading || seats.length === 0}
            style={{
              marginTop: "16px",
              padding: "12px 24px",
              borderRadius: "10px",
              border: "1px solid #a78bfa",
              background: loading ? "#51416f" : "#7c3aed",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading || seats.length === 0 ? "not-allowed" : "pointer",
              opacity: seats.length === 0 ? 0.6 : 1,
            }}
          >
            {loading ? "Confirming Booking..." : "Confirm Booking"}
          </button>
        </>
      )}

      {error && <p style={{ color: "#ff8b8b" }}>{error}</p>}
    </main>
  );
}

export default BookingConfirmation;
