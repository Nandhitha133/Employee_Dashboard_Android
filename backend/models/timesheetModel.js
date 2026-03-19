// const mongoose = require("mongoose");

// const TimesheetEntrySchema = new mongoose.Schema({
//   project: { type: String, required: true },
//   task: { type: String, required: true },
//   hours: { type: [Number], default: [0, 0, 0, 0, 0, 0, 0] }, // Mon–Sun
// });

// const TimesheetSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     weekStartDate: { type: Date, required: true },
//     weekEndDate: { type: Date, required: true },
//     entries: { type: [TimesheetEntrySchema], default: [] },
//     totalHours: { type: Number, default: 0 },
//     status: {
//       type: String,
//       enum: ["submitted", "approved", "rejected"],
//       default: "submitted",
//     },
//     submittedAt: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );

// // ✅ Auto-calculate total hours before saving
// TimesheetSchema.pre("save", function (next) {
//   try {
//     this.totalHours = (this.entries || []).reduce((sum, entry) => {
//       const rowTotal = (entry.hours || []).reduce((a, b) => a + (Number(b) || 0), 0);
//       return sum + rowTotal;
//     }, 0);
//   } catch {
//     this.totalHours = this.totalHours || 0;
//   }
//   next();
// });

// // ✅ Prevent OverwriteModelError
// module.exports =
//   mongoose.models.Timesheet || mongoose.model("Timesheet", TimesheetSchema);
