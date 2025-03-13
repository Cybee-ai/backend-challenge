import Source from "../../../data/models/Source.js";
import axios from "axios";
import axiosRetry from "axios-retry";
import logger from "../../utils/logger.js";
import Log from "../../../data/models/Log.js";
import {checkSourceCredentialsExpired} from '../../utils/credentials.service.js'

axiosRetry(axios, { 
  retries: 3,
  retryCondition: (error) => {
    return error.response && (
      error.response.status === 429 || 
      error.response.status === 503 || 
      error.response.status === 500 ||
      error.response.status === 400
  );
  },
  retryDelay: (retryCount, error) => {
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        logger.info(`Retrying after ${parseInt(retryAfter)} milliseconds`)
        return parseInt(retryAfter);
      }
    }
    return Math.pow(2, retryCount) * 1000;
  },
  onRetry: (retryCount, error, requestConfig) => {
    var data = JSON.parse(requestConfig.data);
    logger.warn(`Encountered error: ${error.message}. Retrying... Attempt ${retryCount} for request: ${data.id}`);
    return;
  },
  onMaxRetryTimesExceeded: async (error, retryCount) => {
    logger.error(error, 'Max retries exceeded for request');
    var log = JSON.parse(error.config.data);

    await Log.updateOne(
      { id: log.id }, 
      { $set: 
        {
          id: log.id,
          retryCount: retryCount,
          message: error.message,
          status:'failed'
        }
     }, 
      { upsert: true }
    );
      
    return;
  }
  
});

export const handleLogFetch = async (job) => {
    try {
      const {id} = job.data;

      var source = await Source.findOne({id: id});

      if(!source){
          logger.warn('no source found.')
          job.remove();
      }

      logger.info(`processing source...id: ${id}`);
  
      // call google api
      // validate credentials first
      // ignore my own special id for now
      if(source.id !== 'bff552d1-4ac2-45f8-8ffe-a09accfd0d26'){
        const result = await checkSourceCredentialsExpired(source);

        if (result.error) {
            await Source.updateOne(
                { id: source.id }, 
                { 
                    $set: { expired: true } 
                }
            );
            return;
        }
      }

      
      // let's pretend api returned successfully. logs are my deserialized response
      const logs = generateLogs();

      for (const log of logs) {
          try {
            const dbLog = Log.findOne({id:log.id});

            if(dbLog && dbLog.status === 'successful') {
              logger.info(`Log with id = ${dbLog.id} has already been processed before`);
              continue;
            }

            // add additional cases. For logs that have failed over three times, we may want a different handle. For now, let's just retry them.

            logger.info('sending request...' + log.id);
            const response = await axios.post(source.callbackUrl, log);
            logger.info('received response');
            if(response.status === 200){
                logger.info(`log with id ${log.id} was successfully processed`);
                await Log.updateOne(
                  { id: log.id }, 
                  { $set: 
                    {
                      id: log.id,
                      payload: log,
                      status:'successful'
                    }
                }, 
                  { upsert: true }
                );
                
            }
          } catch (error){
            logger.error(error, `log with id ${log.id} was not processed successfully`);
          }
      }

      logger.info('success!');
    }
    catch (error) {
      logger.error(error);
    }

  }

  // to-do: remove once unblocked
  const generateLogs = () => {
    let logs = [];

    for (let i = 0; i < 5000; i++) {
      const log = {
        id: `log-id-${i + 1}`,
        timestamp: new Date().toISOString(),  // Current timestamp
        actor: {
          email: `user${Math.floor(Math.random() * 1000)}@example.com`,  // Random email
          ipAddress: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`  // Random IP address
        },
        eventType: Math.random() > 0.5 ? 'LOGIN' : 'LOGOUT',  // Random LOGIN or LOGOUT event
        details: {
          status: Math.random() > 0.5 ? 'SUCCESS' : 'FAILURE'  // Random status: SUCCESS or FAILURE
        }
      };
      logs.push(log);
    }   

    return logs;
  }