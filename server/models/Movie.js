const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        genre: {
            type: [String],
            required: true
        },
        duration: {
            type: Number,
            required: true,
            min: 1
        },
        language: {
            type: String,
            required: true
        },
        posterUrl: {
            type: String,
            default: ""
        },
        releaseDate: {
            type: Date
        },
        certificate: {
            type: String,
            default: "Not Rated"
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Movie", movieSchema);
