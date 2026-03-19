// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const Employee = require("../models/Employee");
// const ChatQuery = require("../models/ChatQuery");
// const LeaveApplication = require("../models/LeaveApplication");
// const { calcBalanceForEmployee } = require("../utils/leaveUtil");
// const { formatLeaveBalance, formatPolicyList, formatPolicyDetail } = require("../utils/formatterUtil");

// // Import SERVICE LAYERS for company-wide data
// const policyService = require("../services/policyService");
// const announcementService = require("../services/announcementService");
// const { normalizeAndExpandKeywords } = require("../utils/searchUtil");

// // Initialize Gemini
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY");

// /**
//  * EMPLOYEE-SPECIFIC CHATBOT CONTROLLER
//  * 
//  * DYNAMIC IMPLEMENTATION:
//  * 1. Queries can be for the authenticated user OR specifically for another employee by ID.
//  * 2. Returns full available data dynamically without hardcoding fields.
//  */

// exports.askEmployeeChatbot = async (req, res) => {
//     try {
//         const { query, context } = req.body;
//         console.log(`[Chatbot] Query: "${query}", Context:`, context ? JSON.stringify(context) : "None");

//         // SECURITY: Get authenticated user's employeeId from token
//         const authenticatedEmployeeId = req.user?.employeeId;

//         if (!authenticatedEmployeeId) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Authentication required. Please log in to access the chatbot."
//             });
//         }

//         if (!query) {
//             return res.status(400).json({ success: false, message: "Query is required" });
//         }

//         const lowerQuery = query.toLowerCase().trim();
//         const hasAI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY";

//         // 0. GREETING HANDLER
//         const greetings = ['hi', 'hello', 'hey', 'hlo', 'hii', 'hy', 'good morning', 'good afternoon', 'good evening', 'how are you'];
//         if (greetings.some(g => lowerQuery === g || lowerQuery.startsWith(g + ' ') || lowerQuery.startsWith(g + '?'))) {
//             const currentEmp = await Employee.findOne({ employeeId: authenticatedEmployeeId }).lean();
//             const welcomeName = currentEmp ? (currentEmp.name || currentEmp.employeename) : 'there';
//             return res.json({
//                 success: true,
//                 response: `Hello ${welcomeName}! I'm your personal assistant. I can help you with your profile, leave balance, payroll, or company policies. Try asking 'my profile', 'my leave', or 'view policies'.`
//             });
//         }

//         // 1. DETECT TARGET EMPLOYEE ID
//         // Look for patterns like "CDE123", "EMP456", "CDE 123", "EMP 456"
//         const idMatch = query.match(/(?:CDE|EMP)\s*(\d+)/i);
//         let targetEmployeeId = null;

//         if (idMatch) {
//             // Normalize ID (remove spaces, uppercase)
//             targetEmployeeId = idMatch[0].replace(/\s+/g, '').toUpperCase();
//         }

//         // 2. FETCH DATA & RBAC CHECK
//         if (targetEmployeeId && targetEmployeeId !== authenticatedEmployeeId) {
//             return res.json({
//                 success: true,
//                 response: "🔒 Access Denied: You are restricted to viewing only your own information. Please contact an administrator for other employee details."
//             });
//         }

//         let employeeData = null;

//         if (targetEmployeeId) {
//             employeeData = await Employee.findOne({ employeeId: targetEmployeeId }).lean();
//             if (!employeeData) {
//                 return res.json({
//                     success: true,
//                     response: `I searched for employee ${targetEmployeeId}, but no record was found in the database.`
//                 });
//             }
//         } else {
//             // Default to self if no specific ID mentioned
//             employeeData = await Employee.findOne({ employeeId: authenticatedEmployeeId }).lean();
//         }

//         // 3. GENERATE RESPONSE
//         let finalResponse;

//         if (targetEmployeeId) {
//             // Dynamic Profile Response
//             finalResponse = formatEmployeeProfile(employeeData);
//         } else {
//             let intent = { type: 'UNKNOWN' };
//             let dbData;

//             // 1. HIGH PRIORITY: Personal Data (Overwrites context lock)
//             const personalIntent = detectSelfIntent(lowerQuery);
//             const personalIntents = ['MY_LEAVE', 'MY_SALARY', 'MY_CONTACT', 'MY_ID'];

