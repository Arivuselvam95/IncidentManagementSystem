import mongoose from 'mongoose';

const registrationRequestSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['it-support', 'team-lead', 'admin'],
    required: true
  },
  department: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String
  },
  // Store original Google data if applicable
  googleId: {
    type: String,
    sparse: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
registrationRequestSchema.index({ email: 1 });
registrationRequestSchema.index({ status: 1 });
registrationRequestSchema.index({ requestedAt: -1 });

export default mongoose.model('RegistrationRequest', registrationRequestSchema);