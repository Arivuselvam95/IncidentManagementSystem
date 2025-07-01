import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { incidentsAPI } from '../../services/api';
import './Incidents.css';

const IncidentReporting = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    category: '',
    affectedServices: '',
    steps: '',
    expectedBehavior: '',
    actualBehavior: '',
    urgency: 'medium',
    impact: 'medium'
  });

  const severityOptions = [
    { value: 'low', label: 'Low', description: 'Minor issues with minimal impact' },
    { value: 'medium', label: 'Medium', description: 'Issues affecting some users or functions' },
    { value: 'high', label: 'High', description: 'Major issues affecting business operations' },
    { value: 'critical', label: 'Critical', description: 'System down or security breaches' }
  ];

  const categoryOptions = [
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

  const urgencyOptions = [
    { value: 'low', label: 'Low', description: 'Can be resolved in normal business hours' },
    { value: 'medium', label: 'Medium', description: 'Should be resolved within 24 hours' },
    { value: 'high', label: 'High', description: 'Needs immediate attention' },
    { value: 'critical', label: 'Critical', description: 'Emergency - resolve immediately' }
  ];

  const impactOptions = [
    { value: 'low', label: 'Low', description: 'Affects individual user' },
    { value: 'medium', label: 'Medium', description: 'Affects department or team' },
    { value: 'high', label: 'High', description: 'Affects multiple departments' },
    { value: 'critical', label: 'Critical', description: 'Organization-wide impact' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create form data for file upload
      const submitData = new FormData();
      
      // Add incident data
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });

      // Add reporter info
      submitData.append('reporterId', user.id);
      submitData.append('reporterName', `${user.firstName} ${user.lastName}`);
      submitData.append('reporterEmail', user.email);

      // Add attachments
      attachments.forEach((file, index) => {
        submitData.append(`attachments`, file);
      });

      const response = await incidentsAPI.create(submitData);
      
      if (response.data) {
        showSuccess(`Incident ${response.data.incidentId} has been created successfully`);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          severity: 'medium',
          category: '',
          affectedServices: '',
          steps: '',
          expectedBehavior: '',
          actualBehavior: '',
          urgency: 'medium',
          impact: 'medium'
        });
        setAttachments([]);
        
        // Reset file input
        const fileInput = document.getElementById('attachments');
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Error creating incident:', error);
      showError(error.response?.data?.message || 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="incident-reporting">
      <div className="page-header">
        <h1>Report New Incident</h1>
        <p>Provide detailed information about the incident to help our team resolve it quickly.</p>
      </div>

      <form onSubmit={handleSubmit} className="incident-form">
        <div className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-group">
            <label htmlFor="title" className="form-label required">
              Incident Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-input"
              required
              placeholder="Brief description of the issue (e.g., 'Unable to access email')"
            />
          </div>

          <div className="form-group">
            <label htmlFor="category" className="form-label required">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select a category</option>
              {categoryOptions.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label required">
              Detailed Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-input form-textarea"
              required
              rows="4"
              placeholder="Provide a detailed description of the incident, including what happened and when..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="affectedServices" className="form-label">
              Affected Services/Systems
            </label>
            <input
              type="text"
              id="affectedServices"
              name="affectedServices"
              value={formData.affectedServices}
              onChange={handleChange}
              className="form-input"
              placeholder="Which systems or services are affected? (e.g., 'Email server, CRM system')"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Priority & Impact</h2>
          
          <div className="priority-grid">
            <div className="form-group">
              <label htmlFor="severity" className="form-label">
                Severity
              </label>
              <select
                id="severity"
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="form-select"
              >
                {severityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="field-description">
                {severityOptions.find(opt => opt.value === formData.severity)?.description}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="urgency" className="form-label">
                Urgency
              </label>
              <select
                id="urgency"
                name="urgency"
                value={formData.urgency}
                onChange={handleChange}
                className="form-select"
              >
                {urgencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="field-description">
                {urgencyOptions.find(opt => opt.value === formData.urgency)?.description}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="impact" className="form-label">
                Impact
              </label>
              <select
                id="impact"
                name="impact"
                value={formData.impact}
                onChange={handleChange}
                className="form-select"
              >
                {impactOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="field-description">
                {impactOptions.find(opt => opt.value === formData.impact)?.description}
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Detailed Information</h2>
          
          <div className="form-group">
            <label htmlFor="steps" className="form-label">
              Steps to Reproduce
            </label>
            <textarea
              id="steps"
              name="steps"
              value={formData.steps}
              onChange={handleChange}
              className="form-input form-textarea"
              rows="3"
              placeholder="List the steps that led to this incident (if applicable)..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="expectedBehavior" className="form-label">
              Expected Behavior
            </label>
            <textarea
              id="expectedBehavior"
              name="expectedBehavior"
              value={formData.expectedBehavior}
              onChange={handleChange}
              className="form-input form-textarea"
              rows="2"
              placeholder="What should have happened?"
            />
          </div>

          <div className="form-group">
            <label htmlFor="actualBehavior" className="form-label">
              Actual Behavior
            </label>
            <textarea
              id="actualBehavior"
              name="actualBehavior"
              value={formData.actualBehavior}
              onChange={handleChange}
              className="form-input form-textarea"
              rows="2"
              placeholder="What actually happened?"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Attachments</h2>
          <p className="section-description">
            Attach screenshots, logs, or other files that help explain the incident. 
            Supported formats: images, documents, logs (max 10MB per file).
          </p>
          
          <div className="file-upload-area">
            <input
              type="file"
              id="attachments"
              multiple
              onChange={handleFileUpload}
              className="file-input"
              accept="image/*,.pdf,.doc,.docx,.txt,.log,.json,.xml"
            />
            <label htmlFor="attachments" className="file-upload-label">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Choose Files or Drag & Drop
            </label>
          </div>

          {attachments.length > 0 && (
            <div className="attachments-list">
              <h3>Selected Files:</h3>
              {attachments.map((file, index) => (
                <div key={index} className="attachment-item">
                  <div className="attachment-info">
                    <span className="attachment-name">{file.name}</span>
                    <span className="attachment-size">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="attachment-remove"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Incident...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create Incident
              </>
            )}
          </button>
          
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              if (window.confirm('Are you sure you want to cancel? All entered data will be lost.')) {
                window.history.back();
              }
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default IncidentReporting;