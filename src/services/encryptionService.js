const crypto = require('crypto');
const config = require('../config/config');
const logger = require('../utils/logger');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_ITERATIONS = 100000;
const KEY_DIGEST = 'sha512';

class EncryptionService {
  constructor() {
    if (!config.security.encryptionKey) {
      throw new Error('Encryption key is required');
    }
    this.initialize();
  }

  initialize() {
    try {
      const salt = crypto.randomBytes(SALT_LENGTH);
      this.key = crypto.pbkdf2Sync(
        config.security.encryptionKey,
        salt,
        KEY_ITERATIONS,
        KEY_LENGTH,
        KEY_DIGEST
      );
      this.salt = salt;
      logger.info('Encryption service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize encryption service:', error);
      throw new Error('Encryption service initialization failed');
    }
  }

  encrypt(text) {
    try {
      if (!text) {
        throw new Error('Text to encrypt is required');
      }

      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      return Buffer.concat([
        this.salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]).toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedText) {
    try {
      if (!encryptedText) {
        throw new Error('Encrypted text is required');
      }

      const buffer = Buffer.from(encryptedText, 'base64');
      
      const salt = buffer.slice(0, SALT_LENGTH);
      const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const authTag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

      const key = crypto.pbkdf2Sync(
        config.security.encryptionKey,
        salt,
        KEY_ITERATIONS,
        KEY_LENGTH,
        KEY_DIGEST
      );

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  verifyEncryption(text) {
    const encrypted = this.encrypt(text);
    const decrypted = this.decrypt(encrypted);
    return text === decrypted;
  }
}

const encryptionService = new EncryptionService();

module.exports = {
  encrypt: (text) => encryptionService.encrypt(text),
  decrypt: (text) => encryptionService.decrypt(text),
  verifyEncryption: (text) => encryptionService.verifyEncryption(text)
};
