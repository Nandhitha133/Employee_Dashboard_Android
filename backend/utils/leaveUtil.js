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

    if (isTrainee) {
        const traineeMonths = Math.min(monthsOfService, 12);
        privilegeAlloc = traineeMonths * 1;
        casualAlloc = 0;
        sickAlloc = 0;
    } else {
        const firstSix = Math.min(monthsOfService, 6);
        const afterSix = Math.max(monthsOfService - 6, 0);
        privilegeAlloc = (firstSix * 1) + (afterSix * 1.25);
        casualAlloc = afterSix * 0.5;
        sickAlloc = afterSix * 0.5;
    }

    // Calculate used leaves
    let casualUsed = 0, sickUsed = 0, privilegeUsed = 0;
    approvedLeaves.forEach(l => {
        const type = (l.leaveType || '').toLowerCase();
        const days = Number(l.totalDays || 0);
        if (type.includes('casual')) casualUsed += days;
        else if (type.includes('sick')) sickUsed += days;
        else if (type.includes('privilege') || type === 'pl') privilegeUsed += days;
    });

    const round = (n) => Math.round(n * 10) / 10;

    return {
        employeeId: emp.employeeId,
        name: emp.name,
        monthsOfService,
        balances: {
            casual: { allocated: round(casualAlloc), used: round(casualUsed), balance: round(casualAlloc - casualUsed) },
            sick: { allocated: round(sickAlloc), used: round(sickUsed), balance: round(sickAlloc - sickUsed) },
            privilege: { allocated: round(privilegeAlloc), used: round(privilegeUsed), balance: round(privilegeAlloc - privilegeUsed) },
            totalBalance: round((casualAlloc + sickAlloc + privilegeAlloc) - (casualUsed + sickUsed + privilegeUsed))
        }
    };
}

module.exports = {
    calcBalanceForEmployee
};
