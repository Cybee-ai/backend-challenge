import Source from "../../../data/models/Source.js"
import logger from '../../utils/logger.js';
import { logFetchingQueue } from "../queues/log-fetching-queue.js";

// eslint-disable-next-line no-unused-vars
export const scheduleLogFetchingJobs = async (job) => {
    try{

        const sources = await Source.find();
    
        if(sources.length === 0){
            logger.info('no sources to schedule for now...');
            return;
        }

        const waitingJobs = await logFetchingQueue.getJobs(['waiting']);
        const activeJobs = await logFetchingQueue.getJobs(['active']);
        const delayedJobs = await logFetchingQueue.getJobs(['delayed']);
        
        const allJobs = [...waitingJobs, ...activeJobs, ...delayedJobs];
    
        for(const source of sources){
    
            const jobId = `process-source-logs-${source.id}`;

            const existingJob = allJobs.find(job => job.name === jobId)
    
            if (existingJob) {
                continue;
            }

            await logFetchingQueue.upsertJobScheduler(jobId, 
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


