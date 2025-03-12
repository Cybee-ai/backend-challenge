import Source from "../../data/models/Source.js"
import {sourceJobsQueue, logFetchingSchedulerQueue} from './bullmq.js'
import { Worker } from "bullmq"
import { redisConnection } from './redis-connection.js';
import axios from "axios";
import { handleLogFetch } from "./callback-api-handler.js";
import logger from './logger.js';

export const scheduleLogFetchingJobs = async (job) => {
    try{

        const sources = await Source.find();
    
        if(sources.length === 0){
            logger.info('no sources to schedule for now...');
            return;
        }

        const waitingJobs = await sourceJobsQueue.getJobs(['waiting']);
        const activeJobs = await sourceJobsQueue.getJobs(['active']);
        const delayedJobs = await sourceJobsQueue.getJobs(['delayed']);
        
        const allJobs = [...waitingJobs, ...activeJobs, ...delayedJobs];
    
        for(const source of sources){
    
            const jobId = `source-${source.id}`;

            const existingJob = allJobs.find(job => job.name === jobId)
    
            if (existingJob) {
                continue;
            }

            await sourceJobsQueue.upsertJobScheduler(jobId, 
                {
                    every: source.logFetchInterval * 1000
                },
                {
                    data: {id: source.id}
                }
            )
    
            logger.info(`Scheduled job for source ${source.id} (Interval: ${source.logFetchInterval}s)`);
        }

    } catch (error)
    {
        logger.error(error)
    }
}

const worker = new Worker(
    'source-jobs',
    async job => await handleLogFetch(job),
    { connection: redisConnection }
  );


