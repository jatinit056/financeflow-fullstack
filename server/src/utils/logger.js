import { config } from '../config/env.js';

/**
 * Tiny structured-ish logger. Silent during tests so test output stays readable.
 * Swap for pino/winston if the app grows; call sites stay the same.
 */
const write = (level, message, meta) => {
  if (config.isTest) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  const out = level === 'error' ? console.error : console.log;
  if (meta === undefined) out(line);
  else out(line, meta);
};

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
