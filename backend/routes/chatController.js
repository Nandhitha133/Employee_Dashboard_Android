const { GoogleGenerativeAI } = require("@google/generative-ai");
const ChatQuery = require("../models/ChatQuery");
const { formatEmployeeProfile, formatLeaveBalance, formatPolicyList, formatPolicyDetail } = require("../utils/formatterUtil"); // Dynamic Formatter

// Import ALL SERVICE LAYERS - Complete database access
const policyService = require("../services/policyService");
const employeeService = require("../services/employeeService");
const announcementService = require("../services/announcementService");
const timesheetService = require("../services/timesheetService");
const leaveApplicationService = require("../services/leaveApplicationService");
const attendanceService = require("../services/attendanceService");
const projectService = require("../services/projectService");
const payrollService = require("../services/payrollService");
const loanService = require("../services/loanService");
const teamService = require("../services/teamService");
const internshipService = require("../services/internshipService");
const allocationService = require("../services/allocationService");
const monthlyPayrollService = require("../services/monthlyPayrollService");
const monthlyExpenditureService = require("../services/monthlyExpenditureService");
const { normalizeAndExpandKeywords } = require("../utils/searchUtil");

// Import Models and Utils for specific logic
const LeaveApplication = require('../models/LeaveApplication');
const { calcBalanceForEmployee } = require('../utils/leaveUtil');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY");

