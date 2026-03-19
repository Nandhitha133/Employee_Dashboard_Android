const express = require("express");
const Timesheet = require("../models/Timesheet");
const AdminTimesheet = require("../models/AdminTimesheet");
const Employee = require("../models/Employee");
const User = require("../models/User");
const auth = require("../middleware/auth");
const nodemailer = require("nodemailer");

const router = express.Router();

// Create mailer transport
const mailer = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: (Number(process.env.EMAIL_PORT) || 465) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper function to format week string
function toWeekString(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  const weekStr = String(weekNo).padStart(2, "0");
  return `${date.getUTCFullYear()}-W${weekStr}`;
} 
async function getProjectManagerRecipients(division, location) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const roleRegex = /project\s*manager/i;
  const empPMs = await Employee.find({
    division: division || "",
    location: location || "",
    $or: [
      { role: { $regex: roleRegex } },
      { designation: { $regex: roleRegex } },
      { position: { $regex: roleRegex } }
    ]
  }).select("email employeeId");
  const empEmails = empPMs.map(e => e?.email).filter(e => e && emailRegex.test(e));
  const empIds = empPMs.map(e => e.employeeId).filter(Boolean);
  const userPMs = await User.find({ role: "projectmanager", employeeId: { $in: empIds } }).select("email");
  const userEmails = userPMs.map(u => u?.email).filter(e => e && emailRegex.test(e));
  return Array.from(new Set([...empEmails, ...userEmails]));
}

