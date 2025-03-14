import { CREDENTIAL_EXPIRATION_JOB_NAME, credentialsExpirationJob } from "../jobs/credential-expiration-job.js";
import {SOURCE_JOBS_QUEUE_NAME} from '../queues/source-queue.js'
import { handleLogFetch } from "../jobs/callback-api-handler-job.js";
import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis-connection.js';

export const worker = new Worker(
    SOURCE_JOBS_QUEUE_NAME,
    async job => {
      if (job.name === CREDENTIAL_EXPIRATION_JOB_NAME) {
        await credentialsExpirationJob(job);
        return;
      } 
       else {
        console.log(`Unknown job type: ${job.name}`);
      }
    },
    { connection: redisConnection }
  );