//             const isPersonalRequest = personalIntents.includes(personalIntent.type) ||
//                 (personalIntent.type === 'MY_PROFILE' && (
//                     lowerQuery.includes('profile') ||
//                     lowerQuery.includes('about me') ||
//                     lowerQuery.includes('myself') ||
//                     personalIntent.requestedField // Allow specific fields like designation, department etc. to bypass
//                 ));

//             if (isPersonalRequest) {
//                 console.log(`[Chatbot] Personal Info Intent Detected: ${personalIntent.type}. Bypassing context lock.`);
//                 intent = personalIntent;
//                 dbData = await buildSelfResponse(intent, employeeData);
//             }
//             // 2. CONTEXT PRIORITY (If not personal info)
//             else if (context && (context.activePolicyId || context.activePolicy)) {
//                 // If we are in specific policy lock mode, we FORCE the system to fetch ONLY that policy
//                 let searchResult;
//                 let lockedPolicyName = context.activePolicy;

//                 if (context.activePolicyId) {
//                     searchResult = await policyService.getPolicyById(context.activePolicyId);
//                     if (searchResult.success && searchResult.found) {
//                         lockedPolicyName = searchResult.data.title || searchResult.data.policyName;
//                     }
//                 } else {
//                     searchResult = await policyService.getPolicyByTitle(context.activePolicy);
//                 }

//                 // Extract keywords from user query for highlighting/filtering logic in formatter
//                 let queryKeywords = [];
//                 try {
//                     const cleanPolicyName = (typeof lockedPolicyName === 'string' ? lockedPolicyName : '').toLowerCase();
//                     queryKeywords = lowerQuery
//                         .replace(cleanPolicyName, '') // remove policy name
//                         .replace(/[?.!,]/g, '') // Remove punctuation
//                         .replace(/\b(about|what|is|explain|show|view|detail|details|of|policy|policies|insurance|company|our|my|tell|me|the|a|an|how|many|do|i|get)\b/g, '') // remove stop words
//                         .replace(/\s+/g, ' ')
//                         .trim()
//                         .split(' ')
//                         .filter(w => w.length >= 2); // Allow 2-char words like "PF"
//                 } catch (e) {
//                     console.error("Keyword extraction error:", e);
//                     queryKeywords = [];
//                 }

//                 // CHECK IF KEYWORDS EXIST IN LOCKED POLICY
//                 let foundInLockedPolicy = false;
//                 if (searchResult.success && searchResult.found) {
//                     // Combine content AND benefits (headers) for search so we don't miss anything
//                     const policyContent = ((searchResult.data.content || "") + " " + JSON.stringify(searchResult.data.benefits || [])).toLowerCase();
//                     // If no specific keywords (just "explain policy"), we consider it found
//                     if (queryKeywords.length === 0) {
//                         foundInLockedPolicy = true;
//                     } else {
//                         // Check if ANY keyword is in the content
//                         foundInLockedPolicy = queryKeywords.some(k => policyContent.includes(k.toLowerCase()));
//                     }
//                 }

//                 if (foundInLockedPolicy) {
//                     console.log(`[Chatbot] Found in locked policy: ${lockedPolicyName}`);
//                     // STICK TO CONTEXT
//                     intent = { type: 'POLICY_LIST' };
//                     dbData = {
//                         intent: 'POLICY_LIST',
//                         policies: [searchResult.data],
//                         count: 1,
//                         employee: employeeData,
//                         lockedPolicy: lockedPolicyName,
//                         searchKeywords: queryKeywords
//                     };
//                 } else {
//                     console.log(`[Chatbot] NOT in context: ${lockedPolicyName}. Informing user per strict rules.`);
//                     intent = { type: 'POLICY_LIST' };
//                     dbData = {
//                         intent: 'POLICY_LIST',
//                         policies: [],
//                         count: 0,
//                         employee: employeeData,
//                         lockedPolicy: lockedPolicyName,
//                         searchKeywords: queryKeywords,
//                         notCovered: true // Flag for formatter to show "Not covered" message
//                     };
//                 }

//             } else {
//                 // 3. NORMAL FLOW (No context, not specific personal info pattern)
//                 intent = personalIntent;
//                 dbData = await buildSelfResponse(intent, employeeData);
//             }

