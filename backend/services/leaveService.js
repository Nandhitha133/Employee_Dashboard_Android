
const monthsBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months -= start.getMonth();
  months += end.getMonth();
  
  // Adjusted to be Start-of-Month based (consistent with CL/SL and Frontend)
  // We no longer decrement based on day difference.
  // This ensures leave is credited as soon as the month starts.
  
  return Math.max(0, months);
};

const monthsBetweenRange = (startDate, endDate) => {
  return monthsBetween(startDate, endDate);
};

const toLower = (s) => {
  return String(s || '').toLowerCase();
};

const calcBalanceForEmployee = (emp, approvedLeaves = [], calculationDate = new Date()) => {
  const currentDate = new Date(calculationDate);
  const currentYear = currentDate.getFullYear();
  const position = emp.position || emp.role || '';
  const doj = emp.dateOfJoining || emp.hireDate || emp.createdAt;
  
  // Use calculationDate for months of service
  const mos = monthsBetween(doj, currentDate);
  const isTrainee = toLower(position) === 'trainee' || toLower(position).includes('trainee');

  // Derive trainee months from previous organizations if present
  let traineeMonths = 0;
  if (Array.isArray(emp.previousOrganizations) && emp.previousOrganizations.length > 0) {
    const traineeOrg = emp.previousOrganizations.find((o) => toLower(o.position).includes('trainee'));
    if (traineeOrg && (traineeOrg.startDate || doj)) {
      const start = traineeOrg.startDate || doj;
      const end = traineeOrg.endDate || new Date();
      const totalMonths = monthsBetweenRange(start, end);
      traineeMonths = Math.min(12, totalMonths);
    }
  }
  if (isTrainee) {
    traineeMonths = Math.min(12, mos);
  }
  const postTraineeMonths = Math.max(0, mos - traineeMonths);

  let casual = 0, sick = 0;
  let usedCL = 0, usedSL = 0;
  
  // CL/SL Rule: After 6 months of regular service (post-trainee)?
  const afterSix = Math.max(postTraineeMonths - 6, 0);

  if (currentYear >= 2026) {
    // RESTART LOGIC FOR 2026 ONWARDS (Yearly Reset)
    const yearStart = new Date(currentYear, 0, 1);
    const dojDate = new Date(doj);

    if (dojDate < yearStart) {
      // Joined before current year
      // Check if they have completed 6 months service
      if (afterSix > 0) {
        // Accrue based on months passed in CURRENT YEAR
        // (currentMonth + 1) gives credit for current month
        const monthsInYear = currentDate.getMonth() + 1;
        casual = monthsInYear * 0.5;
        sick = monthsInYear * 0.5;
      } else {
        // Still in probation
        casual = 0;
        sick = 0;
      }
    } else {
      // Joined in current year
      // Use standard accumulation logic (0 for first 6 months, then 0.5/month)
      casual = afterSix * 0.5;
      sick = afterSix * 0.5;
    }

    // Filter usage for CURRENT YEAR only
    usedCL = approvedLeaves
      .filter(l => l.leaveType === 'CL')
      .filter(l => new Date(l.startDate).getFullYear() === currentYear)
      .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);

    usedSL = approvedLeaves
      .filter(l => l.leaveType === 'SL')
      .filter(l => new Date(l.startDate).getFullYear() === currentYear)
      .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);

  } else {
    // OLD CUMULATIVE LOGIC (Pre-2026)
    casual += afterSix * 0.5;
    sick += afterSix * 0.5;

    usedCL = approvedLeaves
      .filter(l => l.leaveType === 'CL')
      .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);
      
    usedSL = approvedLeaves
      .filter(l => l.leaveType === 'SL')
      .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);
  }

  const allocated = {
    casual: casual,
    sick: sick,
    privilege: 0
  };

  // PL Logic
  let plAllocated = 0;
  let plUsed = 0;
  let plBalance = 0;
  
  const dojDate = new Date(doj);
  const sixMonthThreshold = new Date(dojDate);
  sixMonthThreshold.setMonth(sixMonthThreshold.getMonth() + 6);
  
  if (isTrainee) {
      // Rule 1: Trainee Designation
      // Monthly Leave Credit: 1 day (PL)
      // Carry Forward: Not Allowed (Expires monthly)
      plAllocated = 1;
      
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      plUsed = approvedLeaves
          .filter(l => l.leaveType === 'PL')
          .filter(l => {
              const d = new Date(l.startDate);
              return d >= currentMonthStart && d <= currentMonthEnd;
          })
           .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);
           
       plBalance = plAllocated - plUsed;
      } else {
          // Rule 2: Other Designations
          if (currentDate < sixMonthThreshold) {
              // First 6 months: No Carry Forward (Expires monthly)
              plAllocated = 1; // Assuming 1 day monthly credit for first 6 months
              
              const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
              
              plUsed = approvedLeaves
                  .filter(l => l.leaveType === 'PL')
                  .filter(l => {
                      const d = new Date(l.startDate);
                      return d >= currentMonthStart && d <= currentMonthEnd;
                  })
                   .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);
                   
               plBalance = plAllocated - plUsed;
          } else {
              // After 6 months: Carry Forward Allowed
              // Add 1 to include the current month in accrual
              const monthsAfterThreshold = monthsBetweenRange(sixMonthThreshold, currentDate) + 1;
              plAllocated = monthsAfterThreshold * 1.25;
              
              plUsed = approvedLeaves
                  .filter(l => l.leaveType === 'PL')
                  .filter(l => new Date(l.startDate) >= sixMonthThreshold)
                   .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);
               
               plBalance = plAllocated - plUsed;
          }
      }
   
   allocated.privilege = plAllocated;
   
   const balance = {
     casual: (allocated.casual - usedCL),
     sick: (allocated.sick - usedSL),
     privilege: plBalance
   };
   const totalBalance = (balance.casual + balance.sick + balance.privilege);

  return {
    employeeId: emp.employeeId || '',
    name: emp.name || emp.employeename || '',
    position: emp.position || emp.role || '',
    division: emp.division || '',
    location: emp.location || emp.branch || '',
    monthsOfService: mos,
    traineeMonths,
    regularMonths: postTraineeMonths,
    balances: {
      casual: { allocated: allocated.casual, used: usedCL, balance: balance.casual },
      sick: { allocated: allocated.sick, used: usedSL, balance: balance.sick },
      privilege: { 
        allocated: allocated.privilege, 
        used: plUsed, 
        balance: balance.privilege,
        nonCarryAllocated: 0,
        carryAllocated: allocated.privilege,
        carryForwardEligibleBalance: balance.privilege
      },
      isMonthlyExpiry: (postTraineeMonths || 0) < 6,
      totalBalance
    }
  };
};

