const mongoose = require("mongoose");

const showSchema = new mongoose.Schema(
    {
        movie: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Movie",
            required: true
        },
        cinemaName: {
            type: String,
            required: true,
            trim: true
        },
        screenName: {
            type: String,
            required: true,
            trim: true
        },
        showDate: {
            type: Date,
            required: true
        },
        startTime: {
            type: String,
            required: true
        },
        ticketPrice: {
            type: Number,
            required: true,
            min: 0
        },
        totalSeats: {
            type: Number,
            required: true,
            min: 1
        },
        bookedSeats: {
            type: [String],
            default: []
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Show", showSchema);