//             if (hasAI) {
//                 finalResponse = await generateSecureAIResponse(query, dbData, employeeData, context);
//             } else {
//                 console.log("[Chatbot] NO AI - Using Budget Response. Intent:", JSON.stringify(intent));
//                 finalResponse = generateSecureBudgetResponse(intent, dbData);
//             }
//         }

//         // LOGGING
//         const chatLog = new ChatQuery({
//             query,
//             response: finalResponse,
//             context: JSON.stringify({ target: targetEmployeeId || 'SELF', employeeId: authenticatedEmployeeId }),
//             us{
/req.user?._id
//         });
//         await chatLog.save();

//         res.json({ success: true, response: finalResponse, logId: chatLog._id });

//     } catch (error) {
//         console.error("Employee Chatbot Error:", error);
//         console.error("Stack Trace:", error.stack);
//         res.status(500).json({ success: false, message: "Server error" });
//     }
// };

// // ==================== SELF-INTENT DETECTION ====================
// function detectSelfIntent(lowerQuery) {
//     // PRIORITY 1: Personal Leave Balance (High priority)
//     const leaveKeywords = ['leave', 'vacation', 'holiday', 'off', 'day off'];
//     const balanceKeywords = ['balance', 'remaining', 'available', 'have', 'get', 'status', 'left', 'available', 'how many', 'how much'];

//     const hasLeaveWord = leaveKeywords.some(w => lowerQuery.includes(w));
//     const hasBalanceWord = balanceKeywords.some(w => lowerQuery.includes(w));
//     const hasMyWord = lowerQuery.includes('my') || lowerQuery.includes('me') || lowerQuery.includes('myself');

//     // If it mentions leave AND (balance-related OR my-related), it's likely a balance query
//     if (hasLeaveWord && (hasBalanceWord || hasMyWord)) {
//         return { type: 'MY_LEAVE' };
//     }

//     // PRIORITY 2: Strict Policy Keywords
//     const policyKeywords = ["policy", "rule", "rules", "entitlement", "eligibility", "permission", "leave", "attendance", "lop", "bonus", "insurance", "gratuity", "pf", "holiday", "notice period", "bond", "separation", "exit", "policies"];
//     if (policyKeywords.some(w => lowerQuery.includes(w))) {
//         // PRIORITY 1.1: Policy ID (POL001, etc.)
//         const polMatch = lowerQuery.match(/pol\d+/i);
//         if (polMatch) {
//             return { type: 'POLICY_ID', policyId: polMatch[0].toUpperCase() };
//         }

//         // Detect if it's a general list request or specific search
//         const listKeywords = ['all', 'list', 'view', 'show', 'company', 'our'];
//         const isListRequest = listKeywords.some(w => lowerQuery.includes(w)) && !lowerQuery.includes('pf') && !lowerQuery.includes('gratuity') && !lowerQuery.includes('bonus') && !lowerQuery.includes('notice');

//         if (isListRequest) {
//             return { type: 'POLICY_LIST', keyword: null };
//         }

//         let searchKeyword = lowerQuery
//             .replace(/about|what is|explain|show me|view|details? of|policy|policies|insurance|company|our|my|tell me|the|a|an/g, '')
//             .replace(/\s+/g, ' ') // Collapse multiple spaces
//             .replace(/\?|!/g, '') // Remove punctuation
//             .trim();

//         if (searchKeyword && searchKeyword.length > 1) {
//             return { type: 'POLICY_LIST', keyword: normalizeAndExpandKeywords(searchKeyword) };
//         } else {
//             return { type: 'POLICY_LIST', keyword: null };
//         }
//     }

//     // PRIORITY 2: Announcements
//     if (lowerQuery.includes('announcement') || (lowerQuery.includes('notice') && !lowerQuery.includes('period')) || lowerQuery.includes('news')) {
//         return { type: 'ANNOUNCEMENT_LIST' };
//     }

//     // PRIORITY 3: Personal Data
//     const fKeywords = {
//         designation: ['designation', 'role', 'position', 'job title'],
//         department: ['department', 'dept', 'team'],
//         salary: ['salary', 'pay', 'ctc', 'compensation'],
//         email: ['email', 'mail'],
//         phone: ['phone', 'mobile', 'contact', 'number'],
//         leave: ['leave', 'balance', 'remaining', 'vacation']
//     };

