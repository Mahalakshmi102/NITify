const Request = require('../models/Request');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { createLog } = require('../utils/logger');

const notifyUsers = async (roleFilter, message, type = 'Info', link = '') => {
  try {
    const users = await User.find(roleFilter).select('_id');
    const notifications = users.map(u => ({
      user: u._id,
      message,
      type,
      link
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Error notifying users:', error);
  }
};

const notifyAdmins = async (message, type = 'Info', link = '') => {
  await notifyUsers({ role: 'Admin' }, message, type, link);
};

const applyLeaveToAttendance = async (request, reviewerId) => {
  const studentId = request.requestedBy._id || request.requestedBy;
  const student = await User.findById(studentId);
  if (!student) return;

  const startDate = new Date(request.newValue.startDate);
  const endDate = new Date(request.newValue.endDate);
  const leaveType = request.newValue.leaveType || 'General';

  let attendanceStatus = 'On-Duty';
  if (leaveType === 'Medical Leave' || leaveType === 'ML') {
    attendanceStatus = 'Medical Leave';
  } else if (leaveType === 'Casual Leave' || leaveType === 'CL') {
    attendanceStatus = 'Casual Leave';
  }

  const Timetable = require('../models/Timetable');
  const timetables = await Timetable.find({
    department: student.department,
    year: student.year,
    semester: student.semester,
    section: student.section
  });

  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const endLimitDate = new Date(endDate);
  endLimitDate.setHours(23, 59, 59, 999);

  const Session = require('../models/Session');
  const AcademicCalendar = require('../models/AcademicCalendar');

  while (currentDate <= endLimitDate) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const calendarEntry = await AcademicCalendar.findOne({
      date: { $gte: dayStart, $lte: dayEnd }
    });

    if (!calendarEntry || calendarEntry.type !== 'Holiday') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeekName = days[currentDate.getDay()];
      const slotsForToday = timetables.filter(t => t.dayOfWeek === dayOfWeekName);

      if (slotsForToday.length > 0) {
        let session = await Session.findOne({
          department: student.department,
          year: student.year,
          semester: student.semester,
          section: student.section,
          date: { $gte: dayStart, $lte: dayEnd }
        });

        if (!session) {
          const firstSlot = slotsForToday[0];
          session = new Session({
            timetable: firstSlot._id,
            subject: firstSlot.subject,
            faculty: firstSlot.faculty,
            date: dayStart,
            period: 'Day',
            locked: true,
            isActive: false,
            department: student.department,
            year: student.year,
            semester: student.semester,
            section: student.section
          });
          await session.save();
        }

        await Attendance.findOneAndUpdate(
          { session: session._id, student: studentId },
          {
            status: attendanceStatus,
            updatedBy: reviewerId,
            remarks: `Leave approved: ${leaveType}`,
            subject: session.subject,
            date: dayStart,
            faculty: session.faculty,
            department: student.department,
            year: student.year,
            semester: student.semester,
            section: student.section,
            entryType: 'Manual',
            markedBy: 'Admin',
            period: 'Day'
          },
          { upsert: true, new: true }
        );
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }
};

exports.submitRequest = async (req, res) => {
  try {
    const { targetModel, targetRecord, reason, newValue } = req.body;

    if (!['Attendance', 'Mark', 'Leave'].includes(targetModel)) {
      return res.status(400).json({ success: false, message: 'Invalid target model.' });
    }

    const reqUserId = req.user._id || req.user.id;

    // Fetch the record to get oldValue
    let record;
    let oldValue;
    let finalTargetRecord = targetModel === 'Leave' ? (targetRecord || reqUserId) : targetRecord;

    if (targetModel === 'Attendance') {
      const mongoose = require('mongoose');
      let isIdValid = mongoose.Types.ObjectId.isValid(finalTargetRecord);
      if (isIdValid) {
        record = await Attendance.findById(finalTargetRecord);
      }
      
      if (!record) {
        // Try looking up by studentId and sessionId
        const { studentId, sessionId } = req.body;
        if (studentId && sessionId) {
          record = await Attendance.findOne({ session: sessionId, student: studentId });
          if (!record) {
            const Session = require('../models/Session');
            const targetSession = await Session.findById(sessionId);
            if (targetSession) {
              const studentDetails = await User.findById(studentId).select('department year semester section').lean();
              record = new Attendance({
                session: sessionId,
                student: studentId,
                subject: targetSession.subject,
                date: targetSession.date,
                period: targetSession.period || 'H1',
                status: 'Absent',
                markedBy: 'Faculty',
                entryType: 'Manual',
                locked: true,
                faculty: targetSession.faculty,
                department: studentDetails?.department || targetSession.department,
                year: studentDetails?.year || targetSession.year,
                semester: studentDetails?.semester || targetSession.semester,
                section: studentDetails?.section || targetSession.section
              });
              await record.save();
            }
          }
          if (record) {
            finalTargetRecord = record._id;
          }
        }
      }

      if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found.' });
      oldValue = record.status;
    } else if (targetModel === 'Mark') {
      record = await Mark.findById(finalTargetRecord);
      if (!record) return res.status(404).json({ success: false, message: 'Mark record not found.' });
      oldValue = { internal: record.internal, external: record.external, total: record.total };
    } else if (targetModel === 'Leave') {
      oldValue = 'Pending';
    }

    const newRequest = await Request.create({
      requestedBy: reqUserId,
      targetModel,
      targetRecord: finalTargetRecord,
      reason,
      oldValue,
      newValue,
      approvalStage: targetModel === 'Leave' ? 'ClassAdvisor' : 'Completed',
    });

    if (targetModel === 'Leave') {
      const student = await User.findById(reqUserId);
      if (student) {
        const advisor = await User.findOne({
          $or: [
            { role: 'Class Advisor', 'classAdvisorDetails.isClassAdvisor': true },
            { role: 'Faculty', 'classAdvisorDetails.isClassAdvisor': true }
          ],
          'classAdvisorDetails.department': student.department,
          'classAdvisorDetails.year': student.year,
          'classAdvisorDetails.semester': student.semester,
          'classAdvisorDetails.section': student.section,
          isActive: true
        });
        if (advisor) {
          await Notification.create({
            user: advisor._id,
            message: `New leave request from ${student.name} (${student.rollNumber || student.registerNumber})`,
            type: 'Warning',
            link: '/advisor'
          });
        }
      }
    }

    await createLog('Submitted Correction Request', req.user, 'Request', newRequest._id, {
      oldValue,
      newValue,
      reason,
      targetDept: req.user.department || 'General',
      details: `Submitted correction request for ${targetModel}`
    });

    res.status(201).json({ success: true, message: 'Request submitted successfully.', request: newRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const query = {};
    
    if (['HoD', 'Faculty', 'Class Advisor'].includes(req.user.role)) {
      query.targetModel = { $ne: 'PasswordReset' };
    }

    if (req.user.role === 'Principal') {
      query.$or = [
        { targetModel: 'Leave', approvalStage: 'Principal', status: 'Pending' },
        { targetModel: 'Leave', approvalStage: 'Completed' },
        { targetModel: { $ne: 'Leave' } }
      ];
    } else if (req.user.role === 'HoD') {
      const deptStudents = await User.find({
        role: 'Student',
        department: req.user.department
      }).select('_id');
      const studentIds = deptStudents.map(s => s._id);

      const deptFaculty = await User.find({
        role: { $in: ['Faculty', 'Class Advisor'] },
        department: req.user.department
      }).select('_id');
      const facultyIds = deptFaculty.map(f => f._id);

      query.$or = [
        { targetModel: 'Leave', requestedBy: { $in: studentIds }, approvalStage: { $in: ['HOD', 'Principal', 'Completed'] } },
        { targetModel: 'Leave', requestedBy: { $in: studentIds }, status: { $ne: 'Pending' } },
        { targetModel: { $ne: 'Leave' }, requestedBy: { $in: [...studentIds, ...facultyIds] } }
      ];
    } else if (req.user.role === 'Faculty' || req.user.role === 'Class Advisor') {
      const isClassAdvisor = (req.user.classAdvisorDetails && req.user.classAdvisorDetails.isClassAdvisor) || req.user.role === 'Class Advisor';
      if (isClassAdvisor) {
        const adv = req.user.classAdvisorDetails;
        const advisedStudents = await User.find({
          role: 'Student',
          department: adv.department,
          year: adv.year,
          semester: adv.semester,
          section: adv.section
        }).select('_id');
        const advisedIds = advisedStudents.map(s => s._id);
        query.$or = [
          { requestedBy: req.user._id || req.user.id },
          { requestedBy: { $in: advisedIds }, targetModel: 'Leave' }
        ];
      } else {
        query.requestedBy = req.user._id || req.user.id;
      }
    } else if (req.user.role === 'Student') {
      query.requestedBy = req.user._id || req.user.id;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.approvalStage) {
      query.approvalStage = req.query.approvalStage;
    }
    if (req.query.rollNumber) {
      const student = await User.findOne({
        role: 'Student',
        $or: [
          { rollNumber: req.query.rollNumber },
          { registerNumber: req.query.rollNumber }
        ]
      });
      if (student) {
        query.requestedBy = student._id;
      }
    }

    const requests = await Request.find(query)
      .populate('requestedBy', 'name email role department year semester section registerNumber rollNumber')
      .populate('reviewedBy', 'name role')
      .populate('approvalHistory.reviewedBy', 'name role')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

exports.reviewRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, reviewRemarks } = req.body;
    const reviewerId = req.user._id || req.user.id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected.' });
    }

    const request = await Request.findById(requestId).populate('requestedBy');
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request is already processed.' });
    }

    const isLeave = request.targetModel === 'Leave';
    const userRole = req.user.role;

    if (isLeave) {
      if (userRole === 'Class Advisor' || (userRole === 'Faculty' && req.user.classAdvisorDetails?.isClassAdvisor)) {
        if (request.approvalStage !== 'ClassAdvisor') {
          return res.status(403).json({ success: false, message: 'This leave request is not at Class Advisor stage.' });
        }
        const adv = req.user.classAdvisorDetails;
        const student = request.requestedBy;
        const isAdvisedStudent =
          student.role === 'Student' &&
          student.department === adv.department &&
          String(student.year) === String(adv.year) &&
          String(student.semester) === String(adv.semester) &&
          student.section === adv.section;
        if (!isAdvisedStudent) {
          return res.status(403).json({ success: false, message: 'Access denied: You can only review requests for students in your advised class.' });
        }
      } else if (userRole === 'HoD') {
        if (request.approvalStage !== 'HOD') {
          return res.status(403).json({ success: false, message: 'This leave request is not at HOD stage.' });
        }
        if (request.requestedBy.department !== req.user.department) {
          return res.status(403).json({ success: false, message: 'Access denied: Request is outside your department.' });
        }
      } else if (userRole === 'Principal') {
        if (request.approvalStage !== 'Principal') {
          return res.status(403).json({ success: false, message: 'This leave request is not at Principal stage.' });
        }
      } else if (!['Admin', 'CoE'].includes(userRole)) {
        return res.status(403).json({ success: false, message: 'Not authorized to review leave requests.' });
      }
    } else {
      if (userRole === 'HoD' && request.requestedBy.department !== req.user.department) {
        return res.status(403).json({ success: false, message: 'Access denied: Request is outside your department.' });
      }
      if ((userRole === 'Faculty' || userRole === 'Class Advisor') && !req.user.classAdvisorDetails?.isClassAdvisor) {
        return res.status(403).json({ success: false, message: 'Access denied: Only Class Advisors are allowed to review requests.' });
      }
    }

    const historyEntry = {
      stage: request.approvalStage,
      action: status,
      reviewedBy: reviewerId,
      remarks: reviewRemarks || '',
      date: new Date()
    };
    request.approvalHistory = request.approvalHistory || [];
    request.approvalHistory.push(historyEntry);
    request.reviewedBy = reviewerId;
    request.reviewRemarks = reviewRemarks;

    if (status === 'Rejected') {
      request.status = 'Rejected';
      request.approvalStage = 'Completed';
    } else if (isLeave) {
      if (request.approvalStage === 'ClassAdvisor') {
        request.approvalStage = 'HOD';
        const student = request.requestedBy;
        await notifyUsers(
          { role: 'HoD', department: student.department, isActive: true },
          `Leave request from ${student.name} approved by Class Advisor — awaiting HOD review`,
          'Warning',
          '/hod'
        );
      } else if (request.approvalStage === 'HOD') {
        request.approvalStage = 'Principal';
        const student = request.requestedBy;
        await notifyUsers(
          { role: 'Principal', isActive: true },
          `Leave request from ${student.name} (${student.department}) approved by HOD — awaiting Principal review`,
          'Warning',
          '/principal'
        );
      } else if (request.approvalStage === 'Principal' || ['Admin', 'CoE'].includes(userRole)) {
        request.status = 'Approved';
        request.approvalStage = 'Completed';
        await applyLeaveToAttendance(request, reviewerId);
      }
    } else {
      request.status = 'Approved';
      request.approvalStage = 'Completed';

      if (request.targetModel === 'Attendance') {
        await Attendance.findByIdAndUpdate(request.targetRecord, { status: request.newValue, updatedBy: reviewerId, remarks: 'Updated via approved request' });
      } else if (request.targetModel === 'Mark') {
        const { internal, external } = request.newValue;
        const total = (Number(internal) || 0) + (Number(external) || 0);
        await Mark.findByIdAndUpdate(request.targetRecord, { internal, external, total, updatedBy: reviewerId, remarks: 'Updated via approved request' });
      } else if (request.targetModel === 'PasswordReset') {
        const studentId = request.requestedBy._id || request.requestedBy;
        const targetUser = await User.findById(studentId);
        if (targetUser) {
          const targetDob = targetUser.dob;
          if (!targetDob) {
            return res.status(400).json({ success: false, message: 'User does not have a Date of Birth set in their profile.' });
          }
          const d = new Date(targetDob);
          if (isNaN(d.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid Date of Birth format.' });
          }
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          const dobString = `${dd}${mm}${yyyy}`;

          const bcrypt = require('bcryptjs');
          const salt = await bcrypt.genSalt(10);
          targetUser.password = await bcrypt.hash(dobString, salt);
          targetUser.isFirstLogin = true;
          await targetUser.save();
        }
      }
    }

    await request.save();

    await createLog(`Request ${status}`, req.user, 'Request', request._id, {
      oldValue: request.oldValue,
      newValue: request.newValue,
      reason: reviewRemarks || `Correction request reviewed by ${req.user.role}`,
      targetDept: req.user.department || 'General',
      details: `Processed correction request: ${request.targetModel} update was ${status.toLowerCase()}`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) reviewed ${request.targetModel} request: ${status}`, 'Info');
    }

    const stageMessages = {
      ClassAdvisor: 'Forwarded to HOD for review.',
      HOD: 'Forwarded to Principal for review.',
      Principal: 'Leave approved and applied to attendance.',
      Completed: `Request ${status.toLowerCase()} successfully.`
    };
    const message = isLeave && status === 'Approved' && request.status === 'Pending'
      ? stageMessages[request.approvalStage] || 'Approved at current stage.'
      : `Request ${status.toLowerCase()} successfully.`;

    res.status(200).json({ success: true, message, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};
