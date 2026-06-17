const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Log = require('../models/Log');
const Request = require('../models/Request');
const Notification = require('../models/Notification');
const AdvisorCommunication = require('../models/AdvisorCommunication');
const AdvisorRecord = require('../models/AdvisorRecord');

async function clean() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in .env");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Connected successfully.");

    // Counts before deletion
    const studentCount = await User.countDocuments({ role: 'Student' });
    const adminCount = await User.countDocuments({ role: 'Admin' });
    const otherUserCount = await User.countDocuments({ role: { $nin: ['Student', 'Admin'] } });
    const attendanceCount = await Attendance.countDocuments();
    const sessionCount = await Session.countDocuments();
    const logCount = await Log.countDocuments();
    const requestCount = await Request.countDocuments();
    const notificationCount = await Notification.countDocuments();
    const advCommCount = await AdvisorCommunication.countDocuments();
    const advRecCount = await AdvisorRecord.countDocuments();

    console.log("\n--- Current Database Counts ---");
    console.log(`Students: ${studentCount}`);
    console.log(`Admins: ${adminCount}`);
    console.log(`Other Users (Faculty, HoD, etc.): ${otherUserCount}`);
    console.log(`Attendance Records: ${attendanceCount}`);
    console.log(`Sessions: ${sessionCount}`);
    console.log(`Logs: ${logCount}`);
    console.log(`Requests: ${requestCount}`);
    console.log(`Notifications: ${notificationCount}`);
    console.log(`Advisor Communications: ${advCommCount}`);
    console.log(`Advisor Records: ${advRecCount}`);

    console.log("\nStarting Clean Up...");

    // 1. Delete all Attendance
    const deleteAttendance = await Attendance.deleteMany({});
    console.log(`🗑️ Deleted ${deleteAttendance.deletedCount} Attendance records.`);

    // 2. Delete all Sessions
    const deleteSessions = await Session.deleteMany({});
    console.log(`🗑️ Deleted ${deleteSessions.deletedCount} Sessions.`);

    // 3. Delete all Logs
    const deleteLogs = await Log.deleteMany({});
    console.log(`🗑️ Deleted ${deleteLogs.deletedCount} Logs.`);

    // 4. Delete all Requests
    const deleteRequests = await Request.deleteMany({});
    console.log(`🗑️ Deleted ${deleteRequests.deletedCount} Requests.`);

    // 5. Delete all Notifications
    const deleteNotifications = await Notification.deleteMany({});
    console.log(`🗑️ Deleted ${deleteNotifications.deletedCount} Notifications.`);

    // 6. Delete Advisor records & communications
    const deleteAdvComm = await AdvisorCommunication.deleteMany({});
    console.log(`🗑️ Deleted ${deleteAdvComm.deletedCount} Advisor Communications.`);
    const deleteAdvRec = await AdvisorRecord.deleteMany({});
    console.log(`🗑️ Deleted ${deleteAdvRec.deletedCount} Advisor Records.`);

    // 7. Delete all Faculty/Staff Users (keeping Students and Admins)
    const deleteUsers = await User.deleteMany({ role: { $nin: ['Student', 'Admin'] } });
    console.log(`🗑️ Deleted ${deleteUsers.deletedCount} non-student/non-admin users (Faculty, HoD, Principal, etc.).`);

    console.log("\n✅ Database clean up completed successfully!");
  } catch (error) {
    console.error("❌ Error performing clean up:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

clean();
