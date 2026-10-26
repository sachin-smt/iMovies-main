const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./models/User");
const Movie = require("./models/Movie");
const { protect, adminOnly } = require("./middleware/auth");
const Show = require("./models/Show");
const Booking = require("./models/Booking");
const Payment = require("./models/Payment");
const { sendEmail } = require("./emailService");
const { startReminderScheduler } = require("./reminderService");
const Favorite = require("./models/Favorite");

require("dotenv").config();

const Razorpay = require("razorpay");
const crypto = require("crypto");

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay API keys are missing from .env");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const app = express();

app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
    res.send("Welcome to IMovies API!");
});

// Register a new user
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        res.status(201).json({
            message: "Registration successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        console.error("Registration error:", error.message);
        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// Log in an existing user
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from .env");
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({
            message: "Login failed"
        });
    }
});


app.post("/api/auth/google", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                message: "Google credential is required"
            });
        }

        if (!process.env.GOOGLE_CLIENT_ID) {
            throw new Error("GOOGLE_CLIENT_ID is missing from .env");
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from .env");
        }

        const { OAuth2Client } = require("google-auth-library");
        const googleClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID
        );

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
            return res.status(401).json({
                message: "Google account could not be verified"
            });
        }

        const googleId = payload.sub;
        const email = payload.email.trim().toLowerCase();
        const name = payload.name || email.split("@")[0];

        let user = await User.findOne({ googleId });

        if (!user) {
            user = await User.findOne({ email });

            if (user) {
                return res.status(409).json({
                    message: "This email already has an account. Please sign in with your password first."
                });
            }

            user = await User.create({
                name,
                email,
                googleId
            });
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            message: "Google login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
      }catch (error) {
        console.error("Google login error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "This account may already exist. Please try signing in again."
            });
        }

        if (
            error.message?.includes("GOOGLE_CLIENT_ID is missing") ||
            error.message?.includes("JWT_SECRET is missing")
        ) {
            return res.status(500).json({
                message: "Server authentication configuration error"
            });
        }

        return res.status(401).json({
            message: "Google login failed. Please try again."
        });
    }
});


// Get all active movies
app.get("/api/movies", async (req, res) => {
    try {
        const movies = await Movie.find({ isActive: true })
            .sort({ createdAt: -1 });

        res.json(movies);
    } catch (error) {
        console.error("Fetch movies error:", error.message);
        res.status(500).json({
            message: "Failed to fetch movies"
        });
    }
});

// Get one movie by ID
app.get("/api/movies/:id", async (req, res) => {
    try {
        const movie = await Movie.findOne({
            _id: req.params.id,
            isActive: true
        });

        if (!movie) {
            return res.status(404).json({
                message: "Movie not found"
            });
        }

        res.json(movie);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid movie ID"
            });
        }

        res.status(500).json({
            message: "Failed to fetch movie"
        });
    }
});

// Add a movie (admins only)
app.post("/api/movies", protect, adminOnly, async (req, res) => {
    try {
        const {
            title,
            description,
            genre,
            duration,
            language,
            posterUrl,
            releaseDate,
            certificate
        } = req.body;

        if (
            !title ||
            !description ||
            !Array.isArray(genre) ||
            genre.length === 0 ||
            !duration ||
            !language
        ) {
            return res.status(400).json({
                message: "Title, description, genre, duration and language are required"
            });
        }

        const movie = await Movie.create({
            title,
            description,
            genre,
            duration,
            language,
            posterUrl,
            releaseDate,
            certificate
        });

        res.status(201).json({
            message: "Movie added successfully",
            movie
        });
    } catch (error) {
        console.error("Add movie error:", error.message);
        res.status(400).json({
            message: "Failed to add movie"
        });
    }
});


