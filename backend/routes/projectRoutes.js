const router = require("express").Router();
const Project = require("../models/Project");

// CREATE
router.post("/", async (req, res) => {
  try {
    // Prevent duplicate project by name + division
    const exists = await Project.findOne({
      name: req.body.name,
      division: req.body.division
    }).lean();
    if (exists) {
      return res.status(400).json({ error: "Project with same name and division already exists" });
    }
    const s = new Date(req.body.startDate);
    const e = new Date(req.body.endDate);
    if (isFinite(s) && isFinite(e) && e < s) {
      return res.status(400).json({ error: "End Date must be on or after Start Date" });
    }
    const project = await Project.create(req.body);
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET ALL
router.get("/", async (req, res) => {
  try {
    const list = await Project.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    // Prevent duplicates on update (name + division must be unique)
    const dup = await Project.findOne({
      name: req.body.name,
      division: req.body.division,
      _id: { $ne: req.params.id }
    }).lean();
    if (dup) {
      return res.status(400).json({ error: "Project with same name and division already exists" });
    }
    const s = new Date(req.body.startDate);
    const e = new Date(req.body.endDate);
    if (isFinite(s) && isFinite(e) && e < s) {
      return res.status(400).json({ error: "End Date must be on or after Start Date" });
    }
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
