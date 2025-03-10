import { google, admin_reports_v1 } from 'googleapis';
import { GoogleWorkspaceCredentials } from '../types/common';
import { JWT } from 'google-auth-library';

/**
 * Creates a Google API client using JWT authentication
 */
export const createGoogleClient = async (credentials: GoogleWorkspaceCredentials): Promise<JWT> => {
  const { clientEmail, privateKey, scopes } = credentials;
  
  const jwtClient = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: scopes,
  });
  
  // Verify credentials by attempting to get a token
  try {
    await jwtClient.authorize();
    return jwtClient;
  } catch (error) {
    throw new Error(`Failed to authenticate with Google: ${(error as Error).message}`);
  }
};

/**
 * Creates a Google Admin Reports API client
 */
export const createReportsApiClient = (auth: JWT): admin_reports_v1.Admin => {
  return google.admin({
    version: 'reports_v1',
    auth
  });
};

/**
 * Fetches logs from Google Workspace Admin Reports API
 * Implements exponential backoff for rate limits
 */
export const fetchGoogleWorkspaceLogs = async (
  auth: JWT,
  startTime: Date,
  endTime: Date = new Date(),
  maxRetries = 5,
  initialBackoff = 1000
): Promise<admin_reports_v1.Schema$Activity[]> => {
  const reportsClient = createReportsApiClient(auth);
  let retries = 0;
  
  const fetchLogs = async (): Promise<admin_reports_v1.Schema$Activity[]> => {
    try {
      // Format dates as required by Google API (ISO 8601)
      const startTimeStr = startTime.toISOString();
      const endTimeStr = endTime.toISOString();
      
      const response = await reportsClient.activities.list({
        userKey: 'all',
        applicationName: 'admin',
        startTime: startTimeStr,
        endTime: endTimeStr,
        maxResults: 1000, // Maximum allowed by Google API
      });
      
      if (!response.data.items) {
        return [];
      }
      
      return response.data.items;
    } catch (error) {
      const err = error as { code?: number; message?: string; errors?: Array<{ reason?: string }> };
      
      // Handle rate limiting (429) or server errors (5xx)
      if (
        (err.code === 429 || (err.code && err.code >= 500 && err.code < 600)) &&
        retries < maxRetries
      ) {
        retries++;
        const backoffTime = initialBackoff * Math.pow(2, retries - 1);
        
        console.log(`Rate limit hit, backing off for ${backoffTime}ms (retry ${retries}/${maxRetries})`);
        
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        return fetchLogs(); // Retry with exponential backoff
      }
      
      // Detect credential issues
      if (err.code === 401 || err.code === 403) {
        throw new Error(`Authorization error: ${err.message || 'Unknown auth error'}`);
      }
      
      // Other errors
      throw new Error(`Failed to fetch logs: ${err.message || 'Unknown error'}`);
    }
  };
  
  return fetchLogs();
};

/**
 * Transform Google Workspace Activities into a consistent format
 */
export const transformGoogleWorkspaceLogs = (
  activities: admin_reports_v1.Schema$Activity[],
  sourceId: string
): Array<{
  id: string;
  timestamp: string;
  actor: { email: string; ipAddress: string };
  eventType: string;
  details: { status: string; [key: string]: any };
  sourceId: string;
}> => {
  return activities.map((activity) => {
    // Fix for the id property and timestamp extraction
    const activityId = typeof activity.id === 'string' 
      ? activity.id 
      : `generated-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Get timestamp from the id object if it exists there
    let timestamp: string;
    if (typeof activity.id === 'object' && activity.id && 'time' in activity.id) {
      timestamp = String(activity.id.time || new Date().toISOString());
    } else {
      timestamp = new Date().toISOString();
    }
    
    const { actor, events } = activity;
    
    // Get the first event (activities usually have at least one event)
    const event = events && events.length > 0 ? events[0] : { name: 'unknown', parameters: [] };
    
    // Extract status from parameters
    const params = event.parameters || [];
    const statusParam = params.find((p) => p.name === 'status');
    const status = statusParam ? (statusParam.value as string) : 'UNKNOWN';
    
    // Convert parameters to a key-value object
    const details: { status: string; [key: string]: any } = {
      status,
    };
    
    params.forEach((param) => {
      if (param.name && param.value) {
        details[param.name] = param.value;
      }
    });
    
    // Safely extract actor information
    const actorEmail = actor?.email || 'unknown';
    // The ipAddress might be in various fields depending on the API version
    // Try common locations based on API documentation
    let ipAddress = 'unknown';
    if (actor && typeof actor === 'object') {
      // Try to extract from any available property that might contain IP
      if ('callerIp' in actor && actor.callerIp) {
        ipAddress = String(actor.callerIp);
      } else if ('ipAddress' in actor && actor.ipAddress) {
        ipAddress = String(actor.ipAddress);
      } else if ('profileId' in actor && actor.profileId) {
        // Sometimes IP might be encoded in the profileId
        ipAddress = String(actor.profileId);
      }
    }
    
    return {
      id: activityId,
      timestamp,
      actor: {
        email: actorEmail,
        ipAddress,
      },
      eventType: event.name || 'unknown',
      details,
      sourceId,
    };
  });
}; 