/* Edit a movie (admins only) */
app.put("/api/movies/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid movie ID" });
    }

    const allowedFields = [
      "title",
      "description",
      "genre",
      "duration",
      "language",
      "posterUrl",
      "releaseDate",
      "certificate",
      "isActive",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    if (updates.title !== undefined && !updates.title.trim()) {
      return res.status(400).json({ message: "Movie title cannot be empty" });
    }

    if (
      updates.genre !== undefined &&
      (!Array.isArray(updates.genre) || updates.genre.length === 0)
    ) {
      return res.status(400).json({ message: "Provide at least one genre" });
    }

    const movie = await Movie.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    return res.json({
      message: "Movie updated successfully",
      movie,
    });
  } catch (error) {
    console.error("Update movie error:", error.message);
    return res.status(400).json({ message: "Failed to update movie" });
  }
});


/* Delete a movie (admins only) */
app.delete("/api/movies/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid movie ID" });
    }

    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const linkedShows = await Show.exists({ movie: id });

    if (linkedShows) {
      return res.status(409).json({
        message: "This movie has showtimes and cannot be deleted. Deactivate it instead.",
      });
    }

    await Movie.findByIdAndDelete(id);

    return res.json({ message: "Movie deleted successfully" });
  } catch (error) {
    console.error("Delete movie error:", error.message);
    return res.status(500).json({ message: "Failed to delete movie" });
  }
});


 // Get upcoming shows for a movie
app.get("/api/movies/:movieId/shows", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.movieId)) {
            return res.status(400).json({
                message: "Invalid movie ID"
            });
        }

        const shows = await Show.find({
            movie: req.params.movieId,
            showDate: { $gte: new Date() }
        })
            .populate("movie", "title language duration")
            .sort({ showDate: 1 });

        res.json(shows);
    } catch (error) {
        console.error("Fetch shows error:", error.message);
        res.status(500).json({
            message: "Failed to fetch shows"
        });
    }
});

// Get all showtimes (admin only)
app.get("/api/shows", protect, adminOnly, async (req, res) => {
  try {
    const shows = await Show.find()
      .populate("movie", "title language duration")
      .sort({ showDate: 1, startTime: 1 });

    res.json(shows);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch showtimes",
    });
  }
});


app.delete("/api/shows/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid showtime ID",
      });
    }

    const show = await Show.findById(req.params.id);

    if (!show) {
      return res.status(404).json({
        message: "Showtime not found",
      });
    }

    const hasBookings = await Booking.exists({
      show: show._id,
    });

    if (hasBookings) {
      return res.status(409).json({
        message: "Cannot delete a showtime that has booking records.",
      });
    }

    await Show.findByIdAndDelete(show._id);

    res.json({
      message: "Showtime deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete showtime",
    });
  }
});

 // Get one show by ID
app.get("/api/shows/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid show ID",
      });
    }

    const show = await Show.findById(req.params.id)
      .populate("movie", "title language duration");

    if (!show) {
      return res.status(404).json({
        message: "Show not found",
      });
    }

    res.json(show);
  } catch (error) {
    console.error("Error fetching show:", error.message);
    res.status(500).json({
      message: "Failed to fetch show details",
    });
  }
});

 // Create a showtime (admin only)
app.post("/api/shows", protect, adminOnly, async (req, res) => {
  try {
    const {
      movieId,
      cinemaName,
      screenName,
      showDate,
      startTime,
      ticketPrice,
      totalSeats,
    } = req.body;

    if (
      !movieId ||
      !mongoose.isValidObjectId(movieId) ||
      !cinemaName?.trim() ||
      !screenName?.trim() ||
      !showDate ||
      !startTime ||
      ticketPrice == null ||
      totalSeats == null ||
      Number(ticketPrice) < 0 ||
      Number(totalSeats) < 1
    ) {
      return res.status(400).json({
        message: "Please provide valid showtime details",
      });
    }

    const movie = await Movie.findById(movieId);

    if (!movie || !movie.isActive) {
      return res.status(404).json({
        message: "Active movie not found",
      });
    }

    const parsedDate = new Date(showDate);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid show date",
      });
    }

    const show = await Show.create({
      movie: movieId,
      cinemaName: cinemaName.trim(),
      screenName: screenName.trim(),
      showDate: parsedDate,
      startTime,
      ticketPrice: Number(ticketPrice),
      totalSeats: Number(totalSeats),
      bookedSeats: [],
    });

    return res.status(201).json({
      message: "Showtime created successfully",
      show,
    });
  } catch (error) {
    console.error("Create showtime error:", error.message);
    return res.status(500).json({
      message: "Failed to create showtime",
    });
  }
});


 // Create a booking