//     let requestedField = null;
//     for (const [field, keywords] of Object.entries(fKeywords)) {
//         if (keywords.some(k => lowerQuery.includes(k))) {
//             requestedField = field;
//             break;
//         }
//     }

//     if (lowerQuery.includes('salary') || lowerQuery.includes('pay') || lowerQuery.includes('earning') || lowerQuery.includes('compensation')) {
//         return { type: 'MY_SALARY', requestedField: 'salary' };
//     }
//     if (lowerQuery.includes('leave') || lowerQuery.includes('remaining') || lowerQuery.includes('balance') || lowerQuery.includes('vacation') || lowerQuery.includes('off')) {
//         return { type: 'MY_LEAVE', requestedField: 'leave' };
//     }
//     if (lowerQuery.includes('designation') || lowerQuery.includes('role') || lowerQuery.includes('position')) {
//         return { type: 'MY_PROFILE', requestedField: 'designation' };
//     }
//     if (lowerQuery.includes('department') || lowerQuery.includes('dept')) {
//         return { type: 'MY_PROFILE', requestedField: 'department' };
//     }
//     if (lowerQuery.includes('phone') || lowerQuery.includes('contact') || lowerQuery.includes('number') || lowerQuery.includes('email')) {
//         return { type: 'MY_CONTACT', requestedField: requestedField };
//     }
//     if (lowerQuery.includes('id') || lowerQuery.includes('employee id')) {
//         return { type: 'MY_ID', requestedField: 'employeeId' };
//     }
//     return { type: 'MY_PROFILE', requestedField: requestedField }; // Default to full profile unless field found
// }

// // ==================== BUILD SELF RESPONSE DATA ====================
// async function buildSelfResponse(intent, emp) {
//     // Handle company-wide queries
//     if (intent.type === 'POLICY_LIST') {
//         const result = intent.keyword
//             ? await policyService.searchPolicies(intent.keyword)
//             : await policyService.getAllPolicies();

//         return {
//             intent: intent.type,
//             policies: result.success ? result.data : [],
//             count: result.success ? result.data.length : 0,
//             keyword: intent.keyword
//         };
//     }

//     if (intent.type === 'POLICY_ID') {
//         const result = await policyService.getPolicyById(intent.policyId);
//         return {
//             intent: intent.type,
//             policy: result.success && result.found ? result.data : null,
//             found: result.found
//         };
//     }

//     if (intent.type === 'ANNOUNCEMENT_LIST') {
//         const result = await announcementService.getRecentAnnouncements(5);
//         return {
//             intent: intent.type,
//             announcements: result.success ? result.data : [],
//             count: result.success ? result.data.length : 0
//         };
//     }

//     // Personal data
//     if (intent.type === 'MY_LEAVE' && emp) {
//         const approvals = await LeaveApplication.find({
//             employeeId: emp.employeeId,
//             status: 'Approved'
//         }).lean();
//         return {
//             intent: intent.type,
//             employee: emp,
//             leaveBalance: calcBalanceForEmployee(emp, approvals)
//         };
//     }

//     // RETURN FULL DYNAMIC OBJECT
//     return {
//         intent: intent.type,
//         employee: emp
//     };
// }

// // ==================== DYNAMIC EMPLOYEE PROFILE FORMATTER ====================
// function formatEmployeeProfile(emp) {
//     if (!emp) return "No employee information available.";

//     let output = "**Employee Information**\n";

//     // EXCLUDED FIELDS (Technical/Sensitive)
//     const excludedFields = [
//         '_id', '__v', 'password', 'createdAt', 'updatedAt',
//         'otp', 'otpExpires', 'resetPasswordToken', 'resetPasswordExpires',
//         'history', 'profileImage', 'salt', 'hash'
//     ];

//     // Helper to format date
//     const formatDate = (d) => {
//         if (!d) return null;
//         try {
//             return new Date(d).toLocaleDateString('en-IN', {
//                 day: 'numeric', month: 'short', year: 'numeric'
//             });
//         } catch (e) { return d; }
//     };

//     // Helper to format keys (camelCase -> Title Case)
//     const formatKey = (key) => {
//         return key
//             .replace(/([A-Z])/g, ' $1') // insert space before capital
//             .replace(/^./, str => str.toUpperCase()) // uppercase first
//             .trim();
//     };

