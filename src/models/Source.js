const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const sourceSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
    immutable: true
  },
  sourceType: {
    type: String,
    required: true,
    enum: ['google_workspace'],
    index: true
  },
  credentials: {
    type: String,
    required: true,
    select: false
  },
  logFetchInterval: {
    type: Number,
    required: true,
    min: 1,
    max: 3600,
    default: 60,
    validate: {
      validator: Number.isInteger,
      message: 'Log fetch interval must be an integer'
    }
  },
  callbackUrl: {
    type: String,
    required: true,
    validate: {
      validator: (v) => {
        try {
          new URL(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: 'Invalid callback URL format'
    }
  },
  status: {
    type: String,
    enum: ['validating', 'active', 'invalid_credentials', 'setup_failed', 'error'],
    default: 'validating',
    index: true
  },
  lastFetchTime: {
    type: Date,
    default: () => new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    validate: {
      validator: (v) => v instanceof Date && !isNaN(v),
      message: 'Invalid date format for lastFetchTime'
    }
  },
  lastError: {
    type: String,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastSuccessfulFetch: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

sourceSchema.index({ sourceType: 1, callbackUrl: 1 }, { unique: true });
sourceSchema.index({ status: 1, createdAt: 1 });
sourceSchema.index({ lastFetchTime: 1 });

sourceSchema.virtual('isHealthy').get(function() {
  if (this.status !== 'active') return false;
  if (!this.lastSuccessfulFetch) return false;
  
  const hoursSinceLastSuccess = (Date.now() - this.lastSuccessfulFetch) / (1000 * 60 * 60);
  return hoursSinceLastSuccess <= 24;
});

sourceSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.credentials;
  delete obj.__v;
  return obj;
};

sourceSchema.methods.incrementRetryCount = async function() {
  this.retryCount += 1;
  return this.save();
};

sourceSchema.methods.resetRetryCount = async function() {
  this.retryCount = 0;
  this.lastSuccessfulFetch = new Date();
  return this.save();
};

sourceSchema.methods.updateStatus = async function(status, error = null) {
  this.status = status;
  this.lastError = error;
  return this.save();
};

sourceSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

sourceSchema.statics.findByTypeAndUrl = function(sourceType, callbackUrl) {
  return this.findOne({ sourceType, callbackUrl });
};

sourceSchema.statics.findStale = function(hours = 24) {
  const staleDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    lastSuccessfulFetch: { $lt: staleDate }
  });
};

sourceSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'active') {
    this.lastError = null;
  }
  next();
});

const Source = mongoose.model('Source', sourceSchema);

module.exports = Source;