app.post("/api/bookings", protect, async (req, res) => {
  return res.status(403).json({
  message: "Please complete payment to confirm your booking.",
});
    const session = await mongoose.startSession();

    try {
        const { showId, seats } = req.body;

        if (
            !showId ||
            !mongoose.isValidObjectId(showId) ||
            !Array.isArray(seats) ||
            seats.length === 0 ||
            seats.some(
                seat => typeof seat !== "string" || !seat.trim()
            ) ||
            new Set(seats).size !== seats.length
        ) {
            return res.status(400).json({
                message: "Provide a valid show ID and unique seat labels"
            });
        }

        let booking;

        await session.withTransaction(async () => {
            const show = await Show.findById(showId).session(session);

            if (!show) {
                throw new Error("SHOW_NOT_FOUND");
            }

            const [hours, minutes] = show.startTime.split(":").map(Number);

            const showStart = new Date(show.showDate);
            showStart.setHours(hours, minutes, 0, 0);

            if (showStart <= new Date()) {
                throw new Error("SHOW_ALREADY_STARTED");
            }

            const requestedSeats = seats.map(seat =>
              typeof seat === "string" ? seat.trim() : ""
            );

            // Validate seat count
            if (requestedSeats.length === 0 || requestedSeats.length > 6) {
              throw new Error("INVALID_SEAT_COUNT");
            }

            // Reject duplicate seats
            if (new Set(requestedSeats).size !== requestedSeats.length) {
              throw new Error("DUPLICATE_SEATS");
            }

            // Allow only rows A–F and seat numbers 1–8
            if (requestedSeats.some(seat => !/^[A-F][1-8]$/.test(seat))) {
              throw new Error("INVALID_SEAT_LABEL");
            }

            const availableSeatCount = requestedSeats.filter(
                seat => !show.bookedSeats.includes(seat)
            ).length;

            if (availableSeatCount !== requestedSeats.length) {
                throw new Error("SEAT_UNAVAILABLE");
            }

            const updatedShow = await Show.findOneAndUpdate(
                {
                    _id: showId,
                    bookedSeats: {
                        $nin: requestedSeats
                    }
                },
                {
                    $addToSet: {
                        bookedSeats: {
                            $each: requestedSeats
                        }
                    }
                },
                {
                    new: true,
                    session
                }
            );

            if (!updatedShow) {
                throw new Error("SEAT_UNAVAILABLE");
            }

            const createdBookings = await Booking.create(
                [{
                    user: req.user.userId,
                    show: showId,
                    seats: requestedSeats,
                    totalAmount: requestedSeats.length * show.ticketPrice
                }],
                { session }
            );

            booking = createdBookings[0];
        });

        return res.status(201).json({
            message: "Booking confirmed",
            booking
        });
    } catch (error) {
        if (error.message === "SHOW_NOT_FOUND") {
            return res.status(404).json({
                message: "Show not found"
            });
        }

        if (error.message === "SHOW_ALREADY_STARTED") {
            return res.status(400).json({
                message: "This show has already started"
            });
        }

        if (error.message === "INVALID_SEAT_LABEL") {
            return res.status(400).json({
                message: "Seat labels must look like A1, A2, B1, etc."
            });
        }

        if (error.message === "INVALID_SEAT_COUNT") {
          return res.status(400).json({
            message: "You can book between 1 and 6 seats."
          });
        }

        if (error.message === "DUPLICATE_SEATS") {
          return res.status(400).json({
            message: "Duplicate seats are not allowed."
          });
        }

        if (error.message === "SEAT_UNAVAILABLE") {
            return res.status(409).json({
                message: "One or more seats are already booked"
            });
        }

        console.error("Booking error:", error.message);
        return res.status(500).json({
            message: "Booking failed"
        });
    } finally {
        await session.endSession();
    }
});



