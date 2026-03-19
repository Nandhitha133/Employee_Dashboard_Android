const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AttendanceRegularizationRequest = require('./models/AttendanceRegularizationRequest');
const Employee = require('./models/Employee');

// Load env vars
dotenv.config();

// Connect to MongoDB
const uri = process.env.MONGODB_URI || 'mongodb+srv://caldimenggcloud_db_user:Caldim12345678@cluster0.wwy0lqb.mongodb.net/?appName=Cluster0';
console.log('Connecting to:', uri.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs

mongoose.connect(uri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // 1. Fetch the latest request
    const requests = await AttendanceRegularizationRequest.find().sort({ createdAt: -1 }).limit(5);
    console.log(`Found ${requests.length} requests`);
    
    for (const req of requests) {
      console.log('------------------------------------------------');
      console.log(`Request ID: ${req._id}`);
      console.log(`Request EmployeeID (stored): ${req.employeeId} (Type: ${typeof req.employeeId})`);
      console.log(`Request EmployeeName (stored): ${req.employeeName}`);
      
      // 2. Try to find the employee by 'employeeId' field
      const empById = await Employee.findOne({ employeeId: req.employeeId });
      console.log(`Lookup by employeeId field: ${empById ? 'FOUND (Name: ' + empById.name + ', _id: ' + empById._id + ')' : 'NOT FOUND'}`);
      
      // 3. Try to find the employee by '_id'
      let empByObjId = null;
      if (mongoose.Types.ObjectId.isValid(req.employeeId)) {
        empByObjId = await Employee.findById(req.employeeId);
        console.log(`Lookup by _id: ${empByObjId ? 'FOUND (Name: ' + empByObjId.name + ', employeeId: ' + empByObjId.employeeId + ')' : 'NOT FOUND'}`);
      } else {
        console.log(`Request employeeId is not a valid ObjectId, skipping _id lookup.`);
      }

      // 4. Try to find by Name
      const empByName = await Employee.findOne({ name: req.employeeName });
      console.log(`Lookup by Name '${req.employeeName}': ${empByName ? 'FOUND (ID: ' + empByName.employeeId + ', _id: ' + empByName._id + ')' : 'NOT FOUND'}`);

    }
    
    process.exit();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
