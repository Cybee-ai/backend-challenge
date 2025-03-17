export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

export interface SuccessResponse<T> {
  statusCode: number;
  data: T;
}

export enum SourceType {
  GOOGLE_WORKSPACE = 'google_workspace',
}

export interface GoogleWorkspaceCredentials {
  clientEmail: string;
  privateKey: string;
  scopes: string[];
}

export interface SourceConfig {
  id: string;
  sourceType: SourceType;
  credentials: GoogleWorkspaceCredentials;
  logFetchInterval: number; // in seconds
  callbackUrl: string;
}

export interface GoogleWorkspaceLogActor {
  email: string;
  ipAddress: string;
}

export interface GoogleWorkspaceLogDetails {
  status: string;
  [key: string]: any;
}

export interface GoogleWorkspaceLog {
  id: string;
  timestamp: string;
  actor: GoogleWorkspaceLogActor;
  eventType: string;
  details: GoogleWorkspaceLogDetails;
  sourceId: string;
}

export interface LogBatch {
  sourceId: string;
  logs: GoogleWorkspaceLog[];
} 