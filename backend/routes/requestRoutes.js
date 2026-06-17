const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Allow Students, Faculty and HoD to submit correction/leave requests
router.post('/', authorize('Student', 'Faculty', 'HoD', 'Admin'), requestController.submitRequest);

// Admin, Principal, CoE and HoD can view requests (filtered appropriately in controller). Faculty/Students can view their own.
router.get('/', authorize('Admin', 'Principal', 'CoE', 'HoD', 'Faculty', 'Student', 'Class Advisor'), requestController.getRequests);

router.put('/:requestId/review', authorize('Admin', 'Principal', 'CoE', 'HoD', 'Faculty', 'Class Advisor'), requestController.reviewRequest);

module.exports = router;
