import express from 'express';
import multer from 'multer';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage (to handle files as buffers)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all incidents with filtering and pagination
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      category,
      assignee,
      reporter,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      unassigned
    } = req.query;

    // Build filter object
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (severity && severity !== 'all') {
      filter.severity = severity;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (assignee && assignee !== 'all') {
      if (assignee === 'me') {
        filter['assignee.user'] = req.userId;
      } else if (assignee === 'unassigned') {
        filter['assignee.user'] = { $exists: false };
      } else {
        filter['assignee.user'] = assignee;
      }
    }

    if (unassigned === 'true') {
      filter['assignee.user'] = { $exists: false };
    }

    if (reporter) {
      filter['reporter.user'] = reporter;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { incidentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination (exclude attachment data for list view)
    const incidents = await Incident.find(filter)
      .populate('reporter.user', 'firstName lastName email')
      .populate('assignee.user', 'firstName lastName email')
      .select('-attachments.data -comments.attachments.data') // Exclude binary data
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await Incident.countDocuments(filter);

    res.json({
      incidents,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ message: 'Error fetching incidents' });
  }
});

// Get incident by ID with full attachment data (including base64 images)
router.get('/:id', auth, async (req, res) => {
  try {
    const incident = await Incident.findOne({
      $or: [
        { _id: req.params.id },
        { incidentId: req.params.id }
      ]
    })
    .populate('reporter.user', 'firstName lastName email')
    .populate('assignee.user', 'firstName lastName email')
    .populate('comments.author', 'firstName lastName')
    .populate('workLogs.user', 'firstName lastName');

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Convert attachment binary data to base64 for easy display
    const incidentWithBase64Images = incident.toObject();
    
    if (incidentWithBase64Images.attachments) {
      incidentWithBase64Images.attachments = incidentWithBase64Images.attachments.map(attachment => ({
        ...attachment,
        data: undefined, // Remove binary data
        base64Data: attachment.data ? `data:${attachment.mimetype};base64,${attachment.data.toString('base64')}` : null
      }));
    }

    if (incidentWithBase64Images.comments) {
      incidentWithBase64Images.comments = incidentWithBase64Images.comments.map(comment => ({
        ...comment,
        attachments: comment.attachments ? comment.attachments.map(attachment => ({
          ...attachment,
          data: undefined, // Remove binary data
          base64Data: attachment.data ? `data:${attachment.mimetype};base64,${attachment.data.toString('base64')}` : null
        })) : []
      }));
    }

    // Update view count and last viewed
    incident.metrics.viewCount += 1;
    incident.metrics.lastViewedAt = new Date();
    await incident.save();

    res.json(incidentWithBase64Images);
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ message: 'Error fetching incident' });
  }
});

// Create new incident
router.post('/', auth, upload.array('attachments', 10), async (req, res) => {
  try {
    const {
      title,
      description,
      severity,
      category,
      urgency,
      impact,
      affectedServices,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior
    } = req.body;

    // Get reporter information
    const reporter = await User.findById(req.userId);
    if (!reporter) {
      return res.status(404).json({ message: 'Reporter not found' });
    }

    // Process attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          filename: `${Date.now()}_${file.originalname}`,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer,
          uploadedBy: req.userId
        });
      }
    }

    // Calculate SLA target based on severity
    const slaHours = {
      'critical': 1,
      'high': 4,
      'medium': 24,
      'low': 72
    };

    const slaTarget = new Date();
    slaTarget.setHours(slaTarget.getHours() + slaHours[severity]);

    // Create incident
    
    const count = await Incident.countDocuments();
    const incidentId = `INC-${String(count + 1).padStart(4, '0')}`;

    const incident = new Incident({
      incidentId,
      title,
      description,
      severity,
      category,
      urgency: urgency || 'medium',
      impact: impact || 'medium',
      affectedServices,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      reporter: {
        user: req.userId,
        name: `${reporter.firstName} ${reporter.lastName}`,
        email: reporter.email,
        phone: reporter.phone
      },
      attachments,
      sla: {
        target: slaTarget
      }
    });

    await incident.save();

    // Add initial work log
    incident.workLogs.push({
      action: 'Incident created',
      description: `Incident reported by ${reporter.firstName} ${reporter.lastName}`,
      user: req.userId,
      isSystemGenerated: true
    });

    await incident.save();

    // Return response without binary data
    const responseIncident = incident.toObject();
    responseIncident.attachments = responseIncident.attachments.map(att => ({
      _id: att._id,
      filename: att.filename,
      originalName: att.originalName,
      mimetype: att.mimetype,
      size: att.size,
      uploadedBy: att.uploadedBy,
      uploadedAt: att.uploadedAt
    }));

    res.status(201).json({
      message: 'Incident created successfully',
      incident: responseIncident,
      incidentId: incident.incidentId 
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ message: 'Error creating incident', error: error.message });
  }
});

