const Source = require('../models/Source');
const { encrypt } = require('../services/encryptionService');
const googleWorkspaceService = require('../services/googleWorkspaceService');
const { scheduleLogFetcherJob } = require('../jobs/queueProcessor');
const logger = require('../utils/logger');

const validateAndSetupSource = async (source, credentials) => {
  try {
    const isValid = await googleWorkspaceService.validateCredentials(credentials);
    if (!isValid) {
      await Source.findByIdAndUpdate(source._id, { status: 'invalid_credentials' });
      logger.error('Credential validation failed for source:', source._id);
      return;
    }

    await Source.findByIdAndUpdate(source._id, { status: 'active' });
    await scheduleLogFetcherJob(source);
    logger.info('Source setup completed successfully:', source._id);
  } catch (error) {
    logger.error('Source setup failed:', error);
    await Source.findByIdAndUpdate(source._id, { 
      status: 'setup_failed',
      lastError: error.message
    });
  }
};

const addSource = async (req, reply) => {
  try {
    const { sourceType, credentials, logFetchInterval, callbackUrl } = req.body;
    
    const newSource = new Source({
      sourceType,
      credentials: encrypt(JSON.stringify(credentials)),
      callbackUrl,
      logFetchInterval,
      lastFetchTime: new Date('2024-01-01'),
      status: 'validating'
    });

    await newSource.save();
    validateAndSetupSource(newSource, credentials).catch(err => 
      logger.error('Background validation failed:', err)
    );

    return reply.status(201).send({
      message: 'Source added successfully',
      sourceId: newSource._id,
      status: 'Credentials validation in progress'
    });
  } catch (error) {
    logger.error('Failed to add source:', error);
    throw error;
  }
};

const removeSource = async (req, reply) => {
  try {
    const { id } = req.params;
    const source = await Source.findById(id);
    
    if (!source) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Source not found'
      });
    }

    await source.remove();
    logger.info('Source removed successfully:', id);
    
    return reply.send({
      message: 'Source removed successfully',
      sourceId: id
    });
  } catch (error) {
    logger.error('Failed to remove source:', error);
    throw error;
  }
};

const getSources = async (req, reply) => {
  try {
    const sources = await Source.find({}, {
      _id: 1,
      sourceType: 1,
      status: 1,
      callbackUrl: 1,
      logFetchInterval: 1,
      lastFetchTime: 1,
      lastError: 1
    });

    return reply.send({
      sources: sources.map(source => ({
        id: source._id,
        type: source.sourceType,
        status: source.status,
        callbackUrl: source.callbackUrl,
        logFetchInterval: source.logFetchInterval,
        lastFetchTime: source.lastFetchTime,
        lastError: source.lastError
      }))
    });
  } catch (error) {
    logger.error('Failed to get sources:', error);
    throw error;
  }
};

module.exports = {
  addSource,
  removeSource,
  getSources
};
