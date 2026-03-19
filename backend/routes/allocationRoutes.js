const router = require("express").Router();
const Allocation = require("../models/Allocation");
const Project = require("../models/Project");
const Employee = require("../models/Employee");

// CREATE ALLOCATION
router.post("/", async (req, res) => {
  try {
    const { projectName, employeeName, employeeCode } = req.body;

    const project = await Project.findOne({ name: projectName });
    // Prefer matching by employeeCode (unique) when provided; fallback to name
    let employee = null;
    if (employeeCode) {
      employee = await Employee.findOne({ employeeId: employeeCode });
    }
    if (!employee && employeeName) {
      employee = await Employee.findOne({ name: employeeName });
    }

    if (!project) return res.status(400).json({ error: "Project not found" });
    if (!employee) return res.status(400).json({ error: "Employee not found" });

    // Prevent duplicate allocation (same project + employee)
    const existing = await Allocation.findOne({
      projectId: project._id,
      employeeId: employee._id
    }).lean();
    if (existing) {
      return res.status(400).json({ error: "Duplicate allocation detected for this project and employee" });
    }

    req.body.projectId = project._id;
    req.body.projectCode = project.code;
    req.body.projectDivision = project.division;

    req.body.employeeId = employee._id;
    req.body.employeeCode = employee.employeeId;

    const allocation = await Allocation.create(req.body);

    res.json(allocation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET ALL
router.get("/", async (req, res) => {
  try {
    const list = await Allocation.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await Allocation.findByIdAndDelete(req.params.id);
    res.json({ message: "Allocation deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE ALLOCATION
router.put("/:id", async (req, res) => {
  try {
    const { projectName, employeeName, employeeCode } = req.body;

    // Find project by name
    const project = await Project.findOne({ name: projectName });
    if (!project) return res.status(400).json({ error: "Project not found" });

    // Find employee by name
    // Prefer matching by employeeCode (unique) when provided; fallback to name
    let employee = null;
    if (employeeCode) {
      employee = await Employee.findOne({ employeeId: employeeCode });
    }
    if (!employee && employeeName) {
      employee = await Employee.findOne({ name: employeeName });
    }
    if (!employee) return res.status(400).json({ error: "Employee not found" });

    // Get existing allocation to preserve role if not provided
    const existingAllocation = await Allocation.findById(req.params.id);
    if (!existingAllocation) {
      return res.status(404).json({ error: "Allocation not found" });
    }

    // Prevent duplicate allocation on update (same project + employee, different record)
    const dup = await Allocation.findOne({
      projectId: project._id,
      employeeId: employee._id,
      _id: { $ne: existingAllocation._id }
    }).lean();
    if (dup) {
      return res.status(400).json({ error: "Duplicate allocation detected for this project and employee" });
    }

    // Update the allocation with new data, preserving role if not provided
    const updateData = {
      ...req.body,
      projectId: project._id,
      projectCode: project.code,
      projectDivision: project.division,
      employeeId: employee._id,
      employeeCode: employee.employeeId,
    };

    // Only update role if it's explicitly provided in the request
    if (req.body.role === undefined || req.body.role === null) {
      updateData.role = existingAllocation.role;
    }

    const updatedAllocation = await Allocation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedAllocation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
