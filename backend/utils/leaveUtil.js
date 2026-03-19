/**
 * Utility for calculating employee leave balances based on designation and service duration.
 */

/**
 * Calculates leave balance for an employee.
 * @param {Object} emp - Employee document (lean).
 * @param {Array} approvedLeaves - List of approved leave applications.
 * @returns {Object} Balance data.
 */
function calcBalanceForEmployee(emp, approvedLeaves = []) {
    if (!emp) return null;

    // PRIORITY: Use existing leave fields if present in DB
    // (Ghost fields from user data like "Total Leave", "Remaining Leave")
    const totalAlloc = Number(emp.totalLeave || emp.totalLeaves || emp.allotedLeave || emp.allotedLeaves || 0);
    const balance = Number(emp.remainingLeave || emp.remainingLeaves || emp.balanceLeave || emp.balanceLeaves || 0);
    const taken = Number(emp.leaveTaken || emp.leavesTaken || (totalAlloc - balance) || 0);

    if (totalAlloc > 0 || balance > 0 || taken > 0) {
        return {
            employeeId: emp.employeeId,
            name: emp.name,
            balances: {
                casual: null, // No specific breakdown available from direct fields
                sick: null,
                privilege: null,
                totalAllocated: totalAlloc,
                totalUsed: taken,
                totalBalance: balance || (totalAlloc - taken)
            },
            source: 'database'
        };
    }

    const doj = emp.dateOfJoining || emp.doj;
    if (!doj) return { balances: null, message: "Date of Joining missing and no direct leave fields found." };

    const today = new Date();
    const joinDate = new Date(doj);

    // Calculate months of service
    let monthsOfService = (today.getFullYear() - joinDate.getFullYear()) * 12;
    monthsOfService += today.getMonth() - joinDate.getMonth();
    if (today.getDate() < joinDate.getDate()) monthsOfService--;
    monthsOfService = Math.max(0, monthsOfService);

    const designation = (emp.designation || '').toLowerCase();
    const isTrainee = designation.includes('trainee');

    let casualAlloc = 0, sickAlloc = 0, privilegeAlloc = 0;
    let casualUsed = 0, sickUsed = 0, privilegeUsed = 0;

    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    if (isTrainee) {
        // Trainee: 1 PL, No Carry Forward
        privilegeAlloc = 1;
        casualAlloc = 0;
        sickAlloc = 0;

        privilegeUsed = approvedLeaves
            .filter(l => {
                const type = (l.leaveType || '').toLowerCase();
                return type.includes('privilege') || type === 'pl';
            })
            .filter(l => {
                const d = new Date(l.startDate || l.date);
                return d >= currentMonthStart && d <= currentMonthEnd;
            })
            .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);

    } else {
        if (monthsOfService < 6) {
            // First 6 months: 1 PL, No Carry Forward
            privilegeAlloc = 1;
            casualAlloc = 0;
            sickAlloc = 0;

            privilegeUsed = approvedLeaves
                .filter(l => {
                    const type = (l.leaveType || '').toLowerCase();
                    return type.includes('privilege') || type === 'pl';
                })
                .filter(l => {
                    const d = new Date(l.startDate || l.date);
                    return d >= currentMonthStart && d <= currentMonthEnd;
                })
                .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);
        } else {
            // After 6 months: Carry Forward Allowed
            // Allocation starts from 6th month onwards
            const afterSix = Math.max(0, monthsOfService - 6);
            privilegeAlloc = afterSix * 1.25;
            casualAlloc = afterSix * 0.5;
            sickAlloc = afterSix * 0.5;

            const threshold = new Date(joinDate);
            threshold.setMonth(threshold.getMonth() + 6);

            privilegeUsed = approvedLeaves
                .filter(l => {
                    const type = (l.leaveType || '').toLowerCase();
                    return type.includes('privilege') || type === 'pl';
                })
                .filter(l => new Date(l.startDate || l.date) >= threshold)
                .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);

            casualUsed = approvedLeaves
                .filter(l => (l.leaveType || '').toLowerCase().includes('casual'))
                .filter(l => new Date(l.startDate || l.date) >= threshold)
                .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);

            sickUsed = approvedLeaves
                .filter(l => (l.leaveType || '').toLowerCase().includes('sick'))
                .filter(l => new Date(l.startDate || l.date) >= threshold)
                .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);
        }
    }

    const round = (n) => Math.round(n * 10) / 10;

    return {
        employeeId: emp.employeeId,
        name: emp.name,
        monthsOfService,
        balances: {
            casual: { allocated: round(casualAlloc), used: round(casualUsed), balance: round(casualAlloc - casualUsed) },
            sick: { allocated: round(sickAlloc), used: round(sickUsed), balance: round(sickAlloc - sickUsed) },
            privilege: { allocated: round(privilegeAlloc), used: round(privilegeUsed), balance: round(privilegeAlloc - privilegeUsed) },
            isMonthlyExpiry: isTrainee || monthsOfService < 6,
            totalAllocated: round(casualAlloc + sickAlloc + privilegeAlloc),
            totalUsed: round(casualUsed + sickUsed + privilegeUsed),
            totalBalance: round((casualAlloc + sickAlloc + privilegeAlloc) - (casualUsed + sickUsed + privilegeUsed))
        }
    };
}

module.exports = {
    calcBalanceForEmployee
};
