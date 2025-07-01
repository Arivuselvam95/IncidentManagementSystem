import express from 'express';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get incident trends
router.get('/trends', auth, async (req, res) => {
  try {
    const range = req.query.range || '30d';
    let startDate;
    let groupBy;

    switch (range) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        groupBy = { $dateToString: { format: "%Y-W%U", date: "$createdAt" } };
        break;
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    }

    const trends = await Incident.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            period: groupBy,
            severity: '$severity'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.period',
          data: {
            $push: {
              severity: '$_id.severity',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json(trends);
  } catch (error) {
    console.error('Error fetching incident trends:', error);
    res.status(500).json({ message: 'Error fetching incident trends' });
  }
});

// Get performance metrics
router.get('/performance', auth, async (req, res) => {
  try {
    const range = req.query.range || '30d';
    let startDate;

    switch (range) {
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

    // Calculate MTTR (Mean Time to Resolve)
    const mttrData = await Incident.aggregate([
      {
        $match: {
          status: 'resolved',
          'resolution.resolvedAt': { $gte: startDate },
          createdAt: { $gte: startDate }
        }
      },
      {
        $addFields: {
          resolutionTimeHours: {
            $divide: [
              { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: '$severity',
          avgResolutionTime: { $avg: '$resolutionTimeHours' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate MTTA (Mean Time to Acknowledge)
    const mttaData = await Incident.aggregate([
      {
        $match: {
          acknowledgedAt: { $exists: true },
          createdAt: { $gte: startDate }
        }
      },
      {
        $addFields: {
          acknowledgeTimeMinutes: {
            $divide: [
              { $subtract: ['$acknowledgedAt', '$createdAt'] },
              1000 * 60 // Convert to minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: '$severity',
          avgAcknowledgeTime: { $avg: '$acknowledgeTimeMinutes' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate First Call Resolution Rate
    const fcrData = await Incident.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$severity',
          totalIncidents: { $sum: 1 },
          resolvedOnFirstContact: {
            $sum: {
              $cond: [
                { $eq: ['$metrics.reopenCount', 0] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          fcrRate: {
            $multiply: [
              { $divide: ['$resolvedOnFirstContact', '$totalIncidents'] },
              100
            ]
          }
        }
      }
    ]);

    // Calculate Customer Satisfaction
    const satisfactionData = await Incident.aggregate([
      {
        $match: {
          'resolution.satisfactionRating': { $exists: true, $gt: 0 },
          'resolution.resolvedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$severity',
          avgSatisfaction: { $avg: '$resolution.satisfactionRating' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      mttr: mttrData,
      mtta: mttaData,
      fcr: fcrData,
      satisfaction: satisfactionData
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ message: 'Error fetching performance metrics' });
  }
});

// Get resolution rates
router.get('/resolution-rates', auth, async (req, res) => {
  try {
    const range = req.query.range || '30d';
    let startDate;

    switch (range) {
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

    const resolutionRates = await Incident.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            category: '$category',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          statusCounts: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalIncidents: { $sum: '$count' }
        }
      },
      {
        $addFields: {
          resolvedCount: {
            $reduce: {
              input: '$statusCounts',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.status', 'resolved'] },
                  { $add: ['$$value', '$$this.count'] },
                  '$$value'
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          resolutionRate: {
            $multiply: [
              { $divide: ['$resolvedCount', '$totalIncidents'] },
              100
            ]
          }
        }
      },
      {
        $sort: { resolutionRate: -1 }
      }
    ]);

    res.json(resolutionRates);
  } catch (error) {
    console.error('Error fetching resolution rates:', error);
    res.status(500).json({ message: 'Error fetching resolution rates' });
  }
});

// Get category breakdown
router.get('/categories', auth, async (req, res) => {
  try {
    const range = req.query.range || '30d';
    let startDate;

    switch (range) {
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

    const categoryBreakdown = await Incident.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          totalIncidents: { $sum: 1 },
          criticalIncidents: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          },
          highIncidents: {
            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
          },
          mediumIncidents: {
            $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] }
          },
          lowIncidents: {
            $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] }
          },
          resolvedIncidents: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
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
        $addFields: {
          resolutionRate: {
            $multiply: [
              { $divide: ['$resolvedIncidents', '$totalIncidents'] },
              100
            ]
          }
        }
      },
      {
        $sort: { totalIncidents: -1 }
      }
    ]);

    res.json(categoryBreakdown);
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({ message: 'Error fetching category breakdown' });
  }
});

// Get team performance
router.get('/team-performance', auth, async (req, res) => {
  try {
    const range = req.query.range || '30d';
    let startDate;

    switch (range) {
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

    const teamPerformance = await Incident.aggregate([
      {
        $match: {
          'resolution.resolvedBy': { $exists: true },
          'resolution.resolvedAt': { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'resolution.resolvedBy',
          foreignField: '_id',
          as: 'resolver'
        }
      },
      {
        $unwind: '$resolver'
      },
      {
        $addFields: {
          resolutionTimeHours: {
            $divide: [
              { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
              1000 * 60 * 60
            ]
          }
        }
      },
      {
        $group: {
          _id: '$resolution.resolvedBy',
          resolverName: { $first: { $concat: ['$resolver.firstName', ' ', '$resolver.lastName'] } },
          department: { $first: '$resolver.department' },
          totalResolved: { $sum: 1 },
          avgResolutionTime: { $avg: '$resolutionTimeHours' },
          avgSatisfaction: { $avg: '$resolution.satisfactionRating' },
          criticalResolved: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { totalResolved: -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json(teamPerformance);
  } catch (error) {
    console.error('Error fetching team performance:', error);
    res.status(500).json({ message: 'Error fetching team performance' });
  }
});

// Export report
router.post('/export', auth, async (req, res) => {
  try {
    const { reportType, filters } = req.body;
    
    // Build query based on filters
    const query = {};
    
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }
    
    if (filters.severity && filters.severity !== 'all') {
      query.severity = filters.severity;
    }
    
    if (filters.category && filters.category !== 'all') {
      query.category = filters.category;
    }
    
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    let data;
    
    switch (reportType) {
      case 'incidents':
        data = await Incident.find(query)
          .populate('reporter.user', 'firstName lastName email')
          .populate('assignee.user', 'firstName lastName email')
          .populate('resolution.resolvedBy', 'firstName lastName')
          .sort({ createdAt: -1 });
        break;
        
      case 'performance':
        data = await Incident.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$category',
              totalIncidents: { $sum: 1 },
              resolvedIncidents: {
                $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
              },
              avgResolutionTime: {
                $avg: {
                  $cond: [
                    { $eq: ['$status', 'resolved'] },
                    { $divide: [
                      { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                      1000 * 60 * 60
                    ]},
                    null
                  ]
                }
              }
            }
          }
        ]);
        break;
        
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // Convert to CSV format
    const csv = convertToCSV(data, reportType);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ message: 'Error exporting report' });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data, reportType) {
  if (!data || data.length === 0) {
    return 'No data available';
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}

export default router;