// Update incident
router.put('/:id', auth, async (req, res) => {
  try {
    const incident = await Incident.findOne({
      $or: [
        { _id: req.params.id },
        { incidentId: req.params.id }
      ]
    });

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'severity', 'category', 'urgency', 'impact',
      'affectedServices', 'stepsToReproduce', 'expectedBehavior', 'actualBehavior',
      'status', 'workaround', 'tags', 'isHidden'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        incident[field] = req.body[field];
      }
    });

    await incident.save();

    res.json({
      message: 'Incident updated successfully',
      incident
    });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ message: 'Error updating incident' });
  }
});

// Assign incident
router.put('/:id/assign', auth, async (req, res) => {
  try {
    const { assigneeId, notes } = req.body;

    const incident = await Incident.findOne({
      $or: [
        { _id: req.params.id },
        { incidentId: req.params.id }
      ]
    });

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const assignee = await User.findById(assigneeId);
    if (!assignee) {
      return res.status(404).json({ message: 'Assignee not found' });
    }

    // Update assignment
    incident.assignee = {
      user: assigneeId,
      name: `${assignee.firstName} ${assignee.lastName}`,
      assignedAt: new Date(),
      assignedBy: req.userId
    };

    incident.status = 'assigned';

    // Add work log
    incident.workLogs.push({
      action: `Assigned to ${assignee.firstName} ${assignee.lastName}`,
      description: notes || '',
      user: req.userId,
      isSystemGenerated: false
    });

    await incident.save();

    res.json({
      message: 'Incident assigned successfully',
      incident
    });
  } catch (error) {
    console.error('Error assigning incident:', error);
    res.status(500).json({ message: 'Error assigning incident' });
  }
});

// Resolve incident
router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const {
      resolutionNotes,
      rootCause,
      preventiveMeasures,
      resolutionCategory,
      timeSpent,
      satisfactionRating
    } = req.body;

    const incident = await Incident.findOne({
      $or: [
        { _id: req.params.id },
        { incidentId: req.params.id }
      ]
    });

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Update resolution information
    incident.resolution = {
      notes: resolutionNotes,
      rootCause,
      preventiveMeasures,
      category: resolutionCategory,
      resolvedBy: req.userId,
      resolvedAt: new Date(),
      timeSpent: parseFloat(timeSpent) || 0,
      satisfactionRating: parseInt(satisfactionRating) || null
    };

    incident.status = 'resolved';

    // Add work log
    incident.workLogs.push({
      action: 'Incident resolved',
      description: resolutionNotes,
      user: req.userId,
      timeSpent: parseFloat(timeSpent) * 60 || 0, // Convert hours to minutes
      isSystemGenerated: false
    });

    await incident.save();

    res.json({
      message: 'Incident resolved successfully',
      incident
    });
  } catch (error) {
    console.error('Error resolving incident:', error);
    res.status(500).json({ message: 'Error resolving incident' });
  }
});

// Add comment to incident
router.post('/:id/comments', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { comment, isInternal = false } = req.body.comment;

    const incident = await Incident.findOne({
      $or: [
        { _id: req.params.id },
        { incidentId: req.params.id }
      ]
    });

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Process comment attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          filename: `${Date.now()}_${file.originalname}`,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer,
          uploadedBy: req.userId
        });
      }
    }

    incident.comments.push({
      text: comment,
      author: req.userId,
      isInternal: isInternal === 'true',
      attachments
    });

    await incident.save();

    // Populate the new comment
    await incident.populate('comments.author', 'firstName lastName');

    const newComment = incident.comments[incident.comments.length - 1];

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// Get incident comments
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const incident = await Incident.findOne({
      $or: [
        { _id: req.params.id },
        { incidentId: req.params.id }
      ]
    }).populate('comments.author', 'firstName lastName');

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    res.json(incident.comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Upload attachment to existing incident
router.post('/:id/attachments', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const incident = await Incident.findOne({
      $or: [
        { _id: req.params.id },
        { incidentId: req.params.id }
      ]
    });

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const attachment = {
          filename: `${Date.now()}_${file.originalname}`,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer,
          uploadedBy: req.userId
        };
        
        incident.attachments.push(attachment);
        attachments.push({
          _id: incident.attachments[incident.attachments.length - 1]._id,
          filename: attachment.filename,
          originalName: attachment.originalName,
          mimetype: attachment.mimetype,
          size: attachment.size,
          uploadedBy: attachment.uploadedBy,
          uploadedAt: attachment.uploadedAt
        });
      }
    }

    await incident.save();

    res.status(201).json({
      message: 'Attachments uploaded successfully',
      attachments
    });
  } catch (error) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({ message: 'Error uploading attachments' });
  }
});

// Delete incident (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const incident = await Incident.findOneAndDelete({
      $or: [
        { _id: req.params.id },
        { incidentId: req.params.id }
      ]
    });

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    res.json({ message: 'Incident deleted successfully' });
  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({ message: 'Error deleting incident' });
  }
});

export default router;