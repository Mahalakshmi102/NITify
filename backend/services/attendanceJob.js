const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const Timetable = require('../models/Timetable');
const AcademicCalendar = require('../models/AcademicCalendar');
const Session = require('../models/Session');

// Helper to get current day name
const getCurrentDay = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

// Helper to check if today is a working day
const isWorkingDay = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const event = await AcademicCalendar.findOne({ 
    date: { 
      $gte: today, 
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
    } 
  });

  if (event && event.type === 'Holiday') return false;
  return true;
};

// Run every minute to check if a class is starting
// "0 * * * * *" runs at second 0 of every minute
cron.schedule('* * * * *', async () => {
  // Timetable-driven hourly session creation is disabled in the day-wise attendance system
  return;
});