/* Create a Razorpay order and save its payment record */
app.post("/api/payments/create-order", protect, async (req, res) => {
  try {
    const { showId, seats } = req.body;

    if (
      !showId ||
      !mongoose.isValidObjectId(showId) ||
      !Array.isArray(seats) ||
      seats.length < 1 ||
      seats.length > 6 ||
      seats.some((seat) => typeof seat !== "string" || !seat.trim())
    ) {
      return res.status(400).json({
        message: "Provide a valid show ID and between 1 and 6 seats",
      });
    }

    const requestedSeats = seats.map((seat) => seat.trim());

    if (
      new Set(requestedSeats).size !== requestedSeats.length ||
      requestedSeats.some((seat) => !/^[A-F][1-8]$/.test(seat))
    ) {
      return res.status(400).json({
        message: "Seat labels must be unique and valid (A1–F8)",
      });
    }

    const show = await Show.findById(showId);

    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }

    const [hours, minutes] = show.startTime.split(":").map(Number);
    const showStart = new Date(show.showDate);
    showStart.setHours(hours, minutes, 0, 0);

    if (showStart <= new Date()) {
      return res.status(400).json({
        message: "This show has already started",
      });
    }

    if (requestedSeats.some((seat) => show.bookedSeats.includes(seat))) {
      return res.status(409).json({
        message: "One or more seats are already booked",
      });
    }

    const amountInPaise = Math.round(
      requestedSeats.length * show.ticketPrice * 100
    );

    if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
      return res.status(400).json({
        message: "Invalid payment amount",
      });
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `imovies_${new mongoose.Types.ObjectId()}`,
      notes: {
        userId: req.user.userId.toString(),
        showId: show._id.toString(),
        seats: requestedSeats.join(","),
      },
    });

    try {
      await Payment.create({
        user: req.user.userId,
        show: show._id,
        seats: requestedSeats,
        amount: amountInPaise,
        currency: "INR",
        razorpayOrderId: order.id,
        status: "created",
      });
    } catch (dbError) {
      console.error("Save payment record error:", dbError.message);

      // The Razorpay order exists, but its database record could not be saved.
      // Do not return it to the frontend.
      return res.status(500).json({
        message: "Could not save payment details. Please try again.",
      });
    }

    return res.status(201).json({
      message: "Payment order created",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create payment order error:", error.message);

    return res.status(500).json({
      message: "Unable to create payment order",
    });
  }
});



/* Verify Razorpay payment and create a booking atomically */

