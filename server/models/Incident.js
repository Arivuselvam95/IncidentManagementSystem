import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  path: {
    type: String,
    required: false
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isInternal: {
    type: Boolean,
    default: false
  },
  attachments: [attachmentSchema]
}, {
  timestamps: true
});

const workLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  isSystemGenerated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const incidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    unique: true,
    required: false
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'assigned', 'in-progress', 'pending', 'resolved', 'closed', 'reopened'],
    default: 'new'
  },
  category: {
    type: String,
    required: true
  },
  subcategory: {
    type: String
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  impact: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Reporter information
  reporter: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String
    }
  },
  
  // Assignment information
  assignee: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String
    },
    assignedAt: {
      type: Date
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Incident details
  affectedServices: {
    type: String
  },
  stepsToReproduce: {
    type: String
  },
  expectedBehavior: {
    type: String
  },
  actualBehavior: {
    type: String
  },
  workaround: {
    type: String
  },
  
  // Resolution information
  resolution: {
    notes: {
      type: String
    },
    rootCause: {
      type: String
    },
    preventiveMeasures: {
      type: String
    },
    category: {
      type: String
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    },
    timeSpent: {
      type: Number // in hours
    },
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // SLA information
  sla: {
    target: {
      type: Date
    },
    firstResponseTarget: {
      type: Date
    },
    firstResponseAt: {
      type: Date
    },
    isBreached: {
      type: Boolean,
      default: false
    },
    breachedAt: {
      type: Date
    }
  },
  
  // Timestamps
  acknowledgedAt: {
    type: Date
  },
  closedAt: {
    type: Date
  },
  
  // Related data
  attachments: [attachmentSchema],
  comments: [commentSchema],
  workLogs: [workLogSchema],
  
  // Tags and labels
  tags: [{
    type: String,
    trim: true
  }],
  
  // Knowledge base links
  knowledgeBaseArticles: [{
    title: String,
    url: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Escalation information
  escalation: {
    isEscalated: {
      type: Boolean,
      default: false
    },
    escalatedAt: {
      type: Date
    },
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String
    }
  },
  
  // Metrics
  metrics: {
    viewCount: {
      type: Number,
      default: 0
    },
    reopenCount: {
      type: Number,
      default: 0
    },
    lastViewedAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Generate incident ID before saving
incidentSchema.pre('save', async function(next) {
  if (!this.incidentId) {
    const count = await mongoose.model('Incident').countDocuments();
    this.incidentId = `INC-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Calculate priority based on severity and impact
incidentSchema.pre('save', function(next) {
  if (this.isModified('severity') || this.isModified('impact')) {
    const severityWeight = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };
    
    const impactWeight = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };
    
    const totalWeight = severityWeight[this.severity] + impactWeight[this.impact];
    
    if (totalWeight >= 7) {
      this.priority = 'critical';
    } else if (totalWeight >= 5) {
      this.priority = 'high';
    } else if (totalWeight >= 3) {
      this.priority = 'medium';
    } else {
      this.priority = 'low';
    }
  }
  next();
});

// Add work log entry for status changes
incidentSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.workLogs.push({
      action: `Status changed to ${this.status}`,
      user: this.assignee?.user || this.reporter.user,
      isSystemGenerated: true
    });
  }
  next();
});

// Indexes for better query performance
incidentSchema.index({ incidentId: 1 });
incidentSchema.index({ status: 1 });
incidentSchema.index({ severity: 1 });
incidentSchema.index({ priority: 1 });
incidentSchema.index({ category: 1 });
incidentSchema.index({ 'reporter.user': 1 });
incidentSchema.index({ 'assignee.user': 1 });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ updatedAt: -1 });

export default mongoose.model('Incident', incidentSchema);