exports.askChatbot = async (req, res) => {
    try {
        const { query, context } = req.body;
        if (!query) {
            return res.status(400).json({ success: false, message: "Query is required" });
        }

        const lowerQuery = query.toLowerCase().trim();
        const hasAI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY";

        const userRole = req.user?.role;
        const isAdmin = userRole === 'admin' || userRole === 'bot';
        const loggedInEmployeeId = req.user?.employeeId;

        console.log(`\n📝 Chatbot Query from ${req.user?.username || 'unknown'}: "${query}"`);

        // GREETING HANDLER
        const greetings = ['hi', 'hello', 'hey', 'hlo', 'hii', 'hy', 'good morning', 'good afternoon', 'good evening'];
        if (greetings.some(g => lowerQuery === g || lowerQuery.startsWith(g + ' '))) {
            const currentEmp = await employeeService.getEmployeeById(loggedInEmployeeId);
            const welcomeName = (currentEmp.success && currentEmp.found) ? (currentEmp.data.name || currentEmp.data.employeename) : 'there';
            return res.json({
                success: true,
                response: `Hello ${welcomeName}! I'm your organization assistant. Ask me about employees, policies, leave, or announcements. How can I help?`
            });
        }

        // 5. INTENT DETECTION & CONTEXT PRIORITY
        let intent = { type: 'UNKNOWN', params: {} };
        let serviceData = { found: false };

        // FIRST: Run detection to see if it's a personal request that should bypass context lock
        const potentialIntent = detectIntent(lowerQuery, loggedInEmployeeId);
        const personalDataIntents = ['LEAVE_BALANCE', 'EMPLOYEE_SALARY', 'EMPLOYEE_LOOKUP'];

        // If it's a personal query for the logged-in user (e.g., "my leave balance", "my profile")
        const isSelfRequest = personalDataIntents.includes(potentialIntent.type) &&
            (potentialIntent.params.employeeId === loggedInEmployeeId ||
                lowerQuery.includes('my') || lowerQuery.includes('me') || lowerQuery.includes('myself') ||
                lowerQuery.includes('profile') || lowerQuery.includes('about me') ||
                // Explicit check for known profile fields
                ['designation', 'role', 'department', 'dept', 'salary', 'phone', 'email', 'id'].some(k => lowerQuery.includes(k)));

        if (isSelfRequest) {
            console.log(`[AdminChat] Self-Request Intent Detected: ${potentialIntent.type}. Bypassing context lock.`);
            intent = potentialIntent;
            serviceData = await fetchDataViaServices(intent, lowerQuery, isAdmin, loggedInEmployeeId);
        }
        // 1. CONTEXT PRIORITY (If not a self-request)
        else if (context && (context.activePolicyId || context.activePolicy)) {
            let searchResult;
            let lockedPolicyName = context.activePolicy;

            if (context.activePolicyId) {
                searchResult = await policyService.getPolicyById(context.activePolicyId);
                if (searchResult.success && searchResult.found) {
                    lockedPolicyName = searchResult.data.title || searchResult.data.policyName;
                }
            } else {
                searchResult = await policyService.getPolicyByTitle(context.activePolicy);
            }

            if (searchResult.success && searchResult.found) {
                let queryKeywords = [];
                try {
                    const cleanPolicyName = (lockedPolicyName || "").toLowerCase();
                    queryKeywords = lowerQuery
                        .replace(cleanPolicyName, '')
                        .replace(/[?.!,]/g, '')
                        .replace(/\b(about|what|is|explain|show|view|detail|details|of|policy|policies|insurance|company|our|my|tell|me|the|a|an|how|many|do|i|get)\b/g, '')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .split(' ')
                        .filter(w => w.length >= 2);
                } catch (e) {
                    console.error("Keyword extraction error:", e);
                }

                // Check if keywords exist in locked policy
                let foundInLockedPolicy = false;
                const policyContent = ((searchResult.data.content || "") + " " + JSON.stringify(searchResult.data.benefits || [])).toLowerCase();

                if (queryKeywords.length === 0) {
                    foundInLockedPolicy = true;
                } else {
                    foundInLockedPolicy = queryKeywords.some(k => policyContent.includes(k.toLowerCase()));
                }

                if (foundInLockedPolicy) {
                    console.log(`[AdminChat] Context Match Found: ${lockedPolicyName}`);
                    intent = { type: 'POLICY_LIST' };
                    serviceData = {
                        intent: 'POLICY_LIST',
                        policies: [searchResult.data],
                        count: 1,
                        lockedPolicy: lockedPolicyName,
                        searchKeywords: queryKeywords
                    };
                } else {
                    console.log(`[AdminChat] NOT in context: ${lockedPolicyName}. Attempting global search.`);
                    
                    // Fallback to global search
                    const globalSearch = await policyService.searchPolicies(queryKeywords);
                    
                    if (globalSearch.success && globalSearch.data.length > 0) {
                         console.log(`[AdminChat] Found in other policies: ${globalSearch.data.length} matches.`);
                         intent = { type: 'POLICY_SEARCH' };
                         serviceData = {
                            intent: 'POLICY_SEARCH',
                            policies: globalSearch.data,
                            count: globalSearch.data.length,
                            searchKeywords: queryKeywords
                         };
                    } else {
                        console.log(`[AdminChat] Not found globally either.`);
                        intent = { type: 'POLICY_LIST' };
                        serviceData = {
                            intent: 'POLICY_LIST',
                            policies: [],
                            count: 0,
                            lockedPolicy: lockedPolicyName,
                            searchKeywords: queryKeywords,
                            notCovered: true
                        };
                    }
                }
            }
        }

        // 2. NORMAL FLOW (if no context or context search yielded nothing solid)
        if (intent.type === 'UNKNOWN') {
            intent = potentialIntent; // Use the one we already detected
            console.log(`🎯 Detected Intent: ${intent.type}`, intent.params);
            serviceData = await fetchDataViaServices(intent, lowerQuery, isAdmin, loggedInEmployeeId);
        }

        // ACCESS CONTROL: Employees can see policies/announcements but only THEIR OWN personal data
        // Admin can see everything
        if (!isAdmin) {
            const employeeDataIntents = ['EMPLOYEE_LOOKUP', 'EMPLOYEE_SALARY', 'EMPLOYEE_LEAVE', 'EMPLOYEE_SEARCH', 'DIRECTORY_LIST', 'EMPLOYEE_NAME_LOOKUP', 'LEAVE_BALANCE'];

            // If querying employee data
            if (employeeDataIntents.includes(intent.type)) {
                const queriedEmployeeId = intent.params.employeeId;

                if (intent.type === 'EMPLOYEE_NAME_LOOKUP') {
                    // Force non-admins to their own profile for name searches
                    intent.type = 'EMPLOYEE_LOOKUP';
                    intent.params.employeeId = loggedInEmployeeId;
                }
                else if (queriedEmployeeId && queriedEmployeeId !== loggedInEmployeeId) {
                    return res.json({
                        success: true,
                        response: "🔒 Access Denied: You can only view your own information. To see other employees' data, contact an administrator."
                    });
                }

                // Force the query to their own ID to be safe
                intent.params.employeeId = loggedInEmployeeId;
                serviceData = await fetchDataViaServices(intent, lowerQuery, isAdmin, loggedInEmployeeId);
            }
        }

        // RESPONSE GENERATION
        let finalResponse;
        if (hasAI && serviceData.found !== false) {
            finalResponse = await generateAIResponse(query, serviceData, intent);
        } else {
            finalResponse = generateBudgetResponse(serviceData, intent);
        }

        // LOGGING
        const chatLog = new ChatQuery({
            query,
            response: finalResponse,
            context: JSON.stringify({ intent: intent.type, dataCount: serviceData.count || 0 }),
            user: req.user?._id
        });
        await chatLog.save();

        console.log(`✅ Response sent (${finalResponse.substring(0, 50)}...)\n`);
        res.json({ success: true, response: finalResponse, logId: chatLog._id });

    } catch (error) {
        console.error("❌ Chatbot Error:", error);
        res.status(500).json({ success: false, message: "Server error", details: error.message });
    }
};

