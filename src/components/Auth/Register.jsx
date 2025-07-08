import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    role: 'reporter'
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { user, register, error, setError } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const departments = [
    'IT Support',
    'Network Operations',
    'Security',
    'Development',
    'Infrastructure',
    'Help Desk',
    'Operations',
    'Management'
  ];

  const roles = [
    { value: 'reporter', label: 'Reporter (End User)' },
    { value: 'it-support', label: 'IT Support' },
    { value: 'team-lead', label: 'Team Lead' },
    { value: 'admin', label: 'Administrator' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear errors when user starts typing
    if (error) setError(null);
    if (validationErrors[e.target.name]) {
      setValidationErrors({
        ...validationErrors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.department) {
      errors.department = 'Please select your department';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...userData } = formData;
      
      // Check if this is an IT team registration that needs approval
      const needsApproval = ['it-support', 'team-lead', 'admin'].includes(formData.role);
      
      if (needsApproval) {
        // Submit registration request for approval
        const response = await authAPI.submitRegistrationRequest(userData);
        setRegistrationSuccess(true);
      } else {
        // Direct registration for reporters
        const result = await register(userData);
        if (!result.success) {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.message || 'Registration failed');
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    authAPI.googleLogin();
  };

  if (registrationSuccess) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Registration Submitted</h1>
            <p className="auth-subtitle">Your request is pending approval</p>
          </div>

          <div className="approval-notice">
            <div className="notice-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="notice-content">
              <h3>Registration Request Submitted Successfully!</h3>
              <p>
                Your registration as an IT team member has been submitted for approval. 
                An administrator or team lead will review your request and approve your account.
              </p>
              <p>
                You will receive an email notification once your account has been approved 
                and you can then log in to the system.
              </p>
            </div>
          </div>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-large">
        <div className="auth-header">
          <h1 className="auth-title">IncidentResolve</h1>
          <p className="auth-subtitle">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`form-input ${validationErrors.firstName ? 'error' : ''}`}
                required
                placeholder="Enter your first name"
              />
              {validationErrors.firstName && (
                <span className="error-text">{validationErrors.firstName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`form-input ${validationErrors.lastName ? 'error' : ''}`}
                required
                placeholder="Enter your last name"
              />
              {validationErrors.lastName && (
                <span className="error-text">{validationErrors.lastName}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${validationErrors.email ? 'error' : ''}`}
              required
              placeholder="Enter your email address"
            />
            {validationErrors.email && (
              <span className="error-text">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${validationErrors.password ? 'error' : ''}`}
                required
                placeholder="Enter your password"
              />
              {validationErrors.password && (
                <span className="error-text">{validationErrors.password}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${validationErrors.confirmPassword ? 'error' : ''}`}
                required
                placeholder="Confirm your password"
              />
              {validationErrors.confirmPassword && (
                <span className="error-text">{validationErrors.confirmPassword}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="department" className="form-label">
                Department
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className={`form-select ${validationErrors.department ? 'error' : ''}`}
                required
              >
                <option value="">Select your department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {validationErrors.department && (
                <span className="error-text">{validationErrors.department}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="role" className="form-label">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-select"
                required
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {['it-support', 'team-lead', 'admin'].includes(formData.role) && (
            <div className="approval-warning">
              <div className="warning-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="warning-content">
                <strong>Approval Required</strong>
                <p>IT team registrations require approval from an administrator or team lead before you can access the system.</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {['it-support', 'team-lead', 'admin'].includes(formData.role) 
                  ? 'Submitting Request...' 
                  : 'Creating Account...'
                }
              </>
            ) : (
              <>
                {['it-support', 'team-lead', 'admin'].includes(formData.role) 
                  ? 'Submit Registration Request' 
                  : 'Create Account'
                }
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          onClick={handleGoogleRegister}
          className="btn btn-google btn-lg"
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;