app.post("/api/payments/verify", protect, async (req, res) => {
  const session = await mongoose.startSession();
  let paymentRecord = null;
  let razorpay_payment_id = null;
  let razorpayPaymentCaptured = false;

  try {

    const {
     razorpay_order_id,
     razorpay_signature,
    } = req.body;

    razorpay_payment_id = req.body.razorpay_payment_id;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: "Payment verification details are required",
      });
    }

    paymentRecord = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user.userId,
    });

    if (!paymentRecord) {
      return res.status(404).json({
        message: "Payment order not found",
      });
    }

    // Return the existing booking for an already processed payment.
    
    // Return the existing booking for an already processed payment.
    if (paymentRecord.status === "paid" && paymentRecord.booking) {
      const existingBooking = await Booking.findById(
        paymentRecord.booking
      )
        .populate({
          path: "show",
          populate: { path: "movie" },
        });

      if (!existingBooking) {
        return res.status(409).json({
          message:
            "Payment was verified, but the booking record could not be found. Please contact support.",
          paymentStatus: "paid",
          bookingId: paymentRecord.booking,
        });
      }

      return res.json({
        message: "Payment already verified",
        paymentStatus: "paid",
        booking: existingBooking,
        bookingId: existingBooking._id,
      });
    }


    if (paymentRecord.status !== "created") {
      return res.status(409).json({
        message: "This payment cannot be processed again",
      });
    }

    // Verify the Razorpay signature.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
      return res.status(400).json({
        message: "Invalid payment signature",
      });
    }

    const received = Buffer.from(razorpay_signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(400).json({
        message: "Invalid payment signature",
      });
    }

    // Confirm the payment directly with Razorpay.
    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      razorpayPayment.order_id !== paymentRecord.razorpayOrderId ||
      razorpayPayment.status !== "captured" ||
      razorpayPayment.amount !== paymentRecord.amount ||
      razorpayPayment.currency !== paymentRecord.currency
      
    ) {
      return res.status(400).json({
        message: "Payment is not captured or its details do not match",
      });
    }
    razorpayPaymentCaptured = true;

    let createdBooking;

    await session.withTransaction(async () => {
      // Atomically claim this payment for processing.
      const claimedPayment = await Payment.findOneAndUpdate(
        {
          _id: paymentRecord._id,
          status: "created",
          booking: null,
        },
        {
          $set: {
            status: "processing",
            razorpayPaymentId: razorpay_payment_id,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!claimedPayment) {
        throw new Error("PAYMENT_ALREADY_PROCESSED");
      }

      const show = await Show.findById(paymentRecord.show).session(session);

      if (!show) {
        throw new Error("SHOW_NOT_FOUND");
      }

      const [hours, minutes] = show.startTime.split(":").map(Number);
      const showStart = new Date(show.showDate);
      showStart.setHours(hours, minutes, 0, 0);

      if (showStart <= new Date()) {
        throw new Error("SHOW_ALREADY_STARTED");
      }

      // Recalculate the amount using the current server-side ticket price.
      const expectedAmount = Math.round(
        paymentRecord.seats.length * show.ticketPrice * 100
      );

      if (expectedAmount !== paymentRecord.amount) {
        throw new Error("PAYMENT_AMOUNT_MISMATCH");
      }

      if (
        paymentRecord.seats.length < 1 ||
        paymentRecord.seats.length > 6 ||
        new Set(paymentRecord.seats).size !== paymentRecord.seats.length ||
        paymentRecord.seats.some((seat) => !/^[A-F][1-8]$/.test(seat))
      ) {
        throw new Error("INVALID_SEATS");
      }

      const updatedShow = await Show.findOneAndUpdate(
        {
          _id: show._id,
          bookedSeats: { $nin: paymentRecord.seats },
        },
        {
          $addToSet: {
            bookedSeats: { $each: paymentRecord.seats },
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!updatedShow) {
        throw new Error("SEAT_UNAVAILABLE");
      }

      const bookings = await Booking.create(
        [
          {
            user: paymentRecord.user,
            show: paymentRecord.show,
            seats: paymentRecord.seats,
            totalAmount: paymentRecord.amount / 100,
            status: "confirmed",
            paymentStatus: "paid",
            razorpayOrderId: paymentRecord.razorpayOrderId,
            razorpayPaymentId: razorpay_payment_id,
          },
        ],
        { session }
      );

      createdBooking = bookings[0];

      claimedPayment.status = "paid";
      claimedPayment.booking = createdBooking._id;
      await claimedPayment.save({ session });
    });

    
    // Load complete booking details for email notifications.
    const bookingForEmail = await Booking.findById(createdBooking._id)
      .populate("user", "name email")
      .populate({
        path: "show",
        populate: {
          path: "movie",
          select: "title",
        },
      });

    
    // Send booking confirmation and payment receipt emails.
    if (bookingForEmail) {
      try {
        const show = bookingForEmail.show;
        const movie = show?.movie;
        const user = bookingForEmail.user;

        if (user?.email && show) {
          const showDate = new Date(show.showDate).toLocaleDateString(
            "en-IN",
            {
              day: "numeric",
              month: "long",
              year: "numeric",
            }
          );

          const seats = bookingForEmail.seats.join(", ");
          const amount = `₹${bookingForEmail.totalAmount.toFixed(2)}`;
          const movieTitle = movie?.title || "Movie";
          const bookingId = bookingForEmail._id.toString();

          const emailDetails = `
            Movie: ${movieTitle}
            Cinema: ${show.cinemaName}
            Screen: ${show.screenName}
            Date: ${showDate}
            Time: ${show.startTime}
            Seats: ${seats}
            Booking reference: ${bookingId}
            Amount paid: ${amount}
            Payment ID: ${bookingForEmail.razorpayPaymentId}
            `;

          await sendEmail({
            to: user.email,
            subject: `iMovies Booking Confirmed - ${movieTitle}`,
            text: `Hello ${user.name},\n\nYour booking is confirmed and your payment was verified successfully.\n\n${emailDetails}\n\nEnjoy your movie!\nTeam iMovies`,
            html: `
              <h2>Booking Confirmed!</h2>
              <p>Hello ${user.name},</p>
              <p>Your payment was verified successfully and your booking is confirmed.</p>
              <pre>${emailDetails}</pre>
              <p>Enjoy your movie!<br/>Team iMovies</p>
            `,
          });

          await sendEmail({
            to: user.email,
            subject: `iMovies Payment Receipt - ${bookingId}`,
            text: `Hello ${user.name},\n\nYour payment receipt is ready.\n\n${emailDetails}\n\nThank you for booking with iMovies.`,
            html: `
              <h2>Payment Receipt</h2>
              <p>Hello ${user.name},</p>
              <p>Your payment was successfully verified.</p>
              <pre>${emailDetails}</pre>
              <p>Thank you for booking with iMovies.</p>
            `,
          });

          console.log("Booking confirmation and receipt emails sent.");
        }
      } catch (emailError) {
        console.error(
          "Booking email notification failed:",
          emailError.message
        );
      }
    }
  

    return res.json({
      message: "Payment verified and booking confirmed",
      paymentStatus: "paid",
      booking: bookingForEmail,
    });

  } catch (error) {
    console.error("Payment verification error:", error.message);

        if (
      razorpayPaymentCaptured &&
      paymentRecord &&
      paymentRecord.status !== "paid" &&
      typeof razorpay_payment_id === "string"
    ) {
      try {
        const currentPayment = await razorpay.payments.fetch(
          razorpay_payment_id
        );

        if (
          currentPayment.order_id === paymentRecord.razorpayOrderId &&
          currentPayment.status === "captured" &&
          currentPayment.amount === paymentRecord.amount &&
          currentPayment.currency === paymentRecord.currency
        ) {
          await Payment.updateOne(
            {
              _id: paymentRecord._id,
              status: { $in: ["created", "processing"] },
            },
            {
              $set: {
                status: "reconciliation_required",
                razorpayPaymentId: razorpay_payment_id,
              },
            }
          );
        }
      } catch (recoveryError) {
        console.error(
          "Payment recovery error:",
          recoveryError.message
        );
      }
    }

    if (error.message === "PAYMENT_ALREADY_PROCESSED") {
      return res.status(409).json({
        message: "This payment is already being processed or was processed",
      });
    }

    if (error.message === "SHOW_NOT_FOUND") {
      return res.status(404).json({ message: "Show not found" });
    }

    if (error.message === "SHOW_ALREADY_STARTED") {
      return res.status(400).json({
        message: "This show has already started",
      });
    }

    
    if (error.message === "SEAT_UNAVAILABLE") {
      await Payment.updateOne(
        {
          _id: paymentRecord?._id,
          status: { $in: ["created", "processing"] },
        },
        {
          $set: { status: "reconciliation_required" },
        }
      );

      return res.status(409).json({
        message:
          "Payment was received, but one or more seats are unavailable. Your payment needs reconciliation; please contact support.",
        paymentStatus: "reconciliation_required",
      });
    }


    if (error.message === "PAYMENT_AMOUNT_MISMATCH") {
      return res.status(409).json({
        message:
          "The ticket price has changed. Payment was received; contact support for a refund.",
      });
    }

    if (error.message === "INVALID_SEATS") {
      return res.status(400).json({
        message: "The saved seat selection is invalid",
      });
    }

    return res.status(500).json({
      message: "Unable to complete payment verification",
    });
  } finally {
    await session.endSession();
  }
});



 // Get bookings for the logged-in user
app.get("/api/bookings/my", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.userId })
      .populate({
        path: "show",
        populate: {
          path: "movie",
          select: "title language duration posterUrl",
        },
      })
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("Fetch my bookings error:", error.message);
    res.status(500).json({
      message: "Failed to fetch your bookings",
    });
  }
});