// ==================== INTENT DETECTION ====================
function detectIntent(lowerQuery, loggedInEmployeeId = null) {
    let intent = { type: 'UNKNOWN', params: {} };

    // STEP 1 & 2: Normalize & Resolve Policy Intent FIRST
    const resolvedPolicyName = resolvePolicyIntent(lowerQuery);
    if (resolvedPolicyName) {
        console.log("✅ Intent Detected: POLICY_STRICT_LOOKUP");
        intent.type = 'POLICY_STRICT_LOOKUP';
        intent.params.policyName = resolvedPolicyName;
        intent.params.originalQuery = lowerQuery;
        return intent;
    }

    // NEW PRIORITY: Leave Balance & Personal Detail (Personal Data)
    const leaveKeywords = ['leave', 'vacation', 'holiday', 'off', 'day off'];
    const balanceKeywords = ['balance', 'remaining', 'available', 'have', 'get', 'status', 'left', 'how many', 'how much'];
    const profileKeywords = ['designation', 'role', 'position', 'department', 'dept', 'profile', 'about me'];

    const hasLeaveWord = leaveKeywords.some(w => lowerQuery.includes(w));
    const hasBalanceWord = balanceKeywords.some(w => lowerQuery.includes(w));
    const hasProfileWord = profileKeywords.some(w => lowerQuery.includes(w));
    const hasMyWord = lowerQuery.includes('my') || lowerQuery.includes('me') || lowerQuery.includes('myself');

    // Extract specific field request if present
    const fieldKeywordsMap = {
        designation: ['designation', 'role', 'position', 'job title'],
        department: ['department', 'dept', 'team'],
        salary: ['salary', 'pay', 'ctc', 'compensation'],
        email: ['email', 'mail'],
        phone: ['phone', 'mobile', 'contact', 'number'],
        leave: ['leave', 'balance', 'remaining', 'vacation']
    };

    let requestedField = null;
    for (const [field, keywords] of Object.entries(fieldKeywordsMap)) {
        if (keywords.some(k => lowerQuery.includes(k))) {
            requestedField = field;
            break;
        }
    }

    if (hasLeaveWord && (hasBalanceWord || hasMyWord)) {
        console.log("✅ Intent Detected: LEAVE_BALANCE (Priority)");
        intent.type = 'LEAVE_BALANCE';
        intent.params.employeeId = loggedInEmployeeId;
        intent.params.requestedField = 'leave';
        return intent;
    }

    if (hasProfileWord && (hasMyWord || lowerQuery.split(' ').length <= 3)) {
        console.log("✅ Intent Detected: EMPLOYEE_LOOKUP (Priority Profile)");
        intent.type = 'EMPLOYEE_LOOKUP';
        intent.params.employeeId = loggedInEmployeeId;
        intent.params.requestedField = requestedField;
        return intent;
    }

    const policyKeywords = ["policy", "rule", "rules", "entitlement", "eligibility", "permission", "leave", "attendance", "lop", "bonus", "insurance", "gratuity", "pf", "holiday", "notice period", "bond", "separation", "exit", "policies"];

    // PRIORITY 1: Strict Policy Keywords
    if (policyKeywords.some(w => lowerQuery.includes(w))) {
        // PRIORITY 1.1: Policy ID (POL001, etc.)
        const polMatch = lowerQuery.match(/pol\d+/i);
        if (polMatch) {
            console.log("✅ Intent Detected: POLICY_ID_LOOKUP");
            intent.type = 'POLICY_ID_LOOKUP';
            intent.params.policyId = polMatch[0].toUpperCase();
            return intent;
        }

        const listKeywords = ['all', 'list', 'view', 'show', 'company', 'our'];
        const isListRequest = listKeywords.some(w => lowerQuery.includes(w)) && !lowerQuery.includes('pf') && !lowerQuery.includes('gratuity') && !lowerQuery.includes('bonus') && !lowerQuery.includes('notice');

        if (isListRequest) {
            console.log("✅ Intent Detected: POLICY_LIST");
            intent.type = 'POLICY_LIST';
            return intent;
        } else {
            console.log("✅ Intent Detected: POLICY_SEARCH");
            intent.type = 'POLICY_SEARCH';
            let searchKeyword = lowerQuery
                .replace(/about|what is|explain|show me|view|details? of|policy|policies|insurance|company|our|my|tell me|the|a|an/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\?|!/g, '')
                .trim();
            if (searchKeyword && searchKeyword.length > 1) {
                intent.params.keyword = normalizeAndExpandKeywords(searchKeyword);
            }
            return intent;
        }
    }

    // PRIORITY 2: ID Lookups (Employee ID based)
    let idMatch = lowerQuery.match(/[a-z]{2,4}\d+/i);
    // Support "ID: 123" format fallback
    if (!idMatch) {
        const colonMatch = lowerQuery.match(/:\s*(\d+)/);
        if (colonMatch) idMatch = [colonMatch[1]];
    }

    if (idMatch) {
        const matchedId = idMatch[0].toUpperCase();

        // Priority Fix: Check if it's a Policy ID (POLxxx)
        if (matchedId.startsWith('POL')) {
            console.log("✅ Intent Detected: POLICY_ID_LOOKUP (via regex match)");
            intent.type = 'POLICY_ID_LOOKUP';
            intent.params.policyId = matchedId;
            return intent;
        }

        intent.params.employeeId = matchedId;

        // Detect specific field request
        const fKeyMap = {
            designation: ['designation', 'role', 'position', 'job title'],
            department: ['department', 'dept', 'team'],
            salary: ['salary', 'pay', 'ctc', 'compensation'],
            email: ['email', 'mail'],
            phone: ['phone', 'mobile', 'contact', 'number'],
            leave: ['leave', 'balance', 'remaining', 'vacation']
        };
        for (const [field, keywords] of Object.entries(fKeyMap)) {
            if (keywords.some(k => lowerQuery.includes(k))) {
                intent.params.requestedField = field;
                break;
            }
        }

        if (lowerQuery.includes('timesheet') || lowerQuery.includes('hours')) {
            console.log("✅ Intent Detected: TIMESHEET_LIST");
            intent.type = 'TIMESHEET_LIST';
            return intent;
        } else if (lowerQuery.includes('loan') || lowerQuery.includes('advance')) {
            console.log("✅ Intent Detected: LOAN_LIST");
            intent.type = 'LOAN_LIST';
            return intent;
        } else if (lowerQuery.includes('payroll') || lowerQuery.includes('salary') || lowerQuery.includes('payslip') || lowerQuery.includes('earnings')) {
            console.log("✅ Intent Detected: PAYROLL_LIST");
            intent.type = 'PAYROLL_LIST';
            return intent;
        } else if (lowerQuery.includes('leave') || lowerQuery.includes('balance') || lowerQuery.includes('remaining')) {
            console.log("✅ Intent Detected: LEAVE_BALANCE");
            intent.type = 'LEAVE_BALANCE';
            intent.params.requestedField = 'leave';
            return intent;
        } else {
            console.log("✅ Intent Detected: EMPLOYEE_LOOKUP");
            intent.type = 'EMPLOYEE_LOOKUP';
            return intent;
        }
    }

    // PRIORITY 3: Self-queries
    const selfPatterns = ['my ', 'mine', 'i ', 'for me'];
    const isSelfQuery = selfPatterns.some(p => lowerQuery.includes(p));

    if (isSelfQuery && loggedInEmployeeId) {
        intent.params.employeeId = loggedInEmployeeId;
        if (lowerQuery.includes('salary') || lowerQuery.includes('pay') || lowerQuery.includes('slip')) {
            console.log("✅ Intent Detected: EMPLOYEE_SALARY");
            intent.type = 'EMPLOYEE_SALARY';
        } else if (lowerQuery.includes('timesheet') || lowerQuery.includes('hours')) {
            console.log("✅ Intent Detected: TIMESHEET_LIST");
            intent.type = 'TIMESHEET_LIST';
        } else if (lowerQuery.includes('loan') || lowerQuery.includes('advance')) {
            console.log("✅ Intent Detected: LOAN_LIST");
            intent.type = 'LOAN_LIST';
        } else if (lowerQuery.includes('leave') || lowerQuery.includes('remaining') || lowerQuery.includes('balance')) {
            console.log("✅ Intent Detected: LEAVE_BALANCE (Self)");
            intent.type = 'LEAVE_BALANCE';
        } else {
            console.log("✅ Intent Detected: EMPLOYEE_LOOKUP (Self)");
            intent.type = 'EMPLOYEE_LOOKUP';
        }
        return intent;
    }

    // PRIORITY 3: Domain Keywords
    if (lowerQuery.includes('project')) { console.log("✅ Intent Detected: PROJECT_LIST"); intent.type = 'PROJECT_LIST'; return intent; }
    else if (lowerQuery.includes('team')) { console.log("✅ Intent Detected: TEAM_LIST"); intent.type = 'TEAM_LIST'; return intent; }
    else if (lowerQuery.includes('timesheet')) { console.log("✅ Intent Detected: TIMESHEET_LIST"); intent.type = 'TIMESHEET_LIST'; return intent; }
    else if (lowerQuery.includes('payroll') || lowerQuery.includes('salary') || lowerQuery.includes('earnings')) { console.log("✅ Intent Detected: PAYROLL_LIST"); intent.type = 'PAYROLL_LIST'; return intent; }
    else if (lowerQuery.includes('loan') || lowerQuery.includes('advance')) { console.log("✅ Intent Detected: LOAN_LIST"); intent.type = 'LOAN_LIST'; return intent; }
    else if (lowerQuery.includes('intern')) { console.log("✅ Intent Detected: INTERNSHIP_LIST"); intent.type = 'INTERNSHIP_LIST'; return intent; }
    else if (lowerQuery.includes('expenditure') || lowerQuery.includes('expense')) { console.log("✅ Intent Detected: EXPENDITURE_LIST"); intent.type = 'EXPENDITURE_LIST'; return intent; }
    else if (lowerQuery.includes('allocation') || lowerQuery.includes('resource')) { console.log("✅ Intent Detected: ALLOCATION_LIST"); intent.type = 'ALLOCATION_LIST'; return intent; }

    // Announcement queries
    else if (lowerQuery.includes('announcement') || lowerQuery.includes('notice')) {
        console.log("✅ Intent Detected: ANNOUNCEMENT_LIST");
        intent.type = 'ANNOUNCEMENT_LIST';
        return intent;
    }

    // PRIORITY 4: Name-based employee search
    const namePatterns = [
        /who\s+is\s+([a-z]+)/i,
        /show\s+me\s+([a-z]+)/i,
        /find\s+([a-z]+)/i,
        /search\s+([a-z]+)/i,
        /about\s+([a-z]+)/i,
        /details?\s+(?:of\s+)?([a-z]+)/i,
        /info\s+(?:of\s+)?([a-z]+)/i,
        /(?:designation|role|position|department|dept|salary)\s+of\s+([a-z]+)/i,
        /([a-z]+)'s\s+(?:designation|role|position|department|dept|salary|profile)/i
    ];

    for (const pattern of namePatterns) {
        const nameMatch = lowerQuery.match(pattern);
        if (nameMatch && nameMatch[1]) {
            const extractedName = nameMatch[1].trim();
            const stopWords = ['details', 'detail', 'employee', 'employees', 'staff', 'leave', 'policy', 'announcement', 'the', 'all', 'list', 'show', 'me', 'is', 'are', 'about', 'of', 'for', 'search', 'find', 'info', 'information', 'query', 'question', 'help'];

            if (!stopWords.includes(extractedName) && extractedName.length > 2) {
                console.log("✅ Intent Detected: EMPLOYEE_NAME_LOOKUP");
                intent.type = 'EMPLOYEE_NAME_LOOKUP';
                intent.params.name = extractedName;

                // Also detect requested field for name-based lookup
                const fieldKeywords = {
                    designation: ['designation', 'role', 'position', 'job title'],
                    department: ['department', 'dept', 'team'],
                    salary: ['salary', 'pay', 'ctc', 'compensation'],
                    email: ['email', 'mail'],
                    phone: ['phone', 'mobile', 'contact', 'number'],
                    leave: ['leave', 'balance', 'remaining', 'vacation']
                };
                for (const [field, keywords] of Object.entries(fieldKeywords)) {
                    if (keywords.some(k => lowerQuery.includes(k))) {
                        intent.params.requestedField = field;
                        break;
                    }
                }
                return intent;
            }
        }
    }

    if (lowerQuery.includes('employee') || lowerQuery.includes('staff')) {
        console.log("✅ Intent Detected: EMPLOYEE_SEARCH");
        intent.type = 'EMPLOYEE_SEARCH';
        return intent;
    }

    console.log("⚠️ Intent Unknown");
    return intent;
}

