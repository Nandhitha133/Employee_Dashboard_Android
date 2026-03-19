const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const HolidayAllowance = require("../models/HolidayAllowance");

router.post("/bulk-save", auth, async (req, res) => {
  try {
    const { month, year, allowances } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    if (!Array.isArray(allowances) || allowances.length === 0) {
      return res.status(400).json({ message: "No allowances provided" });
    }

    const saved = [];

    for (const item of allowances) {
      if (!item.employeeId) {
        continue;
      }

      const filter = {
        employeeId: item.employeeId,
        month,
        year,
      };

      // Backend validation for ₹1500 limit on per day amount, not on the total
      let perDayAmountUsed = Number(item.perDayAmount) || 0;
      if (perDayAmountUsed > 1500) perDayAmountUsed = 1500;
      
      let calculatedHolidayTotal = Math.round((Number(item.holidayDays) || 0) * perDayAmountUsed);
      
      const calculatedShiftTotal = Math.round((Number(item.shiftAllottedAmount) || 0) * (Number(item.shiftDays) || 0));
      const calculatedTotalAmount = calculatedHolidayTotal + calculatedShiftTotal;

      const update = {
        $set: {
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          location: item.location,
          accountNumber: item.accountNumber,
          grossSalary: Number(item.grossSalary) || 0,
          month: Number(month),
          year: Number(year),
          holidayDays: Number(item.holidayDays) || 0,
          perDayAmount: perDayAmountUsed,
          holidayTotal: calculatedHolidayTotal,
          shiftAllottedAmount: Number(item.shiftAllottedAmount) || 0,
          shiftDays: Number(item.shiftDays) || 0,
          shiftTotal: calculatedShiftTotal,
          totalAmount: calculatedTotalAmount,
        }
      };

      const doc = await HolidayAllowance.findOneAndUpdate(filter, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      });

      saved.push(doc);
    }

    return res.status(201).json({
      message: "Holiday allowances saved successfully",
      count: saved.length,
      data: saved,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to save holiday allowances",
    });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const { month, year, location } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    const filter = {
      month: Number(month),
      year: Number(year),
    };

    if (location && location !== "All" && location !== "all") {
      filter.location = location;
    }

    const records = await HolidayAllowance.find(filter).sort({ employeeId: 1 });

    return res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch holiday allowances",
    });
  }
});

router.get("/summary", auth, async (req, res) => {
  try {
    const { month, year, location } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    const match = {
      month: Number(month),
      year: Number(year),
    };

    if (location && location !== "All" && location !== "all") {
      match.location = location;
    }

    const summaryAgg = await HolidayAllowance.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalGrossSalary: { $sum: "$grossSalary" },
          totalHolidayDays: { $sum: "$holidayDays" },
          totalHolidayAmount: { $sum: "$holidayTotal" },
          totalShiftDays: { $sum: "$shiftDays" },
          totalShiftAmount: { $sum: "$shiftTotal" },
          totalAmount: { $sum: "$totalAmount" },
          avgPerDayAmount: { $avg: "$perDayAmount" },
        },
      },
    ]);

    const summary =
      summaryAgg[0] || {
        totalEmployees: 0,
        totalGrossSalary: 0,
        totalHolidayDays: 0,
        totalHolidayAmount: 0,
        totalShiftDays: 0,
        totalShiftAmount: 0,
        totalAmount: 0,
        avgPerDayAmount: 0,
      };

    return res.json({
      success: true,
      month: Number(month),
      year: Number(year),
      location: location || null,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch holiday allowance summary",
    });
  }
});

module.exports = router;