/* Cancel a booking and release its seats atomically */
app.patch("/api/bookings/:bookingId/cancel", protect, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { bookingId } = req.params;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    let cancelledBooking;

    await session.withTransaction(async () => {
      const booking = await Booking.findOne({
        _id: bookingId,
        user: req.user.userId,
      }).session(session);

      if (!booking) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      if (booking.status === "cancelled") {
        throw new Error("BOOKING_ALREADY_CANCELLED");
      }

      const show = await Show.findById(booking.show).session(session);

      if (!show) {
        throw new Error("SHOW_NOT_FOUND");
      }

      // Combine the show date and start time.
      const [hours, minutes] = show.startTime.split(":").map(Number);
      const showStart = new Date(show.showDate);
      showStart.setHours(hours, minutes, 0, 0);

      if (showStart <= new Date()) {
        throw new Error("SHOW_ALREADY_STARTED");
      }

      // Release the seats belonging to this booking.
      show.bookedSeats = show.bookedSeats.filter(
        (seat) => !booking.seats.includes(seat)
      );

      // Mark the booking as cancelled.
      booking.status = "cancelled";

      // Both changes must commit together.
      await show.save({ session });
      await booking.save({ session });

      cancelledBooking = booking;
    });

    return res.json({
      message: "Booking cancelled successfully",
      booking: cancelledBooking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error.message);

    if (error.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (error.message === "SHOW_NOT_FOUND") {
      return res.status(404).json({ message: "Showtime not found" });
    }

    if (error.message === "BOOKING_ALREADY_CANCELLED") {
      return res.status(400).json({
        message: "Booking is already cancelled",
      });
    }

    if (error.message === "SHOW_ALREADY_STARTED") {
      return res.status(400).json({
        message: "Past or started showtimes cannot be cancelled",
      });
    }

    return res.status(500).json({
      message: "Failed to cancel booking",
    });
  } finally {
    await session.endSession();
  }
});


