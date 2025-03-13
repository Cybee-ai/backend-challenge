import { google } from 'googleapis';
import logger from './logger.js'

export const checkSourceCredentialsExpired = async (source) => {
    try {
        const credentials = JSON.parse(source.getDecryptedData());

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: credentials.clientEmail,
                private_key: credentials.privateKey
            },
            scopes: credentials.scopes
        });

        const client = await auth.getClient();
        await client.getAccessToken();

        // So far, credentials look valid!
        return {
            error: '',
            validated: true
        };
    } catch (error) {
        logger.error(error)
        return {
            error: error.message,
            validated: false
        };
    }
}

export const checkCredentialsExpired = async (credentials) => {
    try {        
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: credentials.clientEmail,
                private_key: credentials.privateKey
            },
            scopes: credentials.scopes
        });

        const client = await auth.getClient();
        await client.getAccessToken();

        // So far, credentials look valid!
        return {
            error: '',
            validated: true
        };
    } catch (error) {
        logger.error(error)
        return {
            error: error.message,
            validated: false
        };
    }
}