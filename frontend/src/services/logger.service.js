class Logger {
  constructor() {
    this.isDev = import.meta.env.DEV
    this.isDebugEnabled = import.meta.env.VITE_DEBUG === 'true'
  }

  /**
   * Log solo en desarrollo
   */
  dev(...args) {
    if (this.isDev) {
      console.log(...args)
    }
  }

  /**
   * Log solo si DEBUG está habilitado
   */
  debug(...args) {
    if (this.isDebugEnabled) {
      console.log(...args)
    }
  }

  /**
   * Warnings siempre se muestran
   */
  warn(...args) {
    console.warn(...args)
  }

  /**
   * Errores siempre se muestran
   */
  error(...args) {
    console.error(...args)
  }

  /**
   * Info importante siempre se muestra
   */
  info(...args) {
    console.info(...args)
  }

  /**
   * Logs de éxito solo en desarrollo
   */
  success(...args) {
    if (this.isDev) {
      console.log('✅', ...args)
    }
  }

  /**
   * Logs de proceso solo en desarrollo
   */
  process(...args) {
    if (this.isDev) {
      console.log('🔄', ...args)
    }
  }

  /**
   * Group logs solo en desarrollo
   */
  group(label) {
    if (this.isDev) {
      console.group(label)
    }
  }

  groupEnd() {
    if (this.isDev) {
      console.groupEnd()
    }
  }

  /**
   * Sanitizar datos sensibles antes de hacer log
   */
  sanitize(data) {
    if (!this.isDev) return '[HIDDEN]'
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data }
      
      // Remover campos sensibles
      const sensitiveFields = [
        'password', 'token', 'api_key', 'secret', 'auth',
        'authorization', 'jwt', 'session', 'cookie'
      ]
      
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[HIDDEN]'
        }
      })
      
      return sanitized
    }
    
    return data
  }
}

export const logger = new Logger()