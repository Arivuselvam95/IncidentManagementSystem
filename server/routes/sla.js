import express from 'express';
import Incident from '../models/Incident.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Default SLA settings
const defaultSLASettings = {
  critical: { responseTime: 15, resolutionTime: 60 }, // minutes, minutes
  high: { responseTime: 30, resolutionTime: 240 }, // minutes, minutes
  medium: { responseTime: 120, resolutionTime: 1440 }, // minutes, minutes
  low: { responseTime: 480, resolutionTime: 4320 } // minutes, minutes
};

// Get SLA settings
router.get('/settings', auth, async (req, res) => {
  try {
    // In a real application, these would be stored in the database
    // For now, we'll return default settings
    res.json(defaultSLASettings);
  } catch (error) {
    console.error('Error fetching SLA settings:', error);
    res.status(500).json({ message: 'Error fetching SLA settings' });
  }
});

// Update SLA settings (admin only)
router.put('/settings', auth, async (req, res) => {
  try {
    // Check if user is admin
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // In a real application, you would save these to the database
    // For now, we'll just return the updated settings
    const updatedSettings = { ...defaultSLASettings, ...req.body };

    res.json({
      message: 'SLA settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Error updating SLA settings:', error);
    res.status(500).json({ message: 'Error updating SLA settings' });
  }
});

// Get SLA performance metrics
router.get('/performance', auth, async (req, res) => {
  try {
    const timeRange = req.query.range || '30d';
    let startDate;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get SLA performance by severity
    const slaPerformance = await Incident.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          'sla.target': { $exists: true }
        }
      },
      {
        $addFields: {
          isResolved: { $eq: ['$status', 'resolved'] },
          resolutionTime: {
            $cond: [
              { $eq: ['$status', 'resolved'] },
              {
                $subtract: [
                  { $ifNull: ['$resolution.resolvedAt', new Date()] },
                  '$createdAt'
                ]
              },
              {
                $subtract: [new Date(), '$createdAt']
              }
            ]
          },
          slaTarget: {
            $subtract: ['$sla.target', '$createdAt']
          }
        }
      },
      {
        $addFields: {
          slaBreached: {
            $cond: [
              '$isResolved',
              { $gt: ['$resolutionTime', '$slaTarget'] },
              { $gt: [{ $subtract: [new Date(), '$createdAt'] }, '$slaTarget'] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$severity',
          totalIncidents: { $sum: 1 },
          resolvedIncidents: {
            $sum: { $cond: ['$isResolved', 1, 0] }
          },
          slaBreached: {
            $sum: { $cond: ['$slaBreached', 1, 0] }
          },
          slaMet: {
            $sum: { $cond: ['$slaBreached', 0, 1] }
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                '$isResolved',
                { $divide: ['$resolutionTime', 1000 * 60 * 60] }, // Convert to hours
                null
              ]
            }
          }
        }
      },
      {
        $addFields: {
          slaComplianceRate: {
            $multiply: [
              { $divide: ['$slaMet', '$totalIncidents'] },
              100
            ]
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Calculate overall SLA performance
    const overallStats = slaPerformance.reduce(
      (acc, curr) => {
        acc.totalIncidents += curr.totalIncidents;
        acc.slaMet += curr.slaMet;
        acc.slaBreached += curr.slaBreached;
        return acc;
      },
      { totalIncidents: 0, slaMet: 0, slaBreached: 0 }
    );

    const overallCompliance = overallStats.totalIncidents > 0
      ? Math.round((overallStats.slaMet / overallStats.totalIncidents) * 100)
      : 0;

    // Get SLA trends over time
    const slatrends = await Incident.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          'sla.target': { $exists: true }
        }
      },
      {
        $addFields: {
          week: {
            $dateToString: {
              format: "%Y-W%U",
              date: "$createdAt"
            }
          },
          slaBreached: {
            $cond: [
              { $eq: ['$status', 'resolved'] },
              {
                $gt: [
                  { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                  { $subtract: ['$sla.target', '$createdAt'] }
                ]
              },
              {
                $gt: [
                  { $subtract: [new Date(), '$createdAt'] },
                  { $subtract: ['$sla.target', '$createdAt'] }
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$week',
          totalIncidents: { $sum: 1 },
          slaBreached: {
            $sum: { $cond: ['$slaBreached', 1, 0] }
          }
        }
      },
      {
        $addFields: {
          complianceRate: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$totalIncidents', '$slaBreached'] },
                  '$totalIncidents'
                ]
              },
              100
            ]
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      overallCompliance,
      performanceBySeverity: slaPerformance,
      trends: slatrends,
      summary: {
        totalIncidents: overallStats.totalIncidents,
        slaMet: overallStats.slaMet,
        slaBreached: overallStats.slaBreached
      }
    });
  } catch (error) {
    console.error('Error fetching SLA performance:', error);
    res.status(500).json({ message: 'Error fetching SLA performance' });
  }
});

// Get incidents at risk of SLA breach
router.get('/at-risk', auth, async (req, res) => {
  try {
    const now = new Date();
    const warningThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds

    const atRiskIncidents = await Incident.find({
      status: { $in: ['new', 'assigned', 'in-progress'] },
      'sla.target': { $exists: true }
    })
    .populate('assignee.user', 'firstName lastName')
    .populate('reporter.user', 'firstName lastName')
    .select('incidentId title severity status category assignee reporter sla createdAt');

    // Filter incidents that are at risk
    const filteredIncidents = atRiskIncidents.filter(incident => {
      const timeUntilBreach = new Date(incident.sla.target) - now;
      return timeUntilBreach <= warningThreshold && timeUntilBreach > 0;
    });

    // Sort by time until breach (most urgent first)
    filteredIncidents.sort((a, b) => {
      const timeA = new Date(a.sla.target) - now;
      const timeB = new Date(b.sla.target) - now;
      return timeA - timeB;
    });

    res.json(filteredIncidents);
  } catch (error) {
    console.error('Error fetching at-risk incidents:', error);
    res.status(500).json({ message: 'Error fetching at-risk incidents' });
  }
});

// Get breached incidents
router.get('/breached', auth, async (req, res) => {
  try {
    const now = new Date();

    const breachedIncidents = await Incident.find({
      status: { $in: ['new', 'assigned', 'in-progress'] },
      'sla.target': { $lt: now }
    })
    .populate('assignee.user', 'firstName lastName')
    .populate('reporter.user', 'firstName lastName')
    .select('incidentId title severity status category assignee reporter sla createdAt')
    .sort({ 'sla.target': 1 });

    res.json(breachedIncidents);
  } catch (error) {
    console.error('Error fetching breached incidents:', error);
    res.status(500).json({ message: 'Error fetching breached incidents' });
  }
});

export default router;