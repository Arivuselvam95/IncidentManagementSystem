import express from 'express';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get basic counts
    const [
      totalIncidents,
      openIncidents,
      resolvedToday,
      criticalIncidents,
      totalIncidentsLastWeek,
      openIncidentsLastWeek,
      resolvedLastWeek,
      criticalIncidentsLastWeek
    ] = await Promise.all([
      Incident.countDocuments(),
      Incident.countDocuments({ status: { $in: ['new', 'assigned', 'in-progress'] } }),
      Incident.countDocuments({ 
        status: 'resolved',
        'resolution.resolvedAt': { $gte: startOfDay }
      }),
      Incident.countDocuments({ severity: 'critical', status: { $ne: 'closed' } }),
      Incident.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Incident.countDocuments({ 
        status: { $in: ['new', 'assigned', 'in-progress'] },
        createdAt: { $gte: startOfWeek }
      }),
      Incident.countDocuments({ 
        status: 'resolved',
        'resolution.resolvedAt': { $gte: startOfWeek }
      }),
      Incident.countDocuments({ 
        severity: 'critical',
        status: { $ne: 'closed' },
        createdAt: { $gte: startOfWeek }
      })
    ]);

    // Calculate trends (percentage change from last week)
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Calculate MTTR (Mean Time to Resolve) in hours
    const resolvedIncidents = await Incident.find({
      status: 'resolved',
      'resolution.resolvedAt': { $exists: true },
      createdAt: { $gte: startOfMonth }
    }).select('createdAt resolution.resolvedAt');

    let mttr = 0;
    if (resolvedIncidents.length > 0) {
      const totalResolutionTime = resolvedIncidents.reduce((sum, incident) => {
        const resolutionTime = new Date(incident.resolution.resolvedAt) - new Date(incident.createdAt);
        return sum + resolutionTime;
      }, 0);
      mttr = Math.round(totalResolutionTime / (resolvedIncidents.length * 1000 * 60 * 60)); // Convert to hours
    }

    // Calculate MTTA (Mean Time to Acknowledge) in minutes
    const acknowledgedIncidents = await Incident.find({
      acknowledgedAt: { $exists: true },
      createdAt: { $gte: startOfMonth }
    }).select('createdAt acknowledgedAt');

    let mtta = 0;
    if (acknowledgedIncidents.length > 0) {
      const totalAckTime = acknowledgedIncidents.reduce((sum, incident) => {
        const ackTime = new Date(incident.acknowledgedAt) - new Date(incident.createdAt);
        return sum + ackTime;
      }, 0);
      mtta = Math.round(totalAckTime / (acknowledgedIncidents.length * 1000 * 60)); // Convert to minutes
    }

    const stats = {
      totalIncidents,
      openIncidents,
      resolvedIncidents: resolvedToday,
      criticalIncidents,
      mttr,
      mtta,
      totalIncidentsTrend: calculateTrend(totalIncidents, totalIncidentsLastWeek),
      openIncidentsTrend: calculateTrend(openIncidents, openIncidentsLastWeek),
      resolvedIncidentsTrend: calculateTrend(resolvedToday, resolvedLastWeek),
      criticalIncidentsTrend: calculateTrend(criticalIncidents, criticalIncidentsLastWeek)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

// Get recent incidents
router.get('/recent-incidents', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const incidents = await Incident.find()
      .populate('reporter.user', 'firstName lastName')
      .populate('assignee.user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('incidentId title severity status category assignee reporter createdAt');

    // Transform data for frontend
    const transformedIncidents = incidents.map(incident => ({
      id: incident.incidentId,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      category: incident.category,
      assignee: incident.assignee?.name || null,
      reporter: incident.reporter.name,
      createdAt: incident.createdAt
    }));

    res.json(transformedIncidents);
  } catch (error) {
    console.error('Error fetching recent incidents:', error);
    res.status(500).json({ message: 'Error fetching recent incidents' });
  }
});

// Get chart data for incident trends
router.get('/chart-data', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    // Generate date range
    const dateRange = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      dateRange.push({
        date: date.toISOString().split('T')[0],
        created: 0,
        resolved: 0
      });
    }

    // Get created incidents by day
    const createdIncidents = await Incident.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get resolved incidents by day
    const resolvedIncidents = await Incident.aggregate([
      {
        $match: {
          'resolution.resolvedAt': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$resolution.resolvedAt" }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Create maps for quick lookup
    const createdMap = createdIncidents.reduce((map, item) => {
      map[item._id] = item.count;
      return map;
    }, {});

    const resolvedMap = resolvedIncidents.reduce((map, item) => {
      map[item._id] = item.count;
      return map;
    }, {});

    // Merge with date range
    const chartData = dateRange.map(day => ({
      date: day.date,
      created: createdMap[day.date] || 0,
      resolved: resolvedMap[day.date] || 0
    }));

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ message: 'Error fetching chart data' });
  }
});

// Get SLA performance data
router.get('/sla-performance', auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get incidents with SLA data
    const incidents = await Incident.find({
      createdAt: { $gte: startOfMonth },
      'sla.target': { $exists: true }
    }).select('severity sla createdAt resolution.resolvedAt status');

    const slaData = {
      critical: { total: 0, onTime: 0, breached: 0 },
      high: { total: 0, onTime: 0, breached: 0 },
      medium: { total: 0, onTime: 0, breached: 0 },
      low: { total: 0, onTime: 0, breached: 0 }
    };

    incidents.forEach(incident => {
      const severity = incident.severity;
      slaData[severity].total++;

      if (incident.status === 'resolved' && incident.resolution?.resolvedAt) {
        const resolvedAt = new Date(incident.resolution.resolvedAt);
        const slaTarget = new Date(incident.sla.target);
        
        if (resolvedAt <= slaTarget) {
          slaData[severity].onTime++;
        } else {
          slaData[severity].breached++;
        }
      } else if (new Date() > new Date(incident.sla.target)) {
        slaData[severity].breached++;
      }
    });

    // Calculate percentages
    Object.keys(slaData).forEach(severity => {
      const data = slaData[severity];
      data.onTimePercentage = data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 0;
      data.breachedPercentage = data.total > 0 ? Math.round((data.breached / data.total) * 100) : 0;
    });

    res.json(slaData);
  } catch (error) {
    console.error('Error fetching SLA performance:', error);
    res.status(500).json({ message: 'Error fetching SLA performance' });
  }
});

// Get workload distribution
router.get('/workload', auth, async (req, res) => {
  try {
    const workload = await Incident.aggregate([
      {
        $match: {
          status: { $in: ['assigned', 'in-progress'] },
          'assignee.user': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$assignee.user',
          assigneeName: { $first: '$assignee.name' },
          count: { $sum: 1 },
          critical: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          },
          high: {
            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json(workload);
  } catch (error) {
    console.error('Error fetching workload data:', error);
    res.status(500).json({ message: 'Error fetching workload data' });
  }
});

export default router;