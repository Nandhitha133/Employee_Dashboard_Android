/**
 * Formats employee data dynamically based on available fields.
 * @param {Object} emp - The employee document (lean object).
 * @returns {String} Formatted string.
 */
function formatEmployeeProfile(emp) {
    if (!emp) return "No employee information available.";

    let output = "**Employee Information**\n";

    // EXCLUDED FIELDS (Technical/Sensitive)
    const excludedFields = [
        '_id', '__v', 'password', 'createdAt', 'updatedAt',
        'otp', 'otpExpires', 'resetPasswordToken', 'resetPasswordExpires',
        'history', 'profileImage', 'salt', 'hash'
    ];

    // Helper to format date
    const formatDate = (d) => {
        if (!d) return null;
        try {
            return new Date(d).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch (e) { return d; }
    };

    // Helper to format keys (camelCase -> Title Case)
    const formatKey = (key) => {
        return key
            .replace(/([A-Z])/g, ' $1') // insert space before capital
            .replace(/^./, str => str.toUpperCase()) // uppercase first
            .trim();
    };

    // DYANMIC ITERATION OVER ALL KEYS
    const keys = Object.keys(emp);

    keys.forEach(key => {
        if (excludedFields.includes(key)) return;

        let value = emp[key];

        // Skip empty values
        if (value === undefined || value === null || value === "" || value === "N/A") return;

        // Handle Dates
        if (value instanceof Date || (typeof value === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('dob') || key.toLowerCase().includes('doj')) && !key.toLowerCase().includes('update'))) {
            if (value instanceof Date || (value.length > 9 && !isNaN(Date.parse(value)))) {
                value = formatDate(value);
            }
        }

        // Handle Arrays
        if (Array.isArray(value)) {
            // Special complex array handling for visual layout if strictly array of objects
            if (value.length > 0 && typeof value[0] === 'object') {
                // Will handle at end for better block formatting
                return;
            }
            // Join simple arrays
            if (value.length > 0 && typeof value[0] !== 'object') {
                value = value.join(', ');
            } else {
                return;
            }
        }

        // Handle Nested Objects (non-array, non-date)
        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            return; // Skip complex nested objects here
        }

        output += `${formatKey(key)}: ${value}\n`;
    });

    // Handle Complex Arrays (like previousOrganizations) generically
    keys.forEach(key => {
        if (excludedFields.includes(key)) return;
        let value = emp[key];

        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            output += `\n**${formatKey(key)}**:\n`;
            value.forEach(item => {
                // For each object in array, print its keys
                const subKeys = Object.keys(item).filter(k => k !== '_id');
                let lineParts = [];
                // Heuristic: try to find common "title" fields to put first
                const prioritized = ['organization', 'company', 'name', 'title', 'designation', 'role'];

                // Sort keys based on priority
                subKeys.sort((a, b) => {
                    const idxA = prioritized.findIndex(p => a.toLowerCase().includes(p));
                    const idxB = prioritized.findIndex(p => b.toLowerCase().includes(p));
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return 0;
                });

                subKeys.forEach(k => {
                    let v = item[k];
                    if (k.toLowerCase().includes('date') || k.toLowerCase().includes('start') || k.toLowerCase().includes('end')) {
                        v = formatDate(v);
                    }
                    if (v) lineParts.push(v);
                });
                output += `- ${lineParts.join(', ')}\n`;
            });
        }
    });

    return output;
}

/**
 * Formats leave balance data into a human-readable string.
 * @param {Object} balanceData - The calculated balance object.
 * @returns {String}
 */
function formatLeaveBalance(balanceData) {
    if (!balanceData || !balanceData.balances) return "Leave balance information is not available.";

    const b = balanceData.balances;

    // Check if we have a category breakdown
    const hasBreakdown = b.casual !== null && b.sick !== null;

    if (!hasBreakdown) {
        // Handle cases where we only have total values (from direct DB fields)
        const total = b.totalAllocated || 0;
        const remaining = b.totalBalance || 0;
        const used = b.totalUsed || (total - remaining);

        return `Total Leave: ${total.toFixed(1)} Leave Taken: ${used.toFixed(1)} Remaining Leave: ${remaining.toFixed(1)}`;
    }

    const casual = b.casual || { allocated: 0, used: 0, balance: 0 };
    const sick = b.sick || { allocated: 0, used: 0, balance: 0 };
    const privilege = b.privilege || { allocated: 0, used: 0, balance: 0 };

    const totalAllocated = casual.allocated + sick.allocated + privilege.allocated;
    const totalUsed = casual.used + sick.used + privilege.used;
    const totalBalance = b.totalBalance || (totalAllocated - totalUsed);

    return `Total Leave: ${totalAllocated.toFixed(1)} Leave Taken: ${totalUsed.toFixed(1)} Remaining Leave: ${totalBalance.toFixed(1)}\n\n` +
        `Breakdown:\n` +
        `• Casual Leave: ${casual.balance.toFixed(1)} remaining (${casual.used} used of ${casual.allocated})\n` +
        `• Sick Leave: ${sick.balance.toFixed(1)} remaining (${sick.used} used of ${sick.allocated})\n` +
        `• Privilege Leave: ${privilege.balance.toFixed(1)} remaining (${privilege.used} used of ${privilege.allocated})`;
}