//     // DYANMIC ITERATION OVER ALL KEYS
//     const keys = Object.keys(emp);

//     keys.forEach(key => {
//         if (excludedFields.includes(key)) return;

//         let value = emp[key];

//         // Skip empty values
//         if (value === undefined || value === null || value === "" || value === "N/A") return;

//         // Handle Dates
//         if (value instanceof Date || (typeof value === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('dob') || key.toLowerCase().includes('doj')) && !key.toLowerCase().includes('update'))) {
//             if (value instanceof Date || (value.length > 9 && !isNaN(Date.parse(value)))) {
//                 value = formatDate(value);
//             }
//         }

//         // Handle Arrays
//         if (Array.isArray(value)) {
//             // Special complex array handling for visual layout if strictly array of objects
//             if (value.length > 0 && typeof value[0] === 'object') {
//                 // Will handle at end for better block formatting
//                 return;
//             }
//             // Join simple arrays
//             if (value.length > 0 && typeof value[0] !== 'object') {
//                 value = value.join(', ');
//             } else {
//                 return;
//             }
//         }

//         // Handle Nested Objects (non-array, non-date)
//         if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
//             return; // Skip complex nested objects here
//         }

//         output += `${formatKey(key)}: ${value}\n`;
//     });

//     // Handle Complex Arrays (like previousOrganizations) generically
//     keys.forEach(key => {
//         if (excludedFields.includes(key)) return;
//         let value = emp[key];

//         if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
//             output += `\n**${formatKey(key)}**:\n`;
//             value.forEach(item => {
//                 // For each object in array, print its keys
//                 const subKeys = Object.keys(item).filter(k => k !== '_id');
//                 let lineParts = [];
//                 // Heuristic: try to find common "title" fields to put first
//                 const prioritized = ['organization', 'company', 'name', 'title', 'designation', 'role'];

//                 // Sort keys based on priority
//                 subKeys.sort((a, b) => {
//                     const idxA = prioritized.findIndex(p => a.toLowerCase().includes(p));
//                     const idxB = prioritized.findIndex(p => b.toLowerCase().includes(p));
//                     if (idxA !== -1 && idxB !== -1) return idxA - idxB;
//                     if (idxA !== -1) return -1;
//                     if (idxB !== -1) return 1;
//                     return 0;
//                 });

//                 subKeys.forEach(k => {
//                     let v = item[k];
//                     if (k.toLowerCase().includes('date') || k.toLowerCase().includes('start') || k.toLowerCase().includes('end')) {
//                         v = formatDate(v);
//                     }
//                     if (v) lineParts.push(v);
//                 });
//                 output += `- ${lineParts.join(', ')}\n`;
//             });
//         }
//     });

//     return output;
// }

// // ==================== SECURE AI RESPONSE ====================
// // ==================== SECURE AI RESPONSE ====================
// async function generateSecureAIResponse(query, dbData, emp, context = {}) {
//     try {
//         const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//         let contextInstruction = "";
//         let activePolicy = context.activePolicy || null;
//         const isPersonal = ['MY_LEAVE', 'MY_SALARY', 'MY_CONTACT', 'MY_ID', 'MY_PROFILE'].includes(dbData.intent);

//         if (activePolicy && !isPersonal) {
//             contextInstruction = `
// IMPORTANT CONTEXT:
// The user is currently viewing the "${activePolicy}".
// BEHAVIOR RULES:
// 1. Assume all questions relate specifically to "${activePolicy}".
// 2. ANSWER ONLY from the content of "${activePolicy}".
// 3. DO NOT search, list, or mention other policies unless explicitly asked.
// 4. If the answer is not found in "${activePolicy}", state clearly: "This detail is not mentioned in the ${activePolicy}."
// `;
//         } else if (isPersonal) {
//             const field = dbData.requestedField || intent.requestedField;
//             const fieldHint = field ? `The user is specifically asking for their ${field}.` : "The user is asking for their general profile information.";
//             contextInstruction = `
// BEHAVIOR RULES:
// 1. The user is asking about their OWN personal data (Leave, Salary, or Profile).
// 2. ${fieldHint}
// 3. Answer based ON THE SYSTEM DATA provided below.
// 4. Be direct and concise. If a specific field was asked, only mention that information.
// `;
//         } else {
//             contextInstruction = `
// BEHAVIOR RULES:
// 1. If the user asks for a specific policy, answer from that policy.
// 2. If the user asks to list policies, list the available ones.
// `;
//         }

