import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import IncidentReporting from './components/Incidents/IncidentReporting';
import IncidentStatus from './components/Incidents/IncidentStatus';
import IncidentDetails from './components/Incidents/IncidentDetails';
import IncidentResolving from './components/Incidents/IncidentResolving';
import IncidentAllocation from './components/Incidents/IncidentAllocation';
import Profile from './components/Profile/Profile';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="app">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="incidents/report" element={<IncidentReporting />} />
                <Route path="incidents/status" element={<IncidentStatus />} />
                <Route path="incidents/:id" element={<IncidentDetails />} />
                <Route path="incidents/resolve" element={<IncidentResolving />} />
                <Route path="incidents/allocate" element={<IncidentAllocation />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;