// STEP 2: Resolve Intent Function
function resolvePolicyIntent(query) {
    if (query.includes('resignation') || query.includes('notice period') || query.includes('exit') || query.includes('termination') || query.includes('bond') || query.includes('separation')) return "SEPRATION POLICY"; // Match DB Typo

    // Explicitly exclude personal balance queries from policy strict lookup
    const leaveKeywords = ['leave', 'vacation', 'holiday', 'off', 'day off'];
    const balanceKeywords = ['balance', 'remaining', 'available', 'have', 'get', 'status', 'left', 'how many', 'how much'];
    const hasLeave = leaveKeywords.some(w => query.includes(w));
    const hasBalance = balanceKeywords.some(w => query.includes(w));
    const hasMy = query.includes('my') || query.includes('me') || query.includes('myself');

    if (hasLeave && (hasBalance || hasMy)) {
        return null;
    }

    if (query.includes('leave') || query.includes('vacation') || query.includes('holiday')) return "LEAVE POLICY";
    if (query.includes('pf') || query.includes('provident fund') || query.includes('gratuity')) return "PF & GRATUITY";
    if (query.includes('bonus') || query.includes('incentive') || query.includes('variable pay')) return "BONUS";
    if (query.includes('permission') || query.includes('late entry') || query.includes('late coming') || query.includes('attendance')) return "PERMISSION POLICY";
    if (query.includes('insurance') || query.includes('medical') || query.includes('mediclaim') || query.includes('health coverage')) return "HEALTH INSURANCE";
    return null;
}