//         const prompt = `
// Task: Answer the user's question using ONLY the provided System Data.
// Constraint: Respond in ONE sentence only.

// Rules:
// 1. Do NOT show the full policy.
// 2. Do NOT say "According to the policy...".
// 3. Just give the direct answer.
// 4. If the answer is "0.5 days", say "Employees are entitled to 0.5 days of casual leave per month."
// 5. If the answer is not in the text, say "This detail is not mentioned in the current policy."

// System Data (Active Policy):
// ${JSON.stringify(dbData, null, 2)}

// User Question:
// "${query}"

// Correct Answer:
// `;
//         const result = await model.generateContent(prompt);
//         return (await result.response).text();
//     } catch (err) {
//         console.error("AI Generation Error:", err.message);
//         return generateSecureBudgetResponse(dbData.intent, dbData);
//     }
// }

// // ==================== SECURE BUDGET RESPONSE (Fallback) ====================
// function generateSecureBudgetResponse(intent, data) {
//     if (!intent) {
//         console.error("CRITICAL: Intent is undefined in generateSecureBudgetResponse", { data });
//         return "I'm having trouble understanding that request context. Please try again.";
//     }
//     const intentType = typeof intent === 'string' ? intent : intent.type;
//     const emp = data.employee;

//     // Use dynamic formatter as default fallback for profile info
//     if (intentType === 'MY_SALARY' && emp) return `💰 Current Salary: ₹${emp.salary || 'Not available'}`;
//     if (intentType === 'MY_CONTACT' && emp) return `📞 Contact: ${emp.email || 'N/A'}, ${emp.phone || 'N/A'}`;
//     if (intentType === 'MY_ID' && emp) return `🆔 Employee ID: ${emp.employeeId}`;

//     if (intentType === 'MY_LEAVE' && data.leaveBalance) {
//         return formatLeaveBalance(data.leaveBalance);
//     }

//     if (intentType === 'POLICY_LIST') {
//         if (data.policies && data.policies.length > 0) {
//             // Priority: If keyword exists, find policy with matching title
//             if (data.keyword) {
//                 const keywords = Array.isArray(data.keyword) ? data.keyword : [data.keyword];
//                 const bestMatch = data.policies.find(p => {
//                     const name = (p.policyName || p.title || "").toLowerCase();
//                     return keywords.some(k => name.includes(k.toLowerCase()));
//                 });

//                 if (bestMatch) {
//                     // Use user's specific search terms if available (context mode), otherwise fall back to intent keyword
//                     const filterKeywords = (data.searchKeywords && data.searchKeywords.length > 0)
//                         ? data.searchKeywords
//                         : data.keyword;
//                     return formatPolicyDetail(bestMatch, filterKeywords);
//                 }
//             }

//             if (data.policies.length === 1) {
//                 // Same here: prefer user's specific query terms for filtering content
//                 const filterKeywords = (data.searchKeywords && data.searchKeywords.length > 0)
//                     ? data.searchKeywords
//                     : data.keyword;
//                 return formatPolicyDetail(data.policies[0], filterKeywords);
//             }
//             return formatPolicyList(data.policies);
//         }
//         return `I couldn't find any specific information about "${data.keyword || 'that'}" in our company policies.`;
//     }

//     if (intentType === 'POLICY_ID' && data.policy) {
//         return formatPolicyDetail(data.policy);
//     }

//     // Default to dynamic profile
//     if (emp) {
//         const field = intent.requestedField || data.requestedField;
//         if (field) {
//             const val = emp[field] || emp.designation || emp.department || "not available";
//             return `Your ${field} is **${val}**.`;
//         }
//         return formatEmployeeProfile(emp);
//     }

//     return "No information found.";
// }

// exports.getEmployeeChatLogs = async (req, res) => {
//     try {
//         const authenticatedEmployeeId = req.user?.employeeId;
//         if (!authenticatedEmployeeId) {
//             return res.status(401).json({ success: false, message: "Authentication required" });
//         }
//         const logs = await ChatQuery.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
//         res.json({ success: true, logs });
//     } catch (error) {
//         res.status(500).json({ success: false, message: "Error fetching logs" });
//     }
// };
