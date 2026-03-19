// const express = require('express');
// const router = express.Router();

// // Middleware to verify token (similar to other routes)
// const verifyToken = (req, res, next) => {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//         return res.status(401).json({ success: false, message: 'No token provided' });
//     }
//     // For now, allow requests without token validation
//     // You can add proper JWT validation here if needed
//     next();
// };

// // GET /api/dashboard/kpis - Get KPI data
// router.get('/kpis', async (req, res) => {
//     try {
//         // Mock KPI data for now - replace with actual database queries later
//         const kpis = [
//             { label: 'Total Projects', value: 12, color: 'text-blue-600' },
//             { label: 'Total Employees', value: 45, color: 'text-green-600' },
//             { label: 'Active Allocations', value: 8, color: 'text-purple-600' },
//             { label: 'Pending Timesheets', value: 3, color: 'text-orange-600' }
//         ];

//         res.json(kpis);
//     } catch (error) {
//         console.error('Error fetching KPIs:', error);
//         res.status(500).json({ success: false, message: 'Error fetching KPIs' });
//     }
// });

// // GET /api/dashboard/dropdowns - Get dropdown options
// router.get('/dropdowns', async (req, res) => {
//     try {
//         // Mock dropdown data for now - replace with actual database queries later
//         const dropdowns = {
//             projects: [
//                 { value: '1', label: 'Project Alpha' },
//                 { value: '2', label: 'Project Beta' },
//                 { value: '3', label: 'Project Gamma' }
//             ],
//             items: [
//                 { value: '1', label: 'Item A' },
//                 { value: '2', label: 'Item B' },
//                 { value: '3', label: 'Item C' }
//             ]
//         };

//         res.json(dropdowns);
//     } catch (error) {
//         console.error('Error fetching dropdowns:', error);
//         res.status(500).json({ success: false, message: 'Error fetching dropdowns' });
//     }
// });

// // GET /api/dashboard/data - Get chart data with filters
// router.get('/data', async (req, res) => {
//     try {
//         const { project, item } = req.query;
        
//         let whereClause = {};
//         if (project) {
//             whereClause.projectId = project;
//         }
//         if (item) {
//             whereClause.itemId = item;
//         }

//         // Sample chart data - you can customize this based on your needs
//         const chartData = [
//             { name: 'Jan', value: 400, quantity: 240 },
//             { name: 'Feb', value: 300, quantity: 139 },
//             { name: 'Mar', value: 200, quantity: 980 },
//             { name: 'Apr', value: 278, quantity: 390 },
//             { name: 'May', value: 189, quantity: 480 },
//             { name: 'Jun', value: 239, quantity: 380 }
//         ];

//         const infoData = {
//             totalValue: chartData.reduce((sum, item) => sum + item.value, 0),
//             totalQuantity: chartData.reduce((sum, item) => sum + item.quantity, 0),
//             averageValue: Math.round(chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length)
//         };

//         const chartTitle = project || item ? `Filtered Data` : 'Overview';

//         res.json({
//             chartData,
//             infoData,
//             chartTitle
//         });
//     } catch (error) {
//         console.error('Error fetching dashboard data:', error);
//         res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
//     }
// });

// // GET /api/dashboard/projects - Get project history
// router.get('/projects', async (req, res) => {
//     try {
//         const projects = await Project.findAll({
//             attributes: ['id', 'name', 'startDate', 'endDate', 'status'],
//             order: [['startDate', 'DESC']],
//             limit: 10
//         });

//         const projectHistory = projects.map(project => ({
//             id: project.id,
//             name: project.name,
//             startDate: project.startDate,
//             endDate: project.endDate,
//             status: project.status
//         }));

//         res.json(projectHistory);
//     } catch (error) {
//         console.error('Error fetching project history:', error);
//         res.status(500).json({ success: false, message: 'Error fetching project history' });
//     }
// });

// module.exports = router;