async function sendTimesheetApprovalRequestEmail(user, sheet) {
  try {
    let employeeProfile = null;
    if (user.employeeId) employeeProfile = await Employee.findOne({ employeeId: user.employeeId }).lean();
    if (!employeeProfile && user.email) employeeProfile = await Employee.findOne({ email: user.email }).lean();
    if (!employeeProfile && user._id) employeeProfile = await Employee.findOne({ userId: user._id }).lean();
    const recipients = await getProjectManagerRecipients(employeeProfile?.division, employeeProfile?.location);
    if (!recipients.length) {
      return { success: false, error: "No project manager recipients" };
    }
    const weekStr = toWeekString(new Date(sheet.weekStartDate));
    const start = new Date(sheet.weekStartDate).toISOString().split("T")[0];
    const end = new Date(sheet.weekEndDate).toISOString().split("T")[0];
    const entries = Array.isArray(sheet.entries) ? sheet.entries : [];
    const toHHMM = (n) => { const totalMin = Math.round(Number(n || 0) * 60); const h = Math.floor(totalMin / 60); const m = totalMin % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };
    const workWeeklyTotal = entries.reduce((sum, e) => { const hrs = Array.isArray(e.hours) ? e.hours : []; return sum + hrs.reduce((a, b) => a + (Number(b) || 0), 0); }, 0);
    const shifts = Array.isArray(sheet.dailyShiftTypes) ? sheet.dailyShiftTypes : [];
    const getShiftBreakHours = (shift) => { if (!shift) return 0; const s = String(shift); if (s.startsWith("First Shift")) return 65 / 60; if (s.startsWith("Second Shift")) return 60 / 60; if (s.startsWith("General Shift")) return 75 / 60; return 0; };
    const computeBreakForDay = (dayIndex) => { const hasProjectWork = entries.some((e) => (e.type || 'project') === 'project' && e.task !== 'Office Holiday' && ((e.hours?.[dayIndex] || 0) > 0)); const hasApprovedLeaveOrHoliday = entries.some((e) => { const val = Number(e.hours?.[dayIndex] || 0); const t = (e.task || '').toLowerCase(); return ((t.includes('leave approved') || t.includes('holiday')) && val > 0); }); const shiftForDay = shifts[dayIndex] || sheet.shiftType || ""; const breakByShift = getShiftBreakHours(shiftForDay); return hasProjectWork && !hasApprovedLeaveOrHoliday ? breakByShift : 0; };
    const breakDaily = [0, 1, 2, 3, 4, 5, 6].map((i) => computeBreakForDay(i));
    const breakWeekly = breakDaily.reduce((s, v) => s + v, 0);
    const totalWithBreak = workWeeklyTotal + breakWeekly;
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const onPrem = sheet.onPremisesTime || { daily: [], weekly: 0 };
    const baseHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;padding:20px;max-width:900px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#333;margin:0 0 20px 0;padding-bottom:10px;border-bottom:2px solid #4F46E5;">Timesheet Submitted Successfully</h2>
        <p style="color:#666;margin-bottom:20px;">Your timesheet has been submitted and is now pending for approval.</p>
        <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin-bottom:20px;">
          <h3 style="color:#4F46E5;margin-top:0;">Employee Details</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#666;"><strong>Name:</strong></td><td style="padding:8px 0;color:#333;">${employeeProfile?.name || user.name || '-'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Employee ID:</strong></td><td style="padding:8px 0;color:#333;">${employeeProfile?.employeeId || user.employeeId || '-'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Division:</strong></td><td style="padding:8px 0;color:#333;">${employeeProfile?.division || '-'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Location:</strong></td><td style="padding:8px 0;color:#333;">${employeeProfile?.location || '-'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Email:</strong></td><td style="padding:8px 0;color:#333;">${user.email || employeeProfile?.email || '-'}</td></tr>
          </table>
        </div>
        <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin-bottom:20px;">
          <h3 style="color:#4F46E5;margin-top:0;">Timesheet Summary</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#666;"><strong>Week:</strong></td><td style="padding:8px 0;color:#333;">${weekStr}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Period:</strong></td><td style="padding:8px 0;color:#333;">${start} to ${end}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Work Hours (sum of entries):</strong></td><td style="padding:8px 0;color:#333;font-weight:bold;">${toHHMM(workWeeklyTotal)} hours</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Break Hours:</strong></td><td style="padding:8px 0;color:#333;">${toHHMM(breakWeekly)} hours</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Total Hours:</strong></td><td style="padding:8px 0;color:#333;font-weight:bold;">${toHHMM(totalWithBreak)} hours</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Status:</strong></td><td style="padding:8px 0;color:#4F46E5;font-weight:bold;">${sheet.status || 'Submitted'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Submitted On:</strong></td><td style="padding:8px 0;color:#333;">${new Date().toLocaleString()}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>On-Premises Weekly:</strong></td><td style="padding:8px 0;color:#333;">${toHHMM(onPrem.weekly || 0)} hours</td></tr>
          </table>
        </div>
        <div style="background:#fff;padding:15px;border-radius:6px;margin-bottom:20px;border:1px solid #eee;">
          <h3 style="color:#4F46E5;margin-top:0;">Time Entries</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;color:#666;">Project</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;color:#666;">Project Code</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;color:#666;">Task</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;color:#666;">Type</th>
                ${dayNames.map(d => `<th style=\"text-align:right;padding:8px;border-bottom:1px solid #eee;color:#666;\">${d}</th>`).join("")}
                <th style="text-align:right;padding:8px;border-bottom:1px solid #eee;color:#666;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(e => { const hrs = Array.isArray(e.hours) ? e.hours : []; const rowTotal = hrs.reduce((a, b) => a + (Number(b) || 0), 0); return `
                  <tr>
                    <td style=\"padding:8px;color:#333;\">${e.project || '-'}</td>
                    <td style=\"padding:8px;color:#333;\">${e.projectCode || '-'}</td>
                    <td style=\"padding:8px;color:#333;\">${e.task || '-'}</td>
                    <td style=\"padding:8px;color:#333;\">${e.type || '-'}</td>
                    ${dayNames.map((_, i) => `<td style=\"text-align:right;padding:8px;color:#333;\">${toHHMM(hrs[i] || 0)}</td>`).join("")}
                    <td style=\"text-align:right;padding:8px;color:#333;font-weight:bold;\">${toHHMM(rowTotal)}</td>
                  </tr>
                `; }).join("")}
              <tr>
                <td colspan="${4 + dayNames.length}" style="padding:8px;color:#333;font-weight:bold;border-top:1px solid #eee;text-align:right;">Work Hours Total</td>
                <td style="text-align:right;padding:8px;color:#333;font-weight:bold;border-top:1px solid #eee;">${toHHMM(workWeeklyTotal)}</td>
              </tr>
              <tr>
                <td colspan="${4 + dayNames.length}" style="padding:8px;color:#333;border-top:1px solid #eee;text-align:right;">Break Hours Total</td>
                <td style="text-align:right;padding:8px;color:#333;border-top:1px solid #eee;">${toHHMM(breakWeekly)}</td>
              </tr>
              <tr>
                <td colspan="${4 + dayNames.length}" style="padding:8px;color:#333;font-weight:bold;border-top:1px solid #eee;text-align:right;">Total (Work + Break)</td>
                <td style="text-align:right;padding:8px;color:#333;font-weight:bold;border-top:1px solid #eee;">${toHHMM(totalWithBreak)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;

    // Admin banner to request approval
    const approvalBanner = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;padding:16px;max-width:900px;margin:0 auto 12px auto;border:1px solid #ffe58f;background:#fff8e1;border-radius:8px;">
        <div style="display:flex;align-items:center;gap:8px;color:#8a6d3b;">
          <strong>Action Required:</strong>
          <span>This timesheet is awaiting your approval.</span>
        </div>
      </div>`;

    const from = "support@caldimengg.in";
    const subject = `Timesheet Submitted - Awaiting Approval (${weekStr})`;
    const html = approvalBanner + baseHtml;
    const mailOptions = { from: `"Timesheet System" <${from}>`, to: recipients.join(","), subject, html };
    const info = await mailer.sendMail(mailOptions);
    return { success: true, messageId: info.messageId, to: recipients };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

// Send timesheet submitted email with improved error handling
async function sendTimesheetSubmittedEmail(user, sheet) {
  try {
    console.log("📧 Attempting to send timesheet submission email...");
    console.log("User object:", JSON.stringify(user, null, 2));

    let targetEmail = "";

    // Try different ways to get the user's email
    if (user.email) {
      targetEmail = user.email;
      console.log("✅ Using email from user object:", targetEmail);
    } else if (user.employeeId) {
      console.log("Looking up email by employeeId:", user.employeeId);
      const emp = await Employee.findOne({ employeeId: user.employeeId }).select("email");
      if (emp?.email) {
        targetEmail = emp.email;
        console.log("✅ Found email via employeeId:", targetEmail);
      } else {
        console.log("❌ No email found for employeeId:", user.employeeId);
      }
    } else if (user._id) {
      // Try to find employee by user ID
      console.log("Looking up email by user._id:", user._id);
      const emp = await Employee.findOne({ userId: user._id }).select("email");
      if (emp?.email) {
        targetEmail = emp.email;
        console.log("✅ Found email via user._id:", targetEmail);
      }
    }

    // If still no email, try to get from Employee collection directly
    if (!targetEmail) {
      console.log("Attempting to find any employee record for user");
      const emp = await Employee.findOne({
        $or: [
          { userId: user._id },
          { employeeId: user.employeeId },
          { email: user.email }
        ]
      }).select("email");

      if (emp?.email) {
        targetEmail = emp.email;
        console.log("✅ Found email via general query:", targetEmail);
      }
    }

    if (!targetEmail) {
      console.log("❌ No email address found for user");
      return {
        success: false,
        error: "No email address found for user"
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      console.log("❌ Invalid email format:", targetEmail);
      return {
        success: false,
        error: "Invalid email format"
      };
    }

    const weekStr = toWeekString(new Date(sheet.weekStartDate));
    const start = new Date(sheet.weekStartDate).toISOString().split("T")[0];
    const end = new Date(sheet.weekEndDate).toISOString().split("T")[0];
    const total = Number(sheet.totalHours || 0);
    const toHHMM = (n) => {
      const totalMin = Math.round(Number(n || 0) * 60);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    const entries = Array.isArray(sheet.entries) ? sheet.entries : [];
    const workWeeklyTotal = entries.reduce((sum, e) => {
      const hrs = Array.isArray(e.hours) ? e.hours : [];
      return sum + hrs.reduce((a, b) => a + (Number(b) || 0), 0);
    }, 0);
    const computeBreakForDay = (dayIndex) => {
      const hasProjectWork = entries.some((e) => (e.type || 'project') === 'project' && e.task !== 'Office Holiday' && ((e.hours?.[dayIndex] || 0) > 0));
      const hasApprovedLeaveOrHoliday = entries.some((e) => {
        const val = Number(e.hours?.[dayIndex] || 0);
        const t = (e.task || '').toLowerCase();
        return ((t.includes('leave approved') || t.includes('holiday')) && val > 0);
      });
      return hasProjectWork && !hasApprovedLeaveOrHoliday ? 1.25 : 0;
    };
    const breakDaily = [0, 1, 2, 3, 4, 5, 6].map((i) => computeBreakForDay(i));
    const breakWeekly = breakDaily.reduce((s, v) => s + v, 0);
    const totalWithBreak = workWeeklyTotal + breakWeekly;
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const fullDayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dailyShiftTypes = Array.isArray(sheet.dailyShiftTypes) ? sheet.dailyShiftTypes : [];
    const onPrem = sheet.onPremisesTime || { daily: [], weekly: 0 };

    let employeeProfile = null;
    try {
      if (user.employeeId) {
        employeeProfile = await Employee.findOne({ employeeId: user.employeeId }).lean();
      }
      if (!employeeProfile && user.email) {
        employeeProfile = await Employee.findOne({ email: user.email }).lean();
      }
      if (!employeeProfile && user._id) {
        employeeProfile = await Employee.findOne({ userId: user._id }).lean();
      }
    } catch (_) { }

    const from = "support@caldimengg.in";
    const subject = `Timesheet Submitted - ${weekStr}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;padding:20px;max-width:900px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#333;margin:0 0 20px 0;padding-bottom:10px;border-bottom:2px solid #4F46E5;">Timesheet Submitted Successfully</h2>
        <p style="color:#666;margin-bottom:20px;">Your timesheet has been submitted and is now pending for approval.</p>
        
        <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin-bottom:20px;">
          <h3 style="color:#4F46E5;margin-top:0;">Employee Details</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Name:</strong></td>
              <td style="padding:8px 0;color:#333;">${employeeProfile?.name || user.name || '-'}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Employee ID:</strong></td>
              <td style="padding:8px 0;color:#333;">${employeeProfile?.employeeId || user.employeeId || '-'}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Division:</strong></td>
              <td style="padding:8px 0;color:#333;">${employeeProfile?.division || '-'}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Location:</strong></td>
              <td style="padding:8px 0;color:#333;">${employeeProfile?.location || '-'}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Email:</strong></td>
              <td style="padding:8px 0;color:#333;">${user.email || employeeProfile?.email || '-'}</td>
            </tr>
          </table>
        </div>

        <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin-bottom:20px;">
          <h3 style="color:#4F46E5;margin-top:0;">Timesheet Summary</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Week:</strong></td>
              <td style="padding:8px 0;color:#333;">${weekStr}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Period:</strong></td>
              <td style="padding:8px 0;color:#333;">${start} to ${end}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Work Hours (sum of entries):</strong></td>
              <td style="padding:8px 0;color:#333;font-weight:bold;">${toHHMM(workWeeklyTotal)} hours</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Break Hours:</strong></td>
              <td style="padding:8px 0;color:#333;">${toHHMM(breakWeekly)} hours</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Total Hours:</strong></td>
              <td style="padding:8px 0;color:#333;font-weight:bold;">${toHHMM(totalWithBreak)} hours</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Status:</strong></td>
              <td style="padding:8px 0;color:#4F46E5;font-weight:bold;">${sheet.status || 'Submitted'}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>Submitted On:</strong></td>
              <td style="padding:8px 0;color:#333;">${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;"><strong>On-Premises Weekly:</strong></td>
              <td style="padding:8px 0;color:#333;">${toHHMM(onPrem.weekly || 0)} hours</td>
            </tr>
          </table>
        </div>

       

        

        

        <div style="background:#fff;padding:15px;border-radius:6px;margin-bottom:20px;border:1px solid #eee;">
          <h3 style="color:#4F46E5;margin-top:0;">Time Entries</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;color:#666;">Project</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;color:#666;">Project Code</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;color:#666;">Task</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;color:#666;">Type</th>
                ${dayNames.map(d => `<th style=\"text-align:right;padding:8px;border-bottom:1px solid #eee;color:#666;\">${d}</th>`).join("")}
                <th style="text-align:right;padding:8px;border-bottom:1px solid #eee;color:#666;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(e => {
      const hrs = Array.isArray(e.hours) ? e.hours : [];
      const rowTotal = hrs.reduce((a, b) => a + (Number(b) || 0), 0);
      return `
                  <tr>
                    <td style=\"padding:8px;color:#333;\">${e.project || '-'}</td>
                    <td style=\"padding:8px;color:#333;\">${e.projectCode || '-'}</td>
                    <td style=\"padding:8px;color:#333;\">${e.task || '-'}</td>
                    <td style=\"padding:8px;color:#333;\">${e.type || '-'}</td>
                    ${dayNames.map((_, i) => `<td style=\"text-align:right;padding:8px;color:#333;\">${toHHMM(hrs[i] || 0)}</td>`).join("")}
                    <td style=\"text-align:right;padding:8px;color:#333;font-weight:bold;\">${toHHMM(rowTotal)}</td>
                  </tr>
                `;
    }).join("")}
              <tr>
                <td colspan="${4 + dayNames.length}" style="padding:8px;color:#333;font-weight:bold;border-top:1px solid #eee;text-align:right;">Work Hours Total</td>
                <td style="text-align:right;padding:8px;color:#333;font-weight:bold;border-top:1px solid #eee;">${toHHMM(workWeeklyTotal)}</td>
              </tr>
              <tr>
                <td colspan="${4 + dayNames.length}" style="padding:8px;color:#333;border-top:1px solid #eee;text-align:right;">Break Hours Total</td>
                <td style="text-align:right;padding:8px;color:#333;border-top:1px solid #eee;">${toHHMM(breakWeekly)}</td>
              </tr>
              <tr>
                <td colspan="${4 + dayNames.length}" style="padding:8px;color:#333;font-weight:bold;border-top:1px solid #eee;text-align:right;">Total (Work + Break)</td>
                <td style="text-align:right;padding:8px;color:#333;font-weight:bold;border-top:1px solid #eee;">${toHHMM(totalWithBreak)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <p style="color:#666;font-size:14px;margin-top:20px;">
          <strong>Note:</strong> You will be notified once your timesheet is reviewed and approved by the admin.
        </p>
        
        <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e0e0e0;color:#999;font-size:12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© ${new Date().getFullYear()} Caldim Engineering. All rights reserved.</p>
        </div>
      </div>
    `;

    // Verify mailer configuration
    console.log("📧 Mailer configuration check:", {
      host: mailer.options.host,
      port: mailer.options.port,
      secure: mailer.options.secure,
      authUserSet: !!mailer.options.auth?.user
    });

    const mailOptions = {
      from: `"Timesheet System" <${from}>`,
      to: targetEmail,
      subject: subject,
      html: html,
      text: `Timesheet Submitted - ${weekStr}\n\nPeriod: ${start} to ${end}\nWork Hours: ${toHHMM(workWeeklyTotal)}\nBreak Hours: ${toHHMM(breakWeekly)}\nTotal (Work + Break): ${toHHMM(totalWithBreak)}\nStatus: ${sheet.status}\nOn-Prem Weekly: ${toHHMM(onPrem.weekly || 0)}\n\nSubmitted on: ${new Date().toLocaleString()}`
    };

    console.log("📤 Sending email to:", targetEmail);
    const info = await mailer.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      to: targetEmail,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };

  } catch (err) {
    console.error("❌ Timesheet email send failed:");
    console.error("Error message:", err?.message || err);

    // Log specific error details
    if (err.code === 'EAUTH') {
      console.error("❌ Authentication failed. Check EMAIL_USER and EMAIL_PASS in .env");
    } else if (err.code === 'ECONNECTION') {
      console.error("❌ Connection failed. Check EMAIL_HOST and EMAIL_PORT in .env");
    } else if (err.code === 'ENOTFOUND') {
      console.error("❌ Host not found. Check EMAIL_HOST in .env");
    }

    return {
      success: false,
      error: err?.message || String(err),
      code: err?.code
    };
  }
}

// Compute and send monthly Permission usage email
async function sendPermissionUsageEmail(user, sheet) {
  try {
    // Only proceed if the submitted sheet contains any Permission entries
    const entries = Array.isArray(sheet.entries) ? sheet.entries : [];
    const hasPermission = entries.some((e) => (e.type || 'project') === 'leave' && (e.task || '').toLowerCase().includes('permission'));
    if (!hasPermission) {
      return { success: false, skipped: true, reason: 'No permission entries in sheet' };
    }

    const permissionCountForHours = (h) => {
      const val = Number(h) || 0;
      if (val >= 2) return 2;
      if (val >= 1) return 1;
      return 0;
    };

    const countPermissionsInEntries = (entriesList) => {
      let count = 0;
      (entriesList || []).forEach((e) => {
        const isPermission = (e.type || 'project') === 'leave' && (e.task || '').toLowerCase().includes('permission');
        if (!isPermission) return;
        const hrs = Array.isArray(e.hours) ? e.hours : [];
        for (let i = 0; i < 7; i++) {
          count += permissionCountForHours(hrs[i] || 0);
        }
      });
      return count;
    };

    const getMonthRange = (d) => {
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      return { start, end };
    };

    const sheetDate = new Date(sheet.weekStartDate || Date.now());
    const { start, end } = getMonthRange(new Date(Date.UTC(sheetDate.getFullYear(), sheetDate.getMonth(), sheetDate.getDate())));

    const monthlySheets = await Timesheet.find({
      userId: sheet.userId,
      weekStartDate: { $gte: start, $lte: end }
    }).lean();

    const usedCount = monthlySheets.reduce((sum, s) => sum + countPermissionsInEntries(s.entries || []), 0);
    const maxMonthly = 3;
    const balance = Math.max(0, maxMonthly - usedCount);

    let targetEmail = user.email || '';
    if (!targetEmail && user.employeeId) {
      const emp = await Employee.findOne({ employeeId: user.employeeId }).select('email');
      targetEmail = emp?.email || '';
    }
    if (!targetEmail) {
      return { success: false, error: 'No target email' };
    }

    const monthName = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const from = 'support@caldimengg.in';
    const subject = `Permission Usage Update - ${monthName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;padding:20px;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#333;margin:0 0 16px 0;padding-bottom:8px;border-bottom:2px solid #4F46E5;">Permission Usage</h2>
        <p style="color:#666;margin:0 0 12px 0;">This is an update for your monthly Permission balance.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#666;"><strong>Month:</strong></td>
            <td style="padding:6px 0;color:#333;">${monthName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;"><strong>Used:</strong></td>
            <td style="padding:6px 0;color:#333;font-weight:bold;">${usedCount} permission${usedCount === 1 ? '' : 's'}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;"><strong>Balance:</strong></td>
            <td style="padding:6px 0;color:#333;">${balance} permission${balance === 1 ? '' : 's'} remaining</td>
          </tr>
        </table>
        <p style="color:#999;font-size:12px;margin-top:16px;">Note: Each Permission entry counts as 1 usage towards your monthly limit. Monthly maximum is ${maxMonthly}.</p>
      </div>
    `;

    const info = await mailer.sendMail({ from, to: targetEmail, subject, html });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Permission usage email failed:', err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}

// Create/Update admin timesheet record
async function upsertAdminTimesheetRecord(user, sheet) {
  try {
    const weekStr = toWeekString(new Date(sheet.weekStartDate));
    const toHHMM = (n) => {
      const totalMin = Math.round(Number(n || 0) * 60);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    let employeeProfile = null;

    // Find employee profile
    if (user.employeeId) {
      employeeProfile = await Employee.findOne({ employeeId: user.employeeId }).lean();
    }
    if (!employeeProfile && user.email) {
      employeeProfile = await Employee.findOne({ email: user.email }).lean();
    }
    if (!employeeProfile && user._id) {
      employeeProfile = await Employee.findOne({ userId: user._id }).lean();
    }

    const timeEntries = (sheet.entries || []).map((e) => {
      const hours = e.hours || [0, 0, 0, 0, 0, 0, 0];
      const total = hours.reduce((a, b) => a + (Number(b) || 0), 0);
      return {
        project: e.project,
        task: e.task,
        monday: Number(hours[0] || 0),
        tuesday: Number(hours[1] || 0),
        wednesday: Number(hours[2] || 0),
        thursday: Number(hours[3] || 0),
        friday: Number(hours[4] || 0),
        saturday: Number(hours[5] || 0),
        sunday: Number(hours[6] || 0),
        total: Number(total || 0),
      };
    });

    const weeklyTotal = timeEntries.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const submittedDate = new Date().toISOString().split("T")[0];

    const payload = {
      timesheetId: sheet._id,
      employeeId: employeeProfile?.employeeId || user.employeeId || "",
      employeeName: employeeProfile?.name || user.name || "",
      division: employeeProfile?.division || "",
      location: employeeProfile?.location || "",
      week: weekStr,
      status: "Pending",
      submittedDate,
      timeEntries,
      weeklyTotal: Number(weeklyTotal || 0),
    };

    const query = {
      employeeId: payload.employeeId,
      week: payload.week,
    };

    const existing = await AdminTimesheet.findOne(query);
    if (existing) {
      existing.employeeName = payload.employeeName;
      existing.division = payload.division;
      existing.location = payload.location;
      existing.submittedDate = payload.submittedDate;
      existing.timeEntries = payload.timeEntries;
      existing.weeklyTotal = payload.weeklyTotal;
      existing.status = "Pending";
      await existing.save();
      console.log("✅ Updated existing admin timesheet record");
    } else {
      await AdminTimesheet.create(payload);
      console.log("✅ Created new admin timesheet record");
    }
  } catch (error) {
    console.error("❌ Error in upsertAdminTimesheetRecord:", error.message);
    return false;
  }
}

/**
 * CREATE / UPDATE Timesheet
 */
router.post("/", auth, async (req, res) => {
  try {
    const { weekStartDate, weekEndDate, entries, totalHours, status, shiftType, dailyShiftTypes, onPremisesTime } = req.body;
    const userId = req.user._id;
    const employeeId = req.user.employeeId;
    const employeeName = req.user.name;

    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekEndDate);

    const permissionCountForHours = (h) => {
      const val = Number(h) || 0;
      if (val >= 2) return 2;
      if (val >= 1) return 1;
      return 0;
    };

    const countPermissionsInEntriesForMonth = (entriesList, sheetWeekStart, targetMonth, targetYear) => {
      let count = 0;
      (entriesList || []).forEach((e) => {
        const isPermission = (e.type || "project") === "leave" && (e.task || "").toLowerCase().includes("permission");
        if (!isPermission) return;
        const hrs = Array.isArray(e.hours) ? e.hours : [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(sheetWeekStart);
          d.setDate(d.getDate() + i);
          if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
            count += permissionCountForHours(hrs[i] || 0);
          }
        }
      });
      return count;
    };

    let sheet = await Timesheet.findOne({
      userId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
    });

    const targetMonth = weekStart.getMonth();
    const targetYear = weekStart.getFullYear();
    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const overlappingSheets = await Timesheet.find({
      userId,
      weekEndDate: { $gte: monthStart },
      weekStartDate: { $lte: monthEnd }
    }).lean();

    const baseCount = overlappingSheets
      .filter((s) => !(sheet && String(s._id) === String(sheet._id)))
      .reduce((sum, s) => sum + countPermissionsInEntriesForMonth(s.entries || [], s.weekStartDate, targetMonth, targetYear), 0);

    const currentCount = countPermissionsInEntriesForMonth(entries || [], weekStart, targetMonth, targetYear);

    if (status === "Submitted" && (baseCount + currentCount) > 3) {
      return res.status(400).json({
        success: false,
        message: "Monthly permission limit (3 counts) exceeded",
      });
    }
    

    const entriesArray = Array.isArray(entries) ? entries : [];
    const dayIndices = [0, 1, 2, 3, 4, 5, 6];
    const workDaily = dayIndices.map((i) => {
      return entriesArray.reduce((sum, e) => {
        const hrs = Array.isArray(e.hours) ? e.hours : [];
        return sum + (Number(hrs[i]) || 0);
      }, 0);
    });
    const computeBreakForDay = (dayIndex) => {
      const hasProjectWork = entriesArray.some(
        (e) => (e.type || "project") === "project" && ((e.hours?.[dayIndex] || 0) > 0)
      );
      const hasApprovedLeaveOrHoliday = entriesArray.some((e) => {
        const val = Number(e.hours?.[dayIndex] || 0);
        const t = (e.task || "").toLowerCase();
        return ((t.includes('leave approved') || t.includes('holiday')) && val > 0);
      });
      return hasProjectWork && !hasApprovedLeaveOrHoliday ? 1.25 : 0;
    };
    const breakDaily = dayIndices.map((i) => computeBreakForDay(i));
    const breakWeekly = breakDaily.reduce((s, v) => s + v, 0);
    const workWeeklyTotal = workDaily.reduce((s, v) => s + v, 0);
    const totalWithBreakWeekly = workWeeklyTotal + breakWeekly;


    if (sheet) {
      // Update existing timesheet
      sheet.entries = entries;
      if (!sheet.employeeId && employeeId) sheet.employeeId = employeeId;
      if (!sheet.employeeName && employeeName) sheet.employeeName = employeeName;
      sheet.totalHours = totalHours;
      sheet.status = status || "Draft";
      sheet.rejectionReason = ""; // Clear rejection reason on update
      if (typeof shiftType !== "undefined") sheet.shiftType = shiftType || "";
      if (Array.isArray(dailyShiftTypes)) sheet.dailyShiftTypes = dailyShiftTypes;
      if (onPremisesTime && Array.isArray(onPremisesTime.daily)) {
        sheet.onPremisesTime = {
          daily: onPremisesTime.daily.map((n) => Number(n) || 0),
          weekly: Number(onPremisesTime.weekly) || 0
        };
      }

      if (status === "Submitted") {
        sheet.submittedAt = new Date();
      }

      await sheet.save();

      let emailSent = false;
      if (status === "Submitted") {
        await upsertAdminTimesheetRecord(req.user, sheet);
        const emailResult = await sendTimesheetSubmittedEmail(req.user, sheet);
        await sendTimesheetApprovalRequestEmail(req.user, sheet);
        sendPermissionUsageEmail(req.user, sheet).catch(() => {});
        emailSent = !!(emailResult && emailResult.success);
        if (emailSent) {
          console.log("✅ Email sent successfully for submitted timesheet");
        } else {
          console.log("⚠️ Timesheet submitted but email may not have been sent:", emailResult?.error);
        }
      }

      return res.json({
        success: true,
        message: "Timesheet updated successfully",
        sheet,
        emailSent
      });
    }

    // Create brand new timesheet
    sheet = await Timesheet.create({
      userId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      entries,
      totalHours,
      employeeId,
      employeeName,
      status: status || "Draft",
      submittedAt: status === "Submitted" ? new Date() : null,
      shiftType: shiftType || "",
      dailyShiftTypes: Array.isArray(dailyShiftTypes) ? dailyShiftTypes : [],
      onPremisesTime: onPremisesTime && Array.isArray(onPremisesTime.daily)
        ? {
          daily: onPremisesTime.daily.map((n) => Number(n) || 0),
          weekly: Number(onPremisesTime.weekly) || 0
        }
        : { daily: [], weekly: 0 },
    });

    let emailSent = false;
    if (status === "Submitted") {
      await upsertAdminTimesheetRecord(req.user, sheet);
      const emailResult = await sendTimesheetSubmittedEmail(req.user, sheet);
      await sendTimesheetApprovalRequestEmail(req.user, sheet);
      sendPermissionUsageEmail(req.user, sheet).catch(() => {});
      emailSent = !!(emailResult && emailResult.success);
      if (emailSent) {
        console.log("✅ Email sent successfully for new timesheet");
      } else {
        console.log("⚠️ Timesheet submitted but email may not have been sent:", emailResult?.error);
      }
    }

    res.json({
      success: true,
      message: "Timesheet created successfully",
      sheet,
      emailSent
    });
  } catch (error) {
    console.error("❌ Timesheet error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// Test email sending to the current user
router.get("/test-email", auth, async (req, res) => {
  try {
    console.log("🧪 Testing email configuration...");

    // Verify environment variables
    const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
      return res.status(500).json({
        success: false,
        message: "Missing email configuration",
        missing: missingEnvVars
      });
    }

    console.log("📧 Environment variables check:", {
      EMAIL_HOST: process.env.EMAIL_HOST ? "Set ✓" : "Not set",
      EMAIL_PORT: process.env.EMAIL_PORT || "465 (default)",
      EMAIL_USER: process.env.EMAIL_USER ? "Set ✓" : "Not set",
      EMAIL_PASS: process.env.EMAIL_PASS ? "Set ✓" : "Not set"
    });

    // Create a dummy timesheet for testing
    const dummySheet = {
      weekStartDate: new Date(),
      weekEndDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      totalHours: 40.5,
      status: "Submitted"
    };

    console.log("👤 Current user info:", {
      _id: req.user._id,
      email: req.user.email,
      employeeId: req.user.employeeId,
      name: req.user.name
    });

    // Test email sending
    const result = await sendTimesheetSubmittedEmail(req.user, dummySheet);

    if (result?.success) {
      const response = {
        success: true,
        message: "Test email dispatched successfully",
        details: {
          sentTo: result.to,
          messageId: result.messageId
        }
      };

      if (result.previewUrl) {
        console.log("🔗 Preview email at:", result.previewUrl);
        response.details.previewUrl = result.previewUrl;
      }

      res.json(response);
    } else {
      res.status(500).json({
        success: false,
        message: "Email sending failed",
        error: result?.error || "Unknown error",
        code: result?.code
      });
    }
  } catch (err) {
    console.error("❌ Test email failed:", err?.message || err);

    res.status(500).json({
      success: false,
      message: "Test email failed",
      error: err?.message || String(err),
      code: err?.code,
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
});

/**
 * Get monthly permission usage
 * Query params: month (0-11), year (YYYY), excludeWeekStart (ISO date string)
 */
router.get("/permissions/usage", auth, async (req, res) => {
  try {
    const { month, year, excludeWeekStart } = req.query;

    if (month === undefined || year === undefined) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required"
      });
    }

    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);

    // Calculate start and end of the target month
    // Note: Month is 0-indexed in JS Date
    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1));
    const endOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));

    // Find all timesheets for the user that overlap with the target month
    const sheets = await Timesheet.find({
      userId: req.user._id,
      weekStartDate: { $lte: endOfMonth },
      weekEndDate: { $gte: startOfMonth }
    });

    let totalCount = 0;
    const excludeDate = excludeWeekStart ? new Date(excludeWeekStart).toISOString().split('T')[0] : null;

    sheets.forEach(sheet => {
      // Exclude the current week if specified
      if (excludeDate) {
        const sheetDate = new Date(sheet.weekStartDate).toISOString().split('T')[0];
        if (sheetDate === excludeDate) return;
      }

      const sheetStart = new Date(sheet.weekStartDate);

      (sheet.entries || []).forEach(entry => {
        if (entry.task === "Permission") {
          (entry.hours || []).forEach((hours, dayIndex) => {
            if (hours > 0) {
              const entryDate = new Date(sheetStart);
              entryDate.setDate(entryDate.getDate() + dayIndex);

              // Check if this specific entry falls within the target month
              if (entryDate.getMonth() === targetMonth && entryDate.getFullYear() === targetYear) {
                // Permission Count Calculation:
              // 1 hour = 1 count, 2 hours = 2 counts
              const val = Number(hours) || 0;
              totalCount += (val >= 2 ? 2 : (val >= 1 ? 1 : 0));
              }
            }
          });
        }
      });
    });

    res.json({
      success: true,
      count: totalCount
    });

  } catch (error) {
    console.error("❌ Error calculating permission usage:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/**
 * Get logged-in user's all timesheets
 */
router.get("/my-timesheets", auth, async (req, res) => {
  try {
    const sheets = await Timesheet.find({ userId: req.user._id })
      .sort({ weekStartDate: -1 })
      .select("-__v");

    // Sync status from AdminTimesheet records to ensure reflection in history
    const userDoc = await User.findById(req.user._id).select("employeeId name email");
    const employeeId = userDoc?.employeeId || req.user.employeeId || "";

    const enriched = await Promise.all(sheets.map(async (sheet) => {
      const weekStr = toWeekString(new Date(sheet.weekStartDate));

      // Prefer direct link by timesheetId
      let adminDoc = await AdminTimesheet.findOne({ timesheetId: sheet._id }).select("status");
      if (!adminDoc) {
        // Fallback by employeeId + week
        if (employeeId) {
          adminDoc = await AdminTimesheet.findOne({ employeeId, week: weekStr }).select("status");
        }
      }
      if (!adminDoc && userDoc?.name) {
        // Final fallback by employeeName + week
        adminDoc = await AdminTimesheet.findOne({ employeeName: userDoc.name, week: weekStr }).select("status");
      }

      if (adminDoc) {
        const s = (adminDoc.status || "").toLowerCase();
        const currentStatus = (sheet.status || "").toLowerCase();
        if (s === "approved") {
          sheet.status = "Approved";
        } else if (s === "rejected") {
          // Keep Draft status for employee view if sheet is already Draft
          sheet.status = currentStatus === "draft" ? "Draft" : "Rejected";
        } else if (s === "pending") {
          sheet.status = "Submitted";
        }
      }
      else {
        // Heuristic fallback: match by week + projects + total
        const candidates = await AdminTimesheet.find({ week: weekStr }).select("status weeklyTotal timeEntries");
        const sheetProjects = Array.from(new Set((sheet.entries || [])
          .filter(e => (e.type || 'project') === 'project')
          .map(e => (e.project || '').trim()))).sort();
        const sheetTotal = Number(sheet.totalHours || 0);
        const approxEqual = (a, b) => Math.abs(Number(a || 0) - Number(b || 0)) < 0.01;
        let matched = null;
        for (const cand of candidates) {
          const candProjects = Array.from(new Set((cand.timeEntries || []).map(te => (te.project || '').trim()))).sort();
          const projectsMatch = candProjects.length === sheetProjects.length && candProjects.every((p, i) => p === sheetProjects[i]);
          if (projectsMatch && approxEqual(cand.weeklyTotal, sheetTotal)) {
            matched = cand;
            break;
          }
        }
        if (matched) {
          const s = (matched.status || "").toLowerCase();
          const currentStatus = (sheet.status || "").toLowerCase();
          let newStatus = null;
          if (s === "approved") newStatus = "Approved";
          else if (s === "rejected") {
            // Preserve Draft status for employee if sheet is already Draft
            newStatus = currentStatus === "draft" ? "Draft" : "Rejected";
          }
          else if (s === "pending") newStatus = "Submitted";
          if (newStatus) {
            sheet.status = newStatus;
            try {
              const update = { status: newStatus };
              if (newStatus === "Approved") update.approvedAt = new Date();
              await Timesheet.updateOne({ _id: sheet._id }, { $set: update });
            } catch (_) {}
          }
          // Try to permanently link the admin record to this timesheet
          try { await AdminTimesheet.updateOne({ _id: matched._id }, { $set: { timesheetId: sheet._id } }); } catch (_) {}
        }
      }
      return sheet;
    }));

    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    console.error("❌ Error fetching user timesheets:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/**
 * Get specific week's timesheet
 */
router.get("/", auth, async (req, res) => {
  try {
    const { weekStart, weekEnd } = req.query;

    if (!weekStart || !weekEnd) {
      return res.status(400).json({
        success: false,
        message: "weekStart and weekEnd query parameters are required"
      });
    }

    const sheet = await Timesheet.findOne({
      userId: req.user._id,
      weekStartDate: new Date(weekStart),
      weekEndDate: new Date(weekEnd),
    });

    if (!sheet) {
      // Return empty template if no timesheet exists
      return res.json({
        success: true,
        data: {
          userId: req.user._id,
          weekStartDate: new Date(weekStart),
          weekEndDate: new Date(weekEnd),
          entries: [],
          totalHours: 0,
          status: "Draft",
          submittedAt: null,
          shiftType: "",
          dailyShiftTypes: [],
          onPremisesTime: { daily: [], weekly: 0 }
        }
      });
    }

    res.json({
      success: true,
      data: sheet
    });
  } catch (error) {
    console.error("❌ Error fetching timesheet:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/**
 * ADMIN - Get all timesheets
 */
router.get("/all", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const all = await Timesheet.find()
      .populate("userId", "name email role employeeId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: all
    });
  } catch (error) {
    console.error("❌ Error fetching all timesheets:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/**
 * DELETE Timesheet by ID
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find the timesheet and ensure it belongs to the user
    const timesheet = await Timesheet.findOne({ _id: id, userId });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet not found or access denied"
      });
    }

    // Only allow deletion of draft timesheets
    if (timesheet.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft timesheets can be deleted"
      });
    }

    // const hasApprovedLeave = (timesheet.entries || []).some(
    //   (e) => (e.project || "") === "Leave" && (e.task || "") === "Leave Approved"
    // );
    // if (hasApprovedLeave) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Leave-approved draft timesheets cannot be deleted"
    //   });
    // }

    await Timesheet.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Timesheet deleted successfully"
    });
  } catch (error) {
    console.error("❌ Delete timesheet error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting timesheet"
    });
  }
});

module.exports = router;
