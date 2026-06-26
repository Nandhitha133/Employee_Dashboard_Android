const express = require("express");
const auth = require("../middleware/auth");
const Asset = require("../models/Asset");
const AssetTicket = require("../models/AssetTicket");
const AssetRequest = require("../models/AssetRequest");
const AssetMaintenance = require("../models/AssetMaintenance");
const Employee = require("../models/Employee");

const router = express.Router();

// Helper: Seed mock data if collections are empty
async function seedMockData() {
  const assetCount = await Asset.countDocuments();
  if (assetCount === 0) {
    // Create seed assets
    const seedAssets = [
      {
        id: "AST-001",
        name: "Developer Laptop",
        category: "Laptop",
        type: "Hardware",
        brandModel: "Dell Latitude 5420",
        serialNumber: "DELL5420X1",
        purchaseDate: "2024-01-15",
        warrantyExpiry: "2027-01-15",
        vendor: "Dell Direct",
        cost: 65000,
        status: "Assigned",
        condition: "Excellent",
        location: "Chennai Office",
        assignedToId: "CDE001",
        assignedToName: "Nandhitha R",
        allocatedDate: "2024-01-20"
      },
      {
        id: "AST-002",
        name: "HR Macbook",
        category: "Laptop",
        type: "Hardware",
        brandModel: "Macbook Air M2",
        serialNumber: "APPLEMACM2",
        purchaseDate: "2024-02-10",
        warrantyExpiry: "2025-02-10",
        vendor: "Apple Retail",
        cost: 99000,
        status: "Assigned",
        condition: "Excellent",
        location: "Chennai Office",
        assignedToId: "CDE002",
        assignedToName: "Admin User",
        allocatedDate: "2024-02-15"
      },
      {
        id: "AST-003",
        name: "Testing Monitor",
        category: "Monitor",
        type: "Hardware",
        brandModel: "LG UltraGear 27\"",
        serialNumber: "LGMON27G",
        purchaseDate: "2023-11-05",
        warrantyExpiry: "2026-11-05",
        vendor: "LG Systems",
        cost: 18500,
        status: "Available",
        condition: "Good",
        location: "Hosur Office"
      },
      {
        id: "AST-004",
        name: "Design Station PC",
        category: "Desktop",
        type: "Hardware",
        brandModel: "HP Pavilion Tower",
        serialNumber: "HPDESK981",
        purchaseDate: "2023-08-20",
        warrantyExpiry: "2025-08-20",
        vendor: "HP India",
        cost: 54000,
        status: "Damaged",
        condition: "Fair",
        location: "Chennai Office"
      }
    ];

    await Asset.insertMany(seedAssets);
    console.log("✅ Seeded Assets");

    // Create seed requests
    const seedRequests = [
      {
        id: "REQ-001",
        employeeId: "CDE001",
        employeeName: "Nandhitha R",
        category: "Headset",
        requestType: "New Asset",
        reason: "Need noise cancellation headset for client calls",
        status: "Pending",
        requestDate: "2026-06-10"
      },
      {
        id: "REQ-002",
        employeeId: "CDE003",
        employeeName: "Siddharth S",
        category: "Monitor",
        requestType: "New Asset",
        reason: "Need secondary monitor for software development layout coding",
        status: "Approved",
        requestDate: "2026-06-08"
      }
    ];
    await AssetRequest.insertMany(seedRequests);

    // Create seed tickets
    const seedTickets = [
      {
        id: "TCK-101",
        assetId: "AST-001",
        assetName: "Developer Laptop",
        employeeId: "CDE001",
        employeeName: "Nandhitha R",
        issueType: "Laptop Issue",
        description: "Operating system lagging significantly and battery draining under 1 hour",
        priority: "High",
        status: "Pending",
        createdAtDate: "2026-06-11",
        timeline: [
          { date: "2026-06-11", status: "Ticket Created", note: "Ticket raised by employee Nandhitha R" }
        ]
      }
    ];
    await AssetTicket.insertMany(seedTickets);

    // Create seed maintenance
    const seedMaintenance = [
      {
        id: "MNT-201",
        assetId: "AST-004",
        assetName: "Design Station PC",
        maintenanceType: "Repair",
        cost: 4500,
        startDate: "2026-06-12",
        endDate: "2026-06-14",
        vendorName: "HP Support Care",
        status: "Scheduled",
        description: "Motherboard capacitor replacement and diagnostic health checks"
      }
    ];
    await AssetMaintenance.insertMany(seedMaintenance);
  }
}

// Ensure seeding on route query
router.use(async (req, res, next) => {
  try {
    await seedMockData();
  } catch (err) {
    console.error("Auto seeding error:", err);
  }
  next();
});

// --- ASSET ENDPOINTS ---

