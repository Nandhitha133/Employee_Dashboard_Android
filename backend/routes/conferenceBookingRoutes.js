const express = require("express");
const auth = require("../middleware/auth");
const ConferenceBooking = require("../models/ConferenceBooking");

const router = express.Router();

// Get all bookings
router.get("/", auth, async (req, res) => {
  try {
    const { date, location } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (location) filter.location = location;

    const bookings = await ConferenceBooking.find(filter).sort({ startTime: 1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Helper: check overlap
function hasOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

// Helper: get alternatives
function getAlternatives(existingBookings) {
  const standardSlots = [
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "12:00", end: "13:00" },
    { start: "13:45", end: "14:45" },
    { start: "14:45", end: "15:45" },
    { start: "15:45", end: "16:45" },
    { start: "16:45", end: "17:45" }
  ];

  return standardSlots.filter(slot => {
    const conflict = existingBookings.some(booking => {
      if (booking.status === "Cancelled" || booking.status === "Rejected") return false;
      return hasOverlap(booking.startTime, booking.endTime, slot.start, slot.end);
    });
    return !conflict;
  });
}

// Create booking
router.post("/", auth, async (req, res) => {
  try {
    const { title, date, startTime, endTime, reason, division, location } = req.body;

    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Title, date, startTime, and endTime are required" });
    }

    // Check division/location rules for non-admin/HR
    const role = req.user.role?.toLowerCase() || "employees";
    const employeeLocation = req.user.location || "Hosur";
    const employeeDivision = req.user.division || "SDS";

    const isPrivileged = ["admin", "hr", "director"].includes(role);
    if (!isPrivileged) {
      // Must be Hosur branch AND (SDS, TEKLA, or DAS division)
      const matchesLocation = employeeLocation.toLowerCase() === "hosur";
      const matchesDivision = ["sds", "tekla", "das"].includes(employeeDivision.toLowerCase());

      if (!matchesLocation || !matchesDivision) {
        return res.status(403).json({ 
          message: "Office Sync is restricted to Hosur branch and SDS/TEKLA/DAS Software divisions." 
        });
      }
    }

    // Get active bookings for this date and location
    const activeBookings = await ConferenceBooking.find({
      date,
      location: location || "Hosur",
      status: { $in: ["Approved", "Pending", "Blocked"] }
    });

    // Check for overlap
    const conflict = activeBookings.some(booking => 
      hasOverlap(booking.startTime, booking.endTime, startTime, endTime)
    );

    if (conflict) {
      const alternatives = getAlternatives(activeBookings);
      return res.status(400).json({
        conflict: true,
        message: "Conference Room is already booked for this slot.",
        alternatives
      });
    }

    // Default status: Approved for Admin/HR/Director, Pending for others
    const bookingStatus = isPrivileged ? "Approved" : "Pending";

    const newBooking = await ConferenceBooking.create({
      title,
      date,
      startTime,
      endTime,
      reason,
      division: isPrivileged ? (division || "All") : employeeDivision,
      location: location || "Hosur",
      bookedBy: req.user.employeeId || req.user.username || "SYSTEM",
      bookedByName: req.user.name || "Employee",
      bookedByEmail: req.user.email || "",
      status: bookingStatus
    });

    res.status(201).json(newBooking);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Block slot (Admin/HR only)
router.post("/block", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (!["admin", "hr", "director"].includes(role)) {
      return res.status(403).json({ message: "Access denied: Admin/HR/Director only" });
    }

    const { title, date, startTime, endTime, reason, location } = req.body;

    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Title, date, startTime, and endTime are required" });
    }

    // Overwrite any overlapping bookings or reject block?
    // Reject overlapping bookings by cancelling them automatically, or return conflict?
    // Let's cancel any overlapping bookings that are not Blocked, and mark this Blocked.
    const overlapping = await ConferenceBooking.find({
      date,
      location: location || "Hosur",
      status: { $in: ["Pending", "Approved"] }
    });

    for (const b of overlapping) {
      if (hasOverlap(b.startTime, b.endTime, startTime, endTime)) {
        b.status = "Cancelled";
        b.adminComments = "Cancelled due to slot blocking: " + title;
        await b.save();
      }
    }

    const blockedSlot = await ConferenceBooking.create({
      title,
      date,
      startTime,
      endTime,
      reason,
      division: "All",
      location: location || "Hosur",
      bookedBy: "SYSTEM",
      bookedByName: "Administrator",
      status: "Blocked",
      isLunchBreak: title.toLowerCase().includes("lunch")
    });

    res.status(201).json(blockedSlot);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update booking status
router.put("/:id/status", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComments } = req.body;

    const booking = await ConferenceBooking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const role = req.user.role?.toLowerCase();
    const isOwner = booking.bookedBy === req.user.employeeId;
    const isPrivileged = ["admin", "hr", "director"].includes(role);

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ message: "Not authorized to modify this booking" });
    }

    // If cancelled by owner or approved/rejected by admin
    if (status) booking.status = status;
    if (adminComments !== undefined) booking.adminComments = adminComments;

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete slot (Admin/HR only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (!["admin", "hr", "director"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const booking = await ConferenceBooking.findByIdAndDelete(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
