import mongoose from 'mongoose';

export interface ILog {
  sourceId: mongoose.Types.ObjectId;
  externalId: string;
  timestamp: Date;
  actorEmail: string;
  actorIpAddress: string;
  eventType: string;
  status: string;
  details: Record<string, any>;
  processedAt: Date;
  sentToCallback: boolean;
  callbackAttempts: number;
  lastCallbackAttempt: Date | null;
}

export interface ILogDocument extends ILog, mongoose.Document {}

const LogSchema = new mongoose.Schema<ILogDocument>(
  {
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
      required: true,
      index: true,
    },
    externalId: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      required: true,
      index: true,
    },
    actorIpAddress: {
      type: String,
      required: false, // Might not always be available
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: false,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    sentToCallback: {
      type: Boolean,
      default: false,
      index: true, // Useful for querying logs that need to be sent
    },
    callbackAttempts: {
      type: Number,
      default: 0,
    },
    lastCallbackAttempt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for deduplication
LogSchema.index({ sourceId: 1, externalId: 1 }, { unique: true });

// Create and export the Log model
const Log = mongoose.model<ILogDocument>('Log', LogSchema);

export default Log; 