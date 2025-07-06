import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        showError('Google authentication failed. Please try again.');
        navigate('/login');
        return;
      }

      if (token) {
        try {
          // Store token
          localStorage.setItem('token', token);
          
          // Validate token and get user data
          const response = await fetch('http://localhost:5000/api/auth/validate', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            showSuccess('Successfully signed in with Google!');
            navigate('/dashboard');
          } else {
            throw new Error('Token validation failed');
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          showError('Authentication failed. Please try again.');
          localStorage.removeItem('token');
          navigate('/login');
        }
      } else {
        showError('No authentication token received.');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser, showSuccess, showError]);

  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Completing Google sign-in...</p>
    </div>
  );
};

export default AuthCallback;