// ==================== DATA FETCHING VIA SERVICES ====================
async function fetchDataViaServices(intent, lowerQuery, isAdmin, loggedInEmployeeId) {
    let result = { queryType: intent.type };

    try {
        switch (intent.type) {
            case 'POLICY_STRICT_LOOKUP':
                // STEP 3: Fetch ONLY that policy
                const searchName = intent.params.policyName.replace(/ policy/i, '').trim(); // Remove " POLICY"
                console.log(`🔍 Strict Policy Fetch: "${intent.params.policyName}" -> Searching: "${searchName}"`);

                const strictResult = await policyService.searchPolicies(searchName);

                if (strictResult.success && strictResult.data.length > 0) {
                    // Try to find exact match on name or title using the core term
                    const bestMatch = strictResult.data.find(p =>
                        (p.policyName || p.title).toLowerCase().includes(searchName.toLowerCase())
                    ) || strictResult.data[0];

                    result.found = true;
                    result.policy = bestMatch;
                    result.count = 1;
                } else {
                    result.found = false;
                    result.policy = null;
                }
                break;

            case 'EMPLOYEE_LOOKUP':
            case 'EMPLOYEE_SALARY':
                console.log(`🔍 Calling EmployeeService.getEmployeeById(${intent.params.employeeId})`);
                const empResult = await employeeService.getEmployeeById(intent.params.employeeId);

                if (empResult.success && empResult.found) {
                    result.found = true;
                    result.employee = empResult.data;
                } else {
                    result.found = false;
                    result.triedId = intent.params.employeeId;
                }
                break;

            case 'LEAVE_BALANCE':
            case 'EMPLOYEE_LEAVE':
                const empId = intent.params.employeeId || loggedInEmployeeId;
                if (empId) {
                    const empRes = await employeeService.getEmployeeById(empId);
                    if (empRes.success && empRes.found) {
                        const approvals = await LeaveApplication.find({
                            employeeId: empId,
                            status: 'Approved'
                        }).lean();
                        result.found = true;
                        result.employee = empRes.data;
                        result.leaveBalance = calcBalanceForEmployee(empRes.data, approvals);
                    } else {
                        result.found = false;
                    }
                } else if (isAdmin) {
                    const allEmps = await Employee.find({}).sort({ name: 1 }).lean();
                    const empIds = allEmps.map(e => e.employeeId).filter(Boolean);
                    const allApprovals = await LeaveApplication.find({
                        employeeId: { $in: empIds },
                        status: 'Approved'
                    }).lean();

                    const usedMap = {};
                    allApprovals.forEach(rec => {
                        if (!usedMap[rec.employeeId]) usedMap[rec.employeeId] = [];
                        usedMap[rec.employeeId].push(rec);
                    });

                    result.allBalances = allEmps.map(emp => calcBalanceForEmployee(emp, usedMap[emp.employeeId] || []));
                    result.count = result.allBalances.length;
                }
                break;

            case 'POLICY_ID_LOOKUP':
                const policyResult = await policyService.getPolicyById(intent.params.policyId);
                if (policyResult.success && policyResult.found) {
                    result.found = true;
                    result.policy = policyResult.data;
                } else {
                    result.found = false;
                }
                break;

            case 'POLICY_LIST':
            case 'POLICY_SEARCH':
                const policiesResult = intent.params.keyword
                    ? await policyService.searchPolicies(intent.params.keyword)
                    : await policyService.getAllPolicies();

                if (policiesResult.success) {
                    result.policies = policiesResult.data;
                    result.count = policiesResult.data.length;
                    result.found = result.count > 0;
                } else {
                    result.policies = [];
                    result.count = 0;
                }
                break;

            case 'ANNOUNCEMENT_LIST':
                const announcementsResult = await announcementService.getRecentAnnouncements(5);
                if (announcementsResult.success) {
                    result.announcements = announcementsResult.data;
                    result.count = announcementsResult.data.length;
                } else {
                    result.announcements = [];
                    result.count = 0;
                }
                break;

            case 'PROJECT_LIST':
                const projRes = await projectService.getAllProjects();
                result.projects = projRes.success ? projRes.data : [];
                result.count = result.projects ? result.projects.length : 0;
                break;

            case 'TEAM_LIST':
                const teamRes = await teamService.getAllTeams();
                result.teams = teamRes.success ? teamRes.data : [];
                result.count = result.teams ? result.teams.length : 0;
                break;

            case 'TIMESHEET_LIST':
                if (isAdmin && !intent.params.employeeId) {
                    const tsRes = await timesheetService.getAllTimesheets();
                    result.timesheets = tsRes.success ? tsRes.data : [];
                } else {
                    const targetId = intent.params.employeeId || loggedInEmployeeId;
                    if (targetId) {
                        const tsRes = await timesheetService.getTimesheetsByEmployee(targetId);
                        result.timesheets = tsRes.success ? tsRes.data : [];
                    }
                }
                result.count = result.timesheets ? result.timesheets.length : 0;
                break;

            case 'PAYROLL_LIST':
                if (isAdmin && !intent.params.employeeId) {
                    const payRes = await payrollService.getAllPayrolls();
                    result.payrolls = payRes.success ? payRes.data : [];
                } else {
                    const targetId = intent.params.employeeId || loggedInEmployeeId;
                    if (targetId) {
                        const payRes = await payrollService.getPayrollByEmployee(targetId);
                        result.payrolls = payRes.success ? payRes.data : [];
                    }
                }
                result.count = result.payrolls ? result.payrolls.length : 0;
                break;

            case 'LOAN_LIST':
                if (isAdmin && !intent.params.employeeId) {
                    const loanRes = await loanService.getAllLoans();
                    result.loans = loanRes.success ? loanRes.data : [];
                } else {
                    const targetId = intent.params.employeeId || loggedInEmployeeId;
                    if (targetId) {
                        const loanRes = await loanService.getLoansByEmployee(targetId);
                        result.loans = loanRes.success ? loanRes.data : [];
                    }
                }
                result.count = result.loans ? result.loans.length : 0;
                break;

            case 'INTERNSHIP_LIST':
                if (isAdmin) {
                    const intRes = await internshipService.getAllInternships();
                    result.internships = intRes.success ? intRes.data : [];
                }
                break;

            case 'EXPENDITURE_LIST':
                if (isAdmin) {
                    const expRes = await monthlyExpenditureService.getAllExpenditures();
                    result.expenditures = expRes.success ? expRes.data : [];
                }
                break;

            case 'EMPLOYEE_NAME_LOOKUP':
                const nameSearchResult = await employeeService.searchEmployees(intent.params.name);
                if (nameSearchResult.success && nameSearchResult.data.length > 0) {
                    if (nameSearchResult.data.length === 1) {
                        result.found = true;
                        result.employee = nameSearchResult.data[0];
                    } else {
                        result.employees = nameSearchResult.data;
                        result.count = nameSearchResult.data.length;
                    }
                } else {
                    result.found = false;
                    result.searchedName = intent.params.name;
                }
                break;

            case 'EMPLOYEE_SEARCH':
                const employeesResult = await employeeService.getAllEmployees();
                if (employeesResult.success) {
                    result.employees = employeesResult.data;
                    result.count = employeesResult.data.length;
                }
                break;

            default:
                result.message = "Could not determine the query type.";
        }
    } catch (error) {
        console.error(`Service Error (${intent.type}):`, error.message);
        result.error = error.message;
    }
    return result;
}

