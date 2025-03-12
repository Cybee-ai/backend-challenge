import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); 
const IV_LENGTH = 16; 

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }
  
  function decrypt(text) {
    const [ivHex, encryptedText] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

const sourceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, 
  sourceType: {type: String, required: true},
  callbackUrl: {type: String, required: true},
  logFetchInterval: {type: Number, required: true, min: 0,     
    validate: {
      validator: Number.isInteger, 
      message: 'logFetchInterval must be an integer',
    },
  },
  credentials: { type: String, required: true }, 
}, { timestamps: true });

sourceSchema.pre('save', function (next) {
    if (this.isModified('credentials')) {
      this.credentials = encrypt(this.credentials);
    }
    next();
  });
  
sourceSchema.methods.getDecryptedData = function () {
    return decrypt(this.credentials);
  };
  
const Source = mongoose.model('Source', sourceSchema);
  
export default Source;