// Get all assets
router.get("/", auth, async (req, res) => {
  try {
    const assets = await Asset.find().sort({ createdAt: -1 });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Create asset
router.post("/", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (!["admin", "hr", "director"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, category, type, brandModel, serialNumber, purchaseDate, warrantyExpiry, vendor, cost, condition, location } = req.body;

    const count = await Asset.countDocuments();
    const generatedId = `AST-${String(count + 1).padStart(3, "0")}`;

    const newAsset = await Asset.create({
      id: generatedId,
      name,
      category,
      type: type || "Hardware",
      brandModel,
      serialNumber,
      purchaseDate,
      warrantyExpiry,
      vendor,
      cost: parseFloat(cost) || 0,
      condition: condition || "Excellent",
      location: location || "Chennai Office",
      status: "Available"
    });

    res.status(201).json(newAsset);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update asset
router.put("/:id", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (!["admin", "hr", "director"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const asset = await Asset.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );

    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete asset
router.delete("/:id", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (!["admin", "hr", "director"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const asset = await Asset.findOneAndDelete({ id: req.params.id });
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json({ message: "Asset deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Allocate asset
router.post("/allocate", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (!["admin", "hr", "director"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { assetId, assignedToId, assignedToName, allocatedDate } = req.body;

    const asset = await Asset.findOne({ id: assetId });
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    asset.status = "Assigned";
    asset.assignedToId = assignedToId;
    asset.assignedToName = assignedToName || "Employee";
    asset.allocatedDate = allocatedDate || new Date().toISOString().split("T")[0];

    await asset.save();
    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Deallocate asset
router.post("/deallocate", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (!["admin", "hr", "director"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { assetId } = req.body;

    const asset = await Asset.findOne({ id: assetId });
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    asset.status = "Available";
    asset.assignedToId = null;
    asset.assignedToName = null;
    asset.allocatedDate = null;

    await asset.save();
    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- SUPPORT TICKETS ENDPOINTS ---

// Get all tickets
router.get("/tickets", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    let tickets;
    if (["admin", "hr", "director"].includes(role)) {
      tickets = await AssetTicket.find().sort({ createdAt: -1 });
    } else {
      tickets = await AssetTicket.find({ employeeId: req.user.employeeId }).sort({ createdAt: -1 });
    }
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Raise ticket
router.post("/tickets", auth, async (req, res) => {
  try {
    const { assetId, issueType, priority, description } = req.body;

    const asset = await Asset.findOne({ id: assetId });
    const assetName = asset ? asset.name : "Unknown Asset";

    const tckId = `TCK-${Date.now().toString().slice(-4)}`;
    const dateStr = new Date().toISOString().split("T")[0];

    const ticket = await AssetTicket.create({
      id: tckId,
      assetId,
      assetName,
      employeeId: req.user.employeeId || "CDE001",
      employeeName: req.user.name || "Employee",
      issueType,
      priority: priority || "Medium",
      description,
      status: "Pending",
      createdAtDate: dateStr,
      timeline: [
        { date: dateStr, status: "Ticket Created", note: "Ticket raised by employee" }
      ]
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Resolve ticket
router.put("/tickets/:id/resolve", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (!["admin", "hr", "director"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const { resolutionNotes, adminComments } = req.body;

    const ticket = await AssetTicket.findOne({ id });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const dateStr = new Date().toISOString().split("T")[0];

    ticket.status = "Resolved";
    ticket.resolutionNotes = resolutionNotes;
    ticket.adminComments = adminComments;
    ticket.timeline.push({
      date: dateStr,
      status: "Resolved",
      note: resolutionNotes || "Resolved by Admin"
    });

    await ticket.save();
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- REQUESTS ENDPOINTS ---

// Get all requests
router.get("/requests", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    let requests;
    if (["admin", "hr", "director"].includes(role)) {
      requests = await AssetRequest.find().sort({ createdAt: -1 });
    } else {
      requests = await AssetRequest.find({ employeeId: req.user.employeeId }).sort({ createdAt: -1 });
    }
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Submit request
router.post("/requests", auth, async (req, res) => {
  try {
    const { category, requestType, reason } = req.body;

    const reqId = `REQ-${Date.now().toString().slice(-4)}`;
    const dateStr = new Date().toISOString().split("T")[0];

    const duplicate = await AssetRequest.findOne({
      employeeId: req.user.employeeId,
      category,
      requestType,
      requestDate: dateStr
    });

    if (duplicate) {
      return res.status(400).json({ message: "You have already submitted an identical request today." });
    }

    const requestObj = await AssetRequest.create({
      id: reqId,
      employeeId: req.user.employeeId || "CDE001",
      employeeName: req.user.name || "Employee",
      category,
      requestType: requestType || "New Asset",
      reason,
      status: "Pending",
      requestDate: dateStr
    });

    res.status(201).json(requestObj);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update request status
router.put("/requests/:id/status", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (!["admin", "hr", "director"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const { status } = req.body;

    const requestObj = await AssetRequest.findOne({ id });
    if (!requestObj) return res.status(404).json({ message: "Request not found" });

    requestObj.status = status;
    await requestObj.save();
    res.json(requestObj);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- MAINTENANCE ENDPOINTS ---

// Get all maintenance
router.get("/maintenance", auth, async (req, res) => {
  try {
    const maintenanceList = await AssetMaintenance.find().sort({ createdAt: -1 });
    res.json(maintenanceList);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Add maintenance
router.post("/maintenance", auth, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (!["admin", "hr", "director"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { assetId, maintenanceType, cost, startDate, endDate, vendorName, description } = req.body;

    const asset = await Asset.findOne({ id: assetId });
    const assetName = asset ? asset.name : "Unknown Asset";

    const mntId = `MNT-${Date.now().toString().slice(-4)}`;

    const record = await AssetMaintenance.create({
      id: mntId,
      assetId,
      assetName,
      maintenanceType,
      cost: parseFloat(cost) || 0,
      startDate,
      endDate,
      vendorName,
      status: "Scheduled",
      description
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
