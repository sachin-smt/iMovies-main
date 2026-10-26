const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: true,
    },
    seats: {
      type: [String],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },

    booking: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "Booking",
     default: null,
    },
    status: {
      type: String,
      enum: [
     "created",
     "processing",
     "paid",
     "failed",
     "expired",
     "reconciliation_required",
     ],
     default: "created",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
