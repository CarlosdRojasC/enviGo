// frontend/src/services/utils.service.js
import { debounce, throttle, groupBy, orderBy, uniqBy, chunk, isEmpty, isEqual, cloneDeep } from 'lodash-es'

/**
 * 🛠️ Servicio de Utilidades para enviGo
 * Centraliza funciones comunes y optimizaciones de performance
 */
export class UtilsService {
  
  // ==================== DEBOUNCE & THROTTLE ====================
  
  /**
   * Crear función debounced para búsquedas
   * @param {Function} func - Función a ejecutar
   * @param {number} delay - Delay en ms (default: 300)
   * @returns {Function}
   */
  static createDebouncedSearch(func, delay = 300) {
    return debounce(func, delay, {
      leading: false,
      trailing: true
    })
  }

  /**
   * Crear función throttled para eventos frecuentes (scroll, resize)
   * @param {Function} func - Función a ejecutar
   * @param {number} limit - Límite en ms (default: 100)
   * @returns {Function}
   */
  static createThrottledHandler(func, limit = 100) {
    return throttle(func, limit, {
      leading: true,
      trailing: false
    })
  }

  // ==================== MANIPULACIÓN DE DATOS ====================

  /**
   * Agrupar pedidos por criterio
   * @param {Array} orders - Array de pedidos
   * @param {string} key - Clave para agrupar
   * @returns {Object}
   */
  static groupOrdersBy(orders, key) {
    return groupBy(orders, key)
  }

  /**
   * Ordenar datos con múltiples criterios
   * @param {Array} data - Datos a ordenar
   * @param {Array} keys - Claves de ordenamiento
   * @param {Array} orders - Direcciones ('asc'|'desc')
   * @returns {Array}
   */
  static sortData(data, keys, orders = ['asc']) {
    return orderBy(data, keys, orders)
  }

  /**
   * Eliminar duplicados por clave única
   * @param {Array} array - Array con posibles duplicados
   * @param {string} key - Clave única
   * @returns {Array}
   */
  static removeDuplicates(array, key = 'id') {
    return uniqBy(array, key)
  }

  /**
   * Dividir array en chunks para paginación
   * @param {Array} array - Array a dividir
   * @param {number} size - Tamaño de cada chunk
   * @returns {Array}
   */
  static chunkArray(array, size = 10) {
    return chunk(array, size)
  }

  // ==================== VALIDACIONES ====================

  /**
   * Verificar si un objeto está vacío
   * @param {any} value - Valor a verificar
   * @returns {boolean}
   */
  static isEmpty(value) {
    return isEmpty(value)
  }

  /**
   * Comparación profunda de objetos
   * @param {any} value1 - Primer valor
   * @param {any} value2 - Segundo valor
   * @returns {boolean}
   */
  static isEqual(value1, value2) {
    return isEqual(value1, value2)
  }

  /**
   * Clonar objeto profundamente
   * @param {any} obj - Objeto a clonar
   * @returns {any}
   */
  static deepClone(obj) {
    return cloneDeep(obj)
  }

  // ==================== FORMATEO DE DATOS ====================

  /**
   * Formatear moneda chilena
   * @param {number} amount - Monto a formatear
   * @returns {string}
   */
  static formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '$0'
    
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Formatear fecha relativa
   * @param {Date|string} date - Fecha a formatear
   * @returns {string}
   */
  static formatRelativeDate(date) {
    const now = new Date()
    const targetDate = new Date(date)
    const diff = now - targetDate
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    
    return targetDate.toLocaleDateString('es-CL')
  }

  /**
   * Formatear número con separadores de miles
   * @param {number} num - Número a formatear
   * @returns {string}
   */
  static formatNumber(num) {
    if (!num || isNaN(num)) return '0'
    
    return new Intl.NumberFormat('es-CL').format(num)
  }

  // ==================== UTILIDADES DE CACHE ====================

  /**
   * Crear cache con TTL
   * @param {number} ttl - Time to live en ms
   * @returns {Object}
   */
  static createCache(ttl = 300000) { // 5 minutos por defecto
    const cache = new Map()
    
    return {
      get(key) {
        const item = cache.get(key)
        if (!item) return null
        
        if (Date.now() > item.expiry) {
          cache.delete(key)
          return null
        }
        
        return item.value
      },
      
      set(key, value) {
        cache.set(key, {
          value,
          expiry: Date.now() + ttl
        })
      },
      
      delete(key) {
        cache.delete(key)
      },
      
      clear() {
        cache.clear()
      },
      
      size() {
        return cache.size
      }
    }
  }

  // ==================== VALIDACIONES DE NEGOCIO ====================

