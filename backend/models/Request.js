const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetModel: { type: String, enum: ['Attendance', 'Mark', 'Leave', 'PasswordReset'], required: true },
  targetRecord: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: function() { return !['Leave', 'PasswordReset'].includes(this.targetModel); } 
  },
  reason: { type: String, required: true, maxlength: 500 },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  approvalStage: {
    type: String,
    enum: ['ClassAdvisor', 'HOD', 'Principal', 'Completed'],
    default: function() { return this.targetModel === 'Leave' ? 'ClassAdvisor' : 'Completed'; }
  },
  approvalHistory: [{
    stage: String,
    action: { type: String, enum: ['Approved', 'Rejected'] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: String,
    date: { type: Date, default: Date.now }
  }],
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewRemarks: { type: String, maxlength: 300 }
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
