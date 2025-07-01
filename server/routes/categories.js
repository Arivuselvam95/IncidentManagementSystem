import express from 'express';
import Incident from '../models/Incident.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get all categories with incident counts
router.get('/', auth, async (req, res) => {
  try {
    // Get category statistics
    const categoryStats = await Incident.aggregate([
      {
        $group: {
          _id: '$category',
          totalIncidents: { $sum: 1 },
          openIncidents: {
            $sum: {
              $cond: [
                { $in: ['$status', ['new', 'assigned', 'in-progress']] },
                1,
                0
              ]
            }
          },
          criticalIncidents: {
            $sum: {
              $cond: [
                { $eq: ['$severity', 'critical'] },
                1,
                0
              ]
            }
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'resolved'] },
                  { $ne: ['$resolution.timeSpent', null] }
                ]},
                '$resolution.timeSpent',
                null
              ]
            }
          }
        }
      },
      {
        $sort: { totalIncidents: -1 }
      }
    ]);

    // Default categories if no incidents exist
    const defaultCategories = [
      'Network & Connectivity',
      'Software & Applications',
      'Hardware & Equipment',
      'Security & Access',
      'Database & Storage',
      'Email & Communication',
      'Printer & Peripherals',
      'Phone & VoIP',
      'Website & Web Services',
      'Mobile & Tablets',
      'Other'
    ];

    // Merge with default categories
    const allCategories = defaultCategories.map(category => {
      const stats = categoryStats.find(stat => stat._id === category);
      return {
        name: category,
        totalIncidents: stats?.totalIncidents || 0,
        openIncidents: stats?.openIncidents || 0,
        criticalIncidents: stats?.criticalIncidents || 0,
        avgResolutionTime: stats?.avgResolutionTime || 0
      };
    });

    // Add any custom categories not in defaults
    categoryStats.forEach(stat => {
      if (!defaultCategories.includes(stat._id)) {
        allCategories.push({
          name: stat._id,
          totalIncidents: stat.totalIncidents,
          openIncidents: stat.openIncidents,
          criticalIncidents: stat.criticalIncidents,
          avgResolutionTime: stat.avgResolutionTime || 0
        });
      }
    });

    res.json(allCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get category trends
router.get('/trends', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const trends = await Incident.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            category: '$category',
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          data: {
            $push: {
              date: '$_id.date',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    res.json(trends);
  } catch (error) {
    console.error('Error fetching category trends:', error);
    res.status(500).json({ message: 'Error fetching category trends' });
  }
});

export default router;