// ==================== AI RESPONSE ====================
async function generateAIResponse(query, serviceData, intent) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        let prompt;

        const isPersonal = ['LEAVE_BALANCE', 'EMPLOYEE_SALARY', 'EMPLOYEE_LOOKUP', 'EMPLOYEE_NAME_LOOKUP'].includes(intent.type);

        const isPolicySearch = intent.type === 'POLICY_SEARCH' && serviceData.policies && serviceData.policies.length === 1;

        if (intent.type === 'POLICY_STRICT_LOOKUP' && serviceData.policy) {
            // Strict Prompt for Policy
            prompt = `
You are an HR Policy Assistant.

USER QUERY: "${query}"
DETECTED INTENT: ${intent.params.policyName}
POLICY CONTENT:
${JSON.stringify(serviceData.policy || {}, null, 2)}

INSTRUCTIONS:
1. Extract and return the EXACT rule related to the query from the POLICY CONTENT above.
2. If the specificity is missing, answer concisely.
3. If the specific rule is not explicitly mentioned in the text provided, respond EXACTLY:
   "This detail is not explicitly mentioned in the company policy."

FORMAT:
📘 Policy: <Policy Name> – <Section Name (if applicable)>

• <Exact rule extracted from the policy content>

📌 For more details, ask: "Explain <Policy Name>"
            `;
        } else if (isPolicySearch) {
            const p = serviceData.policies[0];
            prompt = `
You are an HR Policy Assistant.
USER QUERY: "${query}"
POLICY NAME: ${p.policyName || p.title}
POLICY CONTENT:
${p.content || p.benefits?.join('\n') || "No content available."}

INSTRUCTIONS:
1. Extract and return ONLY the specific information requested in the query from the policy content above.
2. If the user asks for "eligibility", only provide the rules related to eligibility.
3. Be direct, accurate, and concise.
4. If the specific information is not found, respond: "This detail is not explicitly mentioned in the ${p.policyName || p.title} policy."

FORMAT:
📘 Policy: ${p.policyName || p.title}
• <extracted content>
`;
        } else if (isPersonal) {
            const fieldHint = intent.params.requestedField ? `The user is specifically asking for the ${intent.params.requestedField}.` : "The user is asking for general profile information.";
            prompt = `
You are an HR Assistant.
USER QUERY: "${query}"
${fieldHint}
CONSTITUTION: Answer ONLY based on the SYSTEM DATA provided below.

SYSTEM DATA:
${JSON.stringify(serviceData, null, 2)}

INSTRUCTIONS:
1. Be extremely direct and concise.
2. If a specific field was asked (e.g. designation), only mention that information.
3. If no specific field was asked, provide a very brief summary.
4. Format: "The [field] for [Employee Name] is [value]."
`;
        } else {
            // General Prompt for other things
            prompt = `
You are an HR Assistant.
USER QUERY: "${query}"
CONTEXT DATA:
${JSON.stringify(serviceData, null, 2)}

Answer the user's question based on the data provided. Be helpful and professional.
`;
        }

        const result = await model.generateContent(prompt);
        return (await result.response).text();
    } catch (err) {
        console.error("AI Error:", err.message);
        return generateBudgetResponse(serviceData, intent);
    }
}