  /**
   * Validar RUT chileno
   * @param {string} rut - RUT a validar
   * @returns {boolean}
   */
  static validateRUT(rut) {
    if (!rut || typeof rut !== 'string') return false
    
    // Limpiar RUT
    const cleanRut = rut.replace(/[^0-9kK]/g, '').toLowerCase()
    
    if (cleanRut.length < 8) return false
    
    const body = cleanRut.slice(0, -1)
    const dv = cleanRut.slice(-1)
    
    // Calcular dígito verificador
    let sum = 0
    let multiplier = 2
    
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier
      multiplier = multiplier === 7 ? 2 : multiplier + 1
    }
    
    const expectedDv = 11 - (sum % 11)
    let calculatedDv = expectedDv === 11 ? '0' : expectedDv === 10 ? 'k' : expectedDv.toString()
    
    return dv === calculatedDv
  }

  /**
   * Validar email
   * @param {string} email - Email a validar
   * @returns {boolean}
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validar teléfono chileno
   * @param {string} phone - Teléfono a validar
   * @returns {boolean}
   */
  static validatePhone(phone) {
    const phoneRegex = /^(\+56|56)?([2-9]\d{8}|9\d{8})$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  // ==================== UTILIDADES DE URL ====================

  /**
   * Construir query string
   * @param {Object} params - Parámetros
   * @returns {string}
   */
  static buildQueryString(params) {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, value)
      }
    })
    
    return searchParams.toString()
  }

  /**
   * Parsear query string
   * @param {string} queryString - Query string
   * @returns {Object}
   */
  static parseQueryString(queryString) {
    const params = new URLSearchParams(queryString)
    const result = {}
    
    for (const [key, value] of params) {
      result[key] = value
    }
    
    return result
  }

  // ==================== PERFORMANCE UTILITIES ====================

  /**
   * Crear un observador de performance
   * @param {string} name - Nombre de la métrica
   * @returns {Object}
   */
  static createPerformanceObserver(name) {
    const startTime = performance.now()
    
    return {
      end() {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        console.log(`⏱️ Performance [${name}]: ${duration.toFixed(2)}ms`)
        
        return duration
      }
    }
  }

  /**
   * Delay asíncrono
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise}
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ==================== UTILIDADES DE ARRAY ====================

  /**
   * Batching de operaciones asíncronas
   * @param {Array} items - Items a procesar
   * @param {Function} processor - Función procesadora
   * @param {number} batchSize - Tamaño del batch
   * @param {number} delay - Delay entre batches
   * @returns {Promise<Array>}
   */
  static async processBatches(items, processor, batchSize = 10, delay = 100) {
    const batches = this.chunkArray(items, batchSize)
    const results = []
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(processor)
      )
      
      results.push(...batchResults)
      
      if (delay > 0) {
        await this.delay(delay)
      }
    }
    
    return results
  }

  // ==================== GESTIÓN DE ERRORES ====================

  /**
   * Wrapper para manejo de errores async/await
   * @param {Promise} promise - Promise a ejecutar
   * @returns {Promise<[Error|null, any]>}
   */
  static async safeAsync(promise) {
    try {
      const data = await promise
      return [null, data]
    } catch (error) {
      return [error, null]
    }
  }

  /**
   * Retry automático con backoff exponencial
   * @param {Function} fn - Función a ejecutar
   * @param {number} maxRetries - Máximo número de reintentos
   * @param {number} baseDelay - Delay base en ms
   * @returns {Promise}
   */
  static async retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        
        if (i === maxRetries) {
          throw lastError
        }
        
        const delay = baseDelay * Math.pow(2, i) // Backoff exponencial
        await this.delay(delay)
      }
    }
  }
}

// ==================== COMPOSABLES HELPERS ====================

/**
 * Composable para debounced search
 * @param {Function} searchFn - Función de búsqueda
 * @param {number} delay - Delay en ms
 * @returns {Object}
 */
export function useDebouncedSearch(searchFn, delay = 300) {
  const debouncedFn = UtilsService.createDebouncedSearch(searchFn, delay)
  
  return {
    search: debouncedFn,
    cancel: debouncedFn.cancel
  }
}

/**
 * Composable para manejo de cache
 * @param {number} ttl - Time to live
 * @returns {Object}
 */
export function useCache(ttl = 300000) {
  return UtilsService.createCache(ttl)
}

/**
 * Composable para performance monitoring
 * @param {string} name - Nombre de la métrica
 * @returns {Object}
 */
export function usePerformance(name) {
  return UtilsService.createPerformanceObserver(name)
}

export default UtilsService