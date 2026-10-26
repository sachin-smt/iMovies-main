const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        show: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Show",
            required: true
        },
        seats: {
            type: [String],
            required: true,
            validate: {
                validator: function (seats) {
                    return (
                        seats.length > 0 &&
                        new Set(seats).size === seats.length
                    );
                },
                message: "Select at least one unique seat"
            }
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "cancelled"],
            default: "confirmed"
            },

            paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending"
            },

            reminderStatus: {
            type: String,
            enum: ["pending", "processing", "sent"],
            default: "pending"
            },

            reminderProcessingAt: {
            type: Date,
            default: null
            },

            razorpayOrderId: {
            type: String,
            default: null
            },

            razorpayPaymentId: {
            type: String,
            default: null
            }
                },
    { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