/* Add a movie to favorites */
app.post("/api/favorites/:movieId", protect, async (req, res) => {
  try {
    const { movieId } = req.params;

    if (!mongoose.isValidObjectId(movieId)) {
      return res.status(400).json({ message: "Invalid movie ID" });
    }

    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const favorite = await Favorite.findOneAndUpdate(
      {
        user: req.user.userId,
        movie: movieId,
      },
      {
        $setOnInsert: {
          user: req.user.userId,
          movie: movieId,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
      }
    );

    return res.status(200).json({
      message: "Movie added to favorites",
      favorite,
    });
  } catch (error) {
    console.error("Add favorite error:", error.message);

    return res.status(500).json({
      message: "Failed to add favorite",
    });
  }
});

/* Get the logged-in user's favorites */
app.get("/api/favorites/my", protect, async (req, res) => {
  try {
    const favorites = await Favorite.find({
      user: req.user.userId,
    })
      .populate("movie")
      .sort({ createdAt: -1 });

    return res.json({ favorites });
  } catch (error) {
    console.error("Get favorites error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch favorites",
    });
  }
});

/* Remove a movie from favorites */
app.delete("/api/favorites/:movieId", protect, async (req, res) => {
  try {
    const { movieId } = req.params;

    if (!mongoose.isValidObjectId(movieId)) {
      return res.status(400).json({ message: "Invalid movie ID" });
    }

    const favorite = await Favorite.findOneAndDelete({
      user: req.user.userId,
      movie: movieId,
    });

    if (!favorite) {
      return res.status(404).json({
        message: "Favorite not found",
      });
    }

    return res.json({
      message: "Movie removed from favorites",
    });
  } catch (error) {
    console.error("Remove favorite error:", error.message);

    return res.status(500).json({
      message: "Failed to remove favorite",
    });
  }
});


 // Start server after MongoDB connects
async function startServer() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing from .env");
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully!");

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`IMovies server is running on port ${PORT}`);

            // Start upcoming-show reminder emails
            startReminderScheduler();
        });
    } catch (error) {
        console.error("Startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
