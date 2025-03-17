import mongoose from 'mongoose';
import CryptoJS from 'crypto-js';
import { SourceType } from '../types/common';

const encryptionKey = process.env.ENCRYPTION_KEY || 'default_encryption_key';

// Encrypt sensitive data before saving
const encryptField = (value: string): string => {
  if (!value) return value;
  return CryptoJS.AES.encrypt(value, encryptionKey).toString();
};

// Decrypt data when retrieving
const decryptField = (encryptedValue: string): string => {
  if (!encryptedValue) return encryptedValue;
  const bytes = CryptoJS.AES.decrypt(encryptedValue, encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export interface ISource {
  sourceType: SourceType;
  credentialsClientEmail: string;
  credentialsPrivateKey: string;
  credentialsScopes: string[];
  logFetchInterval: number;
  callbackUrl: string;
  lastFetchTimestamp: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISourceDocument extends ISource, mongoose.Document {
  getDecryptedCredentials(): {
    clientEmail: string;
    privateKey: string;
    scopes: string[];
  };
}

const SourceSchema = new mongoose.Schema<ISourceDocument>(
  {
    sourceType: {
      type: String,
      enum: Object.values(SourceType),
      required: true,
    },
    credentialsClientEmail: {
      type: String,
      required: true,
      set: encryptField,
    },
    credentialsPrivateKey: {
      type: String,
      required: true,
      set: encryptField,
    },
    credentialsScopes: [{
      type: String,
      required: true,
    }],
    logFetchInterval: {
      type: Number,
      required: true,
      default: 300, // 5 minutes
      min: 60, // 1 minute minimum
    },
    callbackUrl: {
      type: String,
      required: true,
      validate: {
        validator: (value: string) => {
          try {
            new URL(value);
            return true;
          } catch (e) {
            return false;
          }
        },
        message: 'Invalid URL format for callbackUrl',
      },
    },
    lastFetchTimestamp: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to get decrypted credentials
SourceSchema.methods.getDecryptedCredentials = function(): {
  clientEmail: string;
  privateKey: string;
  scopes: string[];
} {
  return {
    clientEmail: decryptField(this.credentialsClientEmail),
    privateKey: decryptField(this.credentialsPrivateKey),
    scopes: this.credentialsScopes,
  };
};

// Hide sensitive fields when converted to JSON
SourceSchema.set('toJSON', {
  transform: (_, ret) => {
    // Don't expose the encrypted values in JSON
    delete ret.credentialsClientEmail;
    delete ret.credentialsPrivateKey;
    // Add safer version (showing only that credentials exist)
    ret.hasCredentials = true;
    return ret;
  },
});

// Create and export the Source model
const Source = mongoose.model<ISourceDocument>('Source', SourceSchema);

export default Source; 