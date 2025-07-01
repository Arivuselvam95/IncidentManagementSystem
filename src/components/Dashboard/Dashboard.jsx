import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI } from '../../services/api';
import StatsCard from './StatsCard';
import IncidentChart from './IncidentChart';
import RecentIncidents from './RecentIncidents';
import SLAStatus from './SLAStatus';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalIncidents: 0,
    openIncidents: 0,
    resolvedIncidents: 0,
    criticalIncidents: 0,
    mttr: 0,
    mtta: 0
  });
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, incidentsRes, chartRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecentIncidents(),
        dashboardAPI.getChartData()
      ]);

      setStats(statsRes.data);
      setRecentIncidents(incidentsRes.data);
      setChartData(chartRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.firstName}! Here's your incident management overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          title="Total Incidents"
          value={stats.totalIncidents}
          icon="clipboard-list"
          color="primary"
          trend={stats.totalIncidentsTrend}
        />
        <StatsCard
          title="Open Incidents"
          value={stats.openIncidents}
          icon="exclamation-circle"
          color="warning"
          trend={stats.openIncidentsTrend}
        />
        <StatsCard
          title="Resolved Today"
          value={stats.resolvedIncidents}
          icon="check-circle"
          color="success"
          trend={stats.resolvedIncidentsTrend}
        />
        <StatsCard
          title="Critical Issues"
          value={stats.criticalIncidents}
          icon="alert-triangle"
          color="error"
          trend={stats.criticalIncidentsTrend}
        />
      </div>

      {/* Performance Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Mean Time to Resolve (MTTR)</h3>
          <div className="metric-value">
            <span className="metric-number">{stats.mttr}</span>
            <span className="metric-unit">hours</span>
          </div>
          <div className="metric-description">
            Average time to resolve incidents
          </div>
        </div>
        
        <div className="metric-card">
          <h3>Mean Time to Acknowledge (MTTA)</h3>
          <div className="metric-value">
            <span className="metric-number">{stats.mtta}</span>
            <span className="metric-unit">minutes</span>
          </div>
          <div className="metric-description">
            Average time to first response
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="dashboard-content">
        <div className="dashboard-left">
          <IncidentChart data={chartData} />
          <SLAStatus />
        </div>
        
        <div className="dashboard-right">
          <RecentIncidents incidents={recentIncidents} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;