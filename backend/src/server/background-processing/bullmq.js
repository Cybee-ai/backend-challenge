import { Queue, Worker } from 'bullmq';
import {scheduleLogFetchingJobs} from './log-fetching-scheduler.js'
import { redisConnection } from './redis-connection.js';


export const logFetchingSchedulerQueue = new Queue('log-fetching-scheduler', { connection: redisConnection });

await logFetchingSchedulerQueue.upsertJobScheduler(
    'check-source-entries', 
    {
      every: 3000, 
    },
    {
      data: {},
      opts: {
        removeOnComplete: true
      }, 
    }
  );
  
  new Worker(
    'log-fetching-scheduler',
    async job => await scheduleLogFetchingJobs(job),
    { connection: redisConnection }
  );



export const sourceJobsQueue = new Queue('source-jobs', { connection: redisConnection });