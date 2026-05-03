import fs from 'fs'
import path from 'path'

const LOG_DIR = path.join(process.cwd(), 'logs')
const MAX_LOG_AGE_DAYS = 7

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'security'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  meta?: Record<string, any>
}

function cleanOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR)
    const now = Date.now()
    const maxAge = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000

    files.forEach((file) => {
      const filePath = path.join(LOG_DIR, file)
      const stats = fs.statSync(filePath)
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath)
      }
    })
  } catch (error) {
    // Ignore errors in cleanup
  }
}

function writeLog(entry: LogEntry) {
  try {
    const date = new Date().toISOString().split('T')[0]
    const logFile = path.join(LOG_DIR, `${date}.log`)
    const logLine = JSON.stringify(entry) + '\n'

    fs.appendFileSync(logFile, logLine)

    if (entry.level === 'error' || entry.level === 'security') {
      console.error(`[${entry.level.toUpperCase()}]`, entry.message, entry.meta || '')
    }
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

export const logger = {
  error: (message: string, meta?: Record<string, any>) => {
    writeLog({ timestamp: new Date().toISOString(), level: 'error', message, meta })
  },
  warn: (message: string, meta?: Record<string, any>) => {
    writeLog({ timestamp: new Date().toISOString(), level: 'warn', message, meta })
  },
  info: (message: string, meta?: Record<string, any>) => {
    writeLog({ timestamp: new Date().toISOString(), level: 'info', message, meta })
  },
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      writeLog({ timestamp: new Date().toISOString(), level: 'debug', message, meta })
    }
  },
  security: (message: string, meta?: Record<string, any>) => {
    writeLog({ timestamp: new Date().toISOString(), level: 'security', message, meta })
  },
}

cleanOldLogs()