const mergeBalances = (storedBalances, systemCalc, pastSystemCalc) => {
  const mergedBalances = JSON.parse(JSON.stringify(storedBalances));
  
  ['casual', 'sick', 'privilege'].forEach(type => {
      if (mergedBalances[type]) {
          let allocated = Number(mergedBalances[type].allocated) || 0;
          
          // Calculate incremental accrual since last update
          const currentAlloc = Number(systemCalc.balances[type]?.allocated) || 0;
          const pastAlloc = Number(pastSystemCalc.balances[type]?.allocated) || 0;
          
          // We add the difference between current system alloc and past system alloc
          // This preserves any manual adjustments (stored.allocated) while adding new accruals
          const delta = currentAlloc - pastAlloc;
          
          if (Math.abs(delta) > 0.001) {
              allocated += delta;
          }

          // Use system calculated 'used' which is based on actual approved leaves
          const used = Number(systemCalc.balances[type]?.used) || 0;
          
          mergedBalances[type].allocated = allocated;
          mergedBalances[type].used = used;
          mergedBalances[type].balance = allocated - used;
      }
  });
  
  const clBal = Number(mergedBalances.casual?.balance) || 0;
  const slBal = Number(mergedBalances.sick?.balance) || 0;
  const plBal = Number(mergedBalances.privilege?.balance) || 0;
  mergedBalances.totalBalance = clBal + slBal + plBal;
  
  // Ensure isMonthlyExpiry flag is passed
  if (systemCalc.balances && systemCalc.balances.isMonthlyExpiry !== undefined) {
      mergedBalances.isMonthlyExpiry = systemCalc.balances.isMonthlyExpiry;
  }

  return mergedBalances;
};

module.exports = {
  monthsBetween,
  monthsBetweenRange,
  toLower,
  calcBalanceForEmployee,
  mergeBalances
};
