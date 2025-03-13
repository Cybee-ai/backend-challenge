import Source from "../../../data/models/Source.js"
import { Worker } from "bullmq"
import { redisConnection } from '../config/redis-connection.js';
import logger from '../../utils/logger.js';
import {checkSourceCredentialsExpired} from '../../utils/credentials.service.js'
import { credentialsExpirationEmail } from "../../utils/email.js";

export const CREDENTIAL_EXPIRATION_JOB_NAME = "credentialsExpirationJob";
// eslint-disable-next-line no-unused-vars
export const credentialsExpirationJob = async (job) => {
    try {

        logger.info('checking credentials...');
        // make an exception for my test credentials
        const sources = await Source.find({ 
            expired: false, 
            id: { $ne: "bff552d1-4ac2-45f8-8ffe-a09accfd0d26" } 
        });
        
        if(sources.length === 0){
            return;
        }

        for(const source of sources){

            const result = await checkSourceCredentialsExpired(source);

            if (result.error) {
                await Source.updateOne(
                    { id: source.id }, 
                    { 
                        $set: { expired: true } 
                    }
                );

                const credentials = source.getDecryptedData();
                
                if(credentials && credentials.clientEmail){
                    await credentialsExpirationEmail(source.id, credentials.clientEmail)
                }
            }
        }


    }
    catch (error) {
        logger.error(error)
    }
}




