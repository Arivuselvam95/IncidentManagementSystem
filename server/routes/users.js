import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Incident from '../models/Incident.js';
import auth from '../middleware/auth.js';
import RegistrationRequest from '../models/RegistrationRequest.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!['admin', 'team-lead'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find()
      .select('-password')
      .sort({ firstName: 1, lastName: 1 });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get team members for incident assignment
router.get('/team-members', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!['admin', 'team-lead', 'it-support'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get team members who can be assigned incidents
    const teamMembers = await User.find({
      role: { $in: ['it-support', 'team-lead', 'admin'] },
      isActive: true
    }).select('firstName lastName email role department expertise maxWorkload');

    // Get current workload for each team member
    const teamMembersWithWorkload = await Promise.all(
      teamMembers.map(async (member) => {
        const currentWorkload = await Incident.countDocuments({
          'assignee.user': member._id,
          status: { $in: ['assigned', 'in-progress'] }
        });

        return {
          id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          role: member.role,
          department: member.department,
          expertise: member.expertise || [],
          currentWorkload,
          maxWorkload: member.maxWorkload || 10
        };
      })
    );

    res.json(teamMembersWithWorkload);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: 'Error fetching team members' });
  }
});

// Get registration requests
router.get('/registration-requests', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!['admin', 'team-lead'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const requests = await RegistrationRequest.find({ status: 'pending' })
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching registration requests:', error);
    res.status(500).json({ message: 'Error fetching registration requests' });
  }
});

// Approve registration request
router.put('/registration-requests/:id/approve', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!['admin', 'team-lead'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const request = await RegistrationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Registration request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed' });
    }

    // Check if team lead is trying to approve admin/team-lead role
    if (currentUser.role === 'team-lead' && ['admin', 'team-lead'].includes(request.role)) {
      return res.status(403).json({ message: 'Team leads can only approve IT Support registrations' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: request.email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user from registration request
    const user = new User({
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      password: request.password, // Already hashed
      role: request.role,
      department: request.department,
      googleId: request.googleId, // If from Google OAuth
      isActive: true
    });

    await user.save();

    // Update registration request status
    request.status = 'approved';
    request.processedAt = new Date();
    request.processedBy = req.userId;
    await request.save();

    res.json({
      message: 'Registration request approved successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error approving registration request:', error);
    res.status(500).json({ message: 'Error approving registration request' });
  }
});

// Reject registration request
router.put('/registration-requests/:id/reject', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!['admin', 'team-lead'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { rejectionReason } = req.body;

    const request = await RegistrationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Registration request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed' });
    }

    // Update registration request status
    request.status = 'rejected';
    request.processedAt = new Date();
    request.processedBy = req.userId;
    request.rejectionReason = rejectionReason;
    await request.save();

    res.json({
      message: 'Registration request rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting registration request:', error);
    res.status(500).json({ message: 'Error rejecting registration request' });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    
    // Users can view their own profile, admins and team leads can view any profile
    if (req.params.id !== req.userId && !['admin', 'team-lead'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user statistics
    const [
      reportedIncidents,
      assignedIncidents,
      resolvedIncidents,
      avgResolutionTime
    ] = await Promise.all([
      Incident.countDocuments({ 'reporter.user': user._id }),
      Incident.countDocuments({ 
        'assignee.user': user._id,
        status: { $in: ['assigned', 'in-progress'] }
      }),
      Incident.countDocuments({ 
        'resolution.resolvedBy': user._id,
        status: 'resolved'
      }),
      Incident.aggregate([
        {
          $match: {
            'resolution.resolvedBy': user._id,
            'resolution.timeSpent': { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$resolution.timeSpent' }
          }
        }
      ])
    ]);

    const userWithStats = {
      ...user.toJSON(),
      statistics: {
        reportedIncidents,
        assignedIncidents,
        resolvedIncidents,
        avgResolutionTime: avgResolutionTime[0]?.avgTime || 0
      }
    };

    res.json(userWithStats);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update user (admin only, or user updating their own profile)
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Updating user:', req.params.id, 'by', req.userId);
    const currentUser = await User.findById(req.userId);
    
    // Users can update their own profile, admins can update any profile
    if (req.params.id !== req.userId && (currentUser.role !== 'admin' && currentUser.role !== 'team-lead')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Define which fields can be updated
    const allowedUpdates = ['firstName', 'lastName', 'phone', 'jobTitle', 'bio'];
    const adminOnlyUpdates = ['email', 'role', 'department', 'isActive', 'expertise', 'maxWorkload'];

    // Regular users can only update basic profile fields
    let updatableFields = [...allowedUpdates];

if (currentUser.role === 'admin') {
  updatableFields.push(...adminOnlyUpdates);
} else if (currentUser.role === 'team-lead') {
  updatableFields.push('isActive'); // Allow team-leads to update activation
}
    // Apply updates
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Check if email is being changed and if it's already taken
    if (req.body.email && req.body.email !== user.email) {
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Deactivate user (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deactivating the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot deactivate the last admin user' });
      }
    }

    // Deactivate instead of deleting
    user.isActive = false;
    await user.save();

    // Reassign any active incidents
    await Incident.updateMany(
      { 
        'assignee.user': user._id,
        status: { $in: ['assigned', 'in-progress'] }
      },
      { 
        $unset: { assignee: 1 },
        status: 'new'
      }
    );

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Error deactivating user' });
  }
});

// Get user performance metrics
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    
    // Users can view their own performance, admins and team leads can view any performance
    if (req.params.id !== req.userId && !['admin', 'team-lead'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userId = req.params.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get performance metrics
    const [
      currentMonthResolved,
      lastMonthResolved,
      avgResolutionTime,
      customerSatisfaction,
      incidentsByCategory
    ] = await Promise.all([
      Incident.countDocuments({
        'resolution.resolvedBy': userId,
        'resolution.resolvedAt': { $gte: startOfMonth }
      }),
      Incident.countDocuments({
        'resolution.resolvedBy': userId,
        'resolution.resolvedAt': { $gte: startOfLastMonth, $lt: startOfMonth }
      }),
      Incident.aggregate([
        {
          $match: {
            'resolution.resolvedBy': new mongoose.Types.ObjectId(userId),
            'resolution.resolvedAt': { $gte: startOfMonth },
            'resolution.timeSpent': { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$resolution.timeSpent' }
          }
        }
      ]),
      Incident.aggregate([
        {
          $match: {
            'resolution.resolvedBy': new mongoose.Types.ObjectId(userId),
            'resolution.resolvedAt': { $gte: startOfMonth },
            'resolution.satisfactionRating': { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$resolution.satisfactionRating' }
          }
        }
      ]),
      Incident.aggregate([
        {
          $match: {
            'resolution.resolvedBy': new mongoose.Types.ObjectId(userId),
            'resolution.resolvedAt': { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])
    ]);

    const performance = {
      currentMonthResolved,
      lastMonthResolved,
      monthlyTrend: lastMonthResolved > 0 
        ? Math.round(((currentMonthResolved - lastMonthResolved) / lastMonthResolved) * 100)
        : 0,
      avgResolutionTime: avgResolutionTime[0]?.avgTime || 0,
      customerSatisfaction: customerSatisfaction[0]?.avgRating || 0,
      incidentsByCategory
    };

    res.json(performance);
  } catch (error) {
    console.error('Error fetching user performance:', error);
    res.status(500).json({ message: 'Error fetching user performance' });
  }
});

export default router;