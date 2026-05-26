import { env } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    let metaString = '';
    if (meta) {
      if (meta instanceof Error) {
        metaString = ` | error: ${meta.message}\n${meta.stack}`;
      } else {
        metaString = ` | meta: ${JSON.stringify(meta)}`;
      }
    }
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
  }

  public info(message: string, meta?: any): void {
    console.log(this.formatMessage('info', message, meta));
  }

  public warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  public error(message: string, meta?: any): void {
    console.error(this.formatMessage('error', message, meta));
  }

  public debug(message: string, meta?: any): void {
    if (env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = new Logger();