/**
/**
 * Formats a list of policies including content.
 * @param {Array} policies - Array of policy objects.
 * @returns {String}
 */
function formatPolicyList(policies) {
    if (!policies || policies.length === 0) return "No policies found.";

    let list = "📋 Company Policies Found:\n\n";
    policies.forEach((p, i) => {
        const id = p.policyId || p.policy_id || p.title || `POL-${i + 1}`;
        const name = p.policyName || p.title || "Unnamed Policy";

        list += `• **${name}** (${id})\n`;
    });
    list += "\nAsk about a specific policy for more details.";
    return list;
}

/**
 * Formats a single policy with specific layout.
 * @param {Object} p - Policy object.
 * @param {String} keyword - Search keyword to highlight/filter.
 * @returns {String}
 */
function formatPolicyDetail(p, keyword = null) {
    if (!p) return "Policy not found.";

    const name = p.policyName || p.title || "Unnamed Policy";
    const content = p.content || p.benefits?.join('\n') || "No content available.";

    // Split content into bullet points
    let rules = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // If keyword is provided, try to filter or prioritize rules containing any of the keywords
    if (keyword) {
        const keywordList = Array.isArray(keyword) ? keyword : [keyword];
        const lowerKeywords = keywordList.map(k => k.toLowerCase().trim());
        let candidates = [];

        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            const lowerRule = rule.toLowerCase();

            // Count how many keywords match this line
            const matchCount = lowerKeywords.filter(k => lowerRule.includes(k)).length;

            if (matchCount > 0) {
                // SMART CONTEXT: If Header, grab its section
                const isHeader = (rule === rule.toUpperCase() && rule.length < 60 && rule.length > 2) || /^\d+\.?\s+[A-Za-z]/.test(rule);

                let score = matchCount;
                if (isHeader) score += 10; // MASSIVE boost for section headers

                let block = [rule];
                if (isHeader) {
                    let j = i + 1;
                    while (j < rules.length && j < i + 5) {
                        const nextLine = rules[j];
                        // Stop if we hit another header
                        const isNextHeader = (nextLine === nextLine.toUpperCase() && nextLine.length < 60 && nextLine.length > 2) || /^\d+\.?\s+[A-Za-z]/.test(nextLine);
                        if (isNextHeader) break;
                        block.push(nextLine);
                        j++;
                    }
                }

                candidates.push({ score, lines: block, isHeader });
            }
        }

        // SORT BY RELEVANCE
        candidates.sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
            // If the top candidate is a strong header match, only take THAT one.
            const topCandidate = candidates[0];
            let topCandidates = [topCandidate];

            // Only add a second if it's almost as relevant and we aren't already very specific
            if (candidates.length > 1 && candidates[1].score >= topCandidate.score * 0.8 && !topCandidate.isHeader) {
                topCandidates.push(candidates[1]);
            }

            let finalLines = [];
            topCandidates.forEach(c => finalLines.push(...c.lines));

            // Deduplicate lines
            finalLines = [...new Set(finalLines)];

            // Limit total output lines to avoid wall of text
            const limitedLines = finalLines.slice(0, 6);

            let highlightedRules = limitedLines.map(r => {
                let clean = r.replace(/^•\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
                return `• ${clean}`;
            });

            if (finalLines.length > 6) {
                highlightedRules.push(`\n*(...and specific details)*`);
            }

            return `📘 Policy: ${name}\n` +
                `────────────────────\n` +
                `${highlightedRules.join('\n')}\n` +
                `────────────────────`;
        } else {
            // If not found in current policy, use the mandatory strict response
            return `ℹ️ This topic is not covered under ${name}.\n\nWould you like to switch to another policy?`;
        }
    }

    // Default: show all rules as bullet points
    let formattedRules = rules
        .map(line => line.startsWith('•') ? line : `• ${line}`)
        .join('\n');

    return `📘 Policy: ${name}\n` +
        `────────────────────\n` +
        `${formattedRules}\n\n` +
        `📌 For more details, ask:\n` +
        `"Explain ${name}"`;
}

module.exports = {
    formatEmployeeProfile,
    formatLeaveBalance,
    formatPolicyList,
    formatPolicyDetail
};
