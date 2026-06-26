const mongoose = require("mongoose");

const ConferenceBookingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  startTime: { type: String, required: true }, // Format: HH:MM
  endTime: { type: String, required: true }, // Format: HH:MM
  reason: { type: String },
  bookedBy: { type: String, required: true }, // Employee ID or SYSTEM
  bookedByName: { type: String },
  bookedByEmail: { type: String },
  division: { type: String, default: "All" },
  location: { type: String, default: "Hosur" },
  status: { 
    type: String, 
    enum: ["Pending", "Approved", "Rejected", "Cancelled", "Blocked"], 
    default: "Pending" 
  },
  adminComments: { type: String, default: "" },
  isLunchBreak: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("ConferenceBooking", ConferenceBookingSchema);