// ==================== BUDGET RESPONSE (No AI) ====================
function generateBudgetResponse(serviceData, intent) {
    if (serviceData.error || serviceData.success === false) {
        return "Service is currently unavailable. Please try again later.";
    }

    if (intent.type === 'POLICY_STRICT_LOOKUP') {
        if (serviceData.policy) {
            const p = serviceData.policy;
            const name = p.policyName || p.title || "Policy";
            return `📘 **${name}**\n\n(AI unavailable) Content found. Please view the full policy in the dashboard.`;
        }
        return "This detail is not explicitly mentioned in the company policy.";
    }

    switch (intent.type) {
        case 'EMPLOYEE_LOOKUP':
        case 'EMPLOYEE_SALARY':
        case 'EMPLOYEE_NAME_LOOKUP':
            if (serviceData.found && serviceData.employee) {
                const emp = serviceData.employee;
                if (intent.params.requestedField) {
                    const field = intent.params.requestedField;
                    const val = emp[field] || emp.designation || emp.department || "not found";
                    return `The ${field} for ${emp.name} is **${val}**.`;
                }
                return formatEmployeeProfile(emp);
            }
            if (serviceData.employees && serviceData.employees.length > 0) {
                let response = `👥 Found ${serviceData.employees.length} employees matching "${serviceData.searchedName || 'search'}": \n\n`;
                response += serviceData.employees.map((e, i) => {
                    return `${i + 1}. ${e.name} (${e.employeeId || 'N/A'}) - ${e.designation || e.position || 'N/A'} `;
                }).join('\n');
                return response;
            }
            return "Data not found in the database.";

        case 'EMPLOYEE_LEAVE':
        case 'LEAVE_BALANCE':
            if (serviceData.leaveBalance) {
                return formatLeaveBalance(serviceData.leaveBalance);
            }
            if (serviceData.allBalances && serviceData.allBalances.length > 0) {
                let resp = `📋 Employee Leave Balances(${serviceData.allBalances.length}): \n\n`;
                resp += serviceData.allBalances.map(b => {
                    const bal = b.balances;
                    return `• ** ${b.name}** (${b.employeeId}): Remaining: ${bal.totalBalance.toFixed(1)} (Used: ${bal.casual.used + bal.sick.used + bal.privilege.used})`;
                }).join('\n');
                return resp;
            }
            return "Leave balance information not available.";

        case 'EMPLOYEE_SEARCH':
            if (serviceData.employees && serviceData.employees.length > 0) {
                return `👥 Found ${serviceData.employees.length} Employees: \n\n` +
                    serviceData.employees.map((e, i) => `${i + 1}. ${e.name} (${e.employeeId}) - ${e.designation} `).join('\n');
            }
            return "No employees found.";

        case 'POLICY_ID_LOOKUP':
            if (serviceData.found && serviceData.policy) {
                const p = serviceData.policy;
                const id = p.policyId || p.policy_id || p.title || "N/A";
                const name = p.policyName || p.title || "Unnamed Policy";
                const content = p.content || p.benefits?.join(', ') || "No content available.";
                return `📄 ** ${name}** (${id}) \n\n${content} `;
            }
            return "Policy details not found.";

        case 'POLICY_LIST':
        case 'POLICY_SEARCH':
            if (serviceData.policies && serviceData.policies.length > 0) {
                // Determine best search keywords to pass for detail extraction
                const filterKeywords = (serviceData.searchKeywords && serviceData.searchKeywords.length > 0)
                    ? serviceData.searchKeywords
                    : (intent.params?.keyword || []);

                if (intent.params?.keyword) {
                    const keywords = Array.isArray(intent.params.keyword) ? intent.params.keyword : [intent.params.keyword];
                    const bestMatch = serviceData.policies.find(p => {
                        const name = (p.policyName || p.title || "").toLowerCase();
                        return keywords.some(k => name.includes(k.toLowerCase()));
                    });
                    if (bestMatch) return formatPolicyDetail(bestMatch, filterKeywords);
                }
                if (serviceData.policies.length === 1) return formatPolicyDetail(serviceData.policies[0], filterKeywords);
                return formatPolicyList(serviceData.policies);
            }
            return "No policies found.";

        case 'PROJECT_LIST':
            if (serviceData.projects && serviceData.projects.length > 0) {
                return `🚀 Found ${serviceData.projects.length} Projects: \n\n` +
                    serviceData.projects.map((p, i) => `${i + 1}. ${p.name} (${p.status})`).join('\n');
            }
            return "No projects found.";

        case 'TEAM_LIST':
            if (serviceData.teams && serviceData.teams.length > 0) {
                return `👥 Found ${serviceData.teams.length} Teams: \n\n` +
                    serviceData.teams.map((t, i) => `${i + 1}. ${t.name} (${t.members ? t.members.length : 0} members)`).join('\n');
            }
            return "No teams found.";

        case 'TIMESHEET_LIST':
            if (serviceData.timesheets && serviceData.timesheets.length > 0) {
                return `⏱️ Found ${serviceData.timesheets.length} Timesheet Entries: \n\n` +
                    serviceData.timesheets.map((t, i) => `${i + 1}. ${t.date || t.period || 'Date N/A'} - ${t.hoursWorked || 0} hrs(${t.status})`).join('\n');
            }
            return "No timesheets found.";

        case 'PAYROLL_LIST':
            if (serviceData.payrolls && serviceData.payrolls.length > 0) {
                return `💰 Found ${serviceData.payrolls.length} Payroll Record(s): \n\n` +
                    serviceData.payrolls.map((p, i) => `
        ${i + 1}. 🧾 Payroll Details
        ────────────────────────
        Employee ID: ${p.employeeId || '-'}
        Employee Name: ${p.employeeName || '-'}
        Total Earnings: ₹${(p.totalEarnings || 0).toLocaleString()}
        Net Salary: ₹${(p.netSalary || 0).toLocaleString()}
        Bank Name: ${p.bankName || '-'}
        Status: ${p.status || '-'}
    `.trim()).join('\n\n');
            }
            return "❌ No payroll records found.";

        case 'LOAN_LIST':
            if (serviceData.loans && serviceData.loans.length > 0) {
                return `💸 Found ${serviceData.loans.length} Loan Records: \n\n` +
                    serviceData.loans.map((l, i) => `${i + 1}. Rs.${l.amount} - ${l.reason} (${l.status})`).join('\n');
            }
            return "No loan records found.";

        default:
            return "Data not found in the database or service unavailable.";
    }
}

exports.getChatLogs = async (req, res) => {
    try {
        const logs = await ChatQuery.find().sort({ createdAt: -1 }).limit(100);
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching logs" });
    }
};