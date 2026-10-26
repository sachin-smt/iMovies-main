const cron = require("node-cron");
const Booking = require("./models/Booking");
const { sendEmail } = require("./emailService");

function startReminderScheduler() {
  // Check for upcoming shows every 5 minutes.
  cron.schedule("*/5 * * * *", async () => {
    try {
        
        
        const processingTimeout = new Date(Date.now() - 15 * 60 * 1000);

       
        await Booking.updateOne(
        {
            _id: claimedBooking._id,
            reminderStatus: "processing",
        },
        {
            $set: {
            reminderStatus: "sent",
            reminderProcessingAt: null,
            },
        }
        );


      const now = new Date(); 
        const reminderTarget = new Date(
        now.getTime() + 24 * 60 * 60 * 1000
        );

        const reminderWindowStart = new Date(
        reminderTarget.getTime() - 5 * 60 * 1000
        );

        const reminderWindowEnd = new Date(
        reminderTarget.getTime() + 5 * 60 * 1000
        );

      // Find paid, confirmed bookings whose show starts
      // within the next 24 hours.
            
        const bookings = await Booking.find({
        status: "confirmed",
        paymentStatus: "paid",
        $or: [
            { reminderStatus: "pending" },
            { reminderStatus: { $exists: false } },
        ],
        })

        .populate("user", "name email")
        .populate({
          path: "show",
          populate: {
            path: "movie",
            select: "title",
          },
        });

      for (const booking of bookings) {
        const show = booking.show;
        const movie = show?.movie;
        const user = booking.user;
      
        if (process.env.NODE_ENV === "test") {
        console.log(
            `[TEST MODE] Reminder candidate: booking ${booking._id}`
        );
        continue;
        }

        if (!show || !user?.email) continue;

        const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        })
        .formatToParts(show.showDate)
        .reduce((result, part) => {
            if (part.type !== "literal") result[part.type] = part.value;
            return result;
        }, {});

        const [hours, minutes] = show.startTime.split(":").map(Number);

        const showStart = new Date(
        `${year}-${month}-${day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`
        );

        // Only send reminders during the 24-hour window.
        if (
        showStart < reminderWindowStart ||
        showStart > reminderWindowEnd
        ) {
        continue;
        }

        const movieTitle = movie?.title || "your movie";
        const showDate = showStart.toLocaleString("en-IN");
        const seats = booking.seats.join(", ");

        
        // Claim the booking before sending to prevent duplicate emails.
       
        const claimedBooking = await Booking.findOneAndUpdate(
        {
            _id: booking._id,
            status: "confirmed",
            paymentStatus: "paid",
            $or: [
            { reminderStatus: "pending" },
            { reminderStatus: { $exists: false } },
            ],
        },
        
        {
        $set: {
            reminderStatus: "processing",
            reminderProcessingAt: new Date(),
        },
        },

        { new: true }
        );

        if (!claimedBooking) {
          continue;
        }
        
        try {
          await sendEmail({
            to: user.email,
            subject: `Reminder: ${movieTitle} is coming up!`,
            text: `Hello ${user.name},\n\nYour movie is coming up soon!\n\nMovie: ${movieTitle}\nCinema: ${show.cinemaName}\nScreen: ${show.screenName}\nShowtime: ${showDate}\nSeats: ${seats}\n\nEnjoy your movie!\nTeam iMovies`,
            html: `
              <h2>Your movie is coming up!</h2>
              <p>Hello ${user.name},</p>
              <p>This is a reminder about your upcoming show.</p>
              <p><strong>Movie:</strong> ${movieTitle}</p>
              <p><strong>Cinema:</strong> ${show.cinemaName}</p>
              <p><strong>Screen:</strong> ${show.screenName}</p>
              <p><strong>Showtime:</strong> ${showDate}</p>
              <p><strong>Seats:</strong> ${seats}</p>
              <p>Enjoy your movie!<br />Team iMovies</p>
            `,
          });

          await Booking.updateOne(
            {
              _id: claimedBooking._id,
              reminderStatus: "processing",
            },
            {
            $set: {
                reminderStatus: "sent",
                reminderProcessingAt: null,
            },
            }
          );

          console.log(`Show reminder sent for booking ${booking._id}`);
        } catch (emailError) {
          await Booking.updateOne(
            {
              _id: claimedBooking._id,
              reminderStatus: "processing",
            },
           {
            $set: {
                reminderStatus: "pending",
                reminderProcessingAt: null,
            },
            }
            );

          console.error(
            `Reminder failed for booking ${booking._id}:`,
            emailError.message
          );
        }
      }
    } catch (error) {
      console.error("Show reminder scheduler error:", error.message);
    }
  });

  console.log("Upcoming-show reminder scheduler started.");
}

module.exports = { startReminderScheduler };
