import config from "../config/config";

/**
 * Logger class for standardized logging across the application
 * Provides different log levels and handles sensitive information
 */
export class Logger {
  private context: string;
  private isDev: boolean;

  /**
   * Create a new Logger instance
   * @param context The context/component name for this logger
   */
  constructor(context: string) {
    this.context = context;
    this.isDev = config.NODE_ENV === "dev";
  }

  /**
   * Log an informational message
   * @param message The message to log
   * @param data Optional data to include
   */
  info(message: string, data?: any): void {
    this.log("INFO", "ℹ️", message, data);
  }

  /**
   * Log a success message
   * @param message The message to log
   * @param data Optional data to include
   */
  success(message: string, data?: any): void {
    this.log("SUCCESS", "✅", message, data);
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param data Optional data to include
   */
  warn(message: string, data?: any): void {
    this.log("WARN", "⚠️", message, data);
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param error Optional error to include
   */
  error(message: string, error?: any): void {
    this.log("ERROR", "❌", message, error);

    // In production, we could send errors to a monitoring service
    if (!this.isDev && error) {
      // Example: send to error monitoring service
      // errorMonitoringService.captureException(error);
    }
  }

  /**
   * Internal method to format and output logs
   */
  private log(level: string, emoji: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `${emoji} [${timestamp}] [${level}] [${this.context}] ${message}`;

    if (data && !this.containsSensitiveInfo(data)) {
      console.log(logMessage, data);
    } else if (data && this.containsSensitiveInfo(data)) {
      console.log(logMessage, "[SENSITIVE DATA REDACTED]");
    } else {
      console.log(logMessage);
    }

    // In production, we could send logs to a centralized logging service
    if (!this.isDev) {
      // Example: send to logging service
      // loggingService.log({ level, message, context: this.context, timestamp, data });
    }
  }

  /**
   * Check if data contains sensitive information
   * @param data The data to check
   * @returns True if data contains sensitive information
   */
  private containsSensitiveInfo(data: any): boolean {
    // Check if data contains sensitive information like credentials
    const stringData = JSON.stringify(data);
    return (
      stringData.includes("privateKey") ||
      stringData.includes("clientEmail") ||
      stringData.includes("password") ||
      stringData.includes("secret") ||
      stringData.includes("token") ||
      stringData.includes("apiKey")
    );
  }
}
