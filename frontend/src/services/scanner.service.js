import { api } from './api'

export const scannerService = {
  
  /**
   * Obtener clientes/empresas disponibles para el scanner
   */
  getCompanyClients() {
    console.log('📋 API: Obteniendo clientes para scanner')
    return api.get('/driver-scanner/public-clients')
  },
processMLLabel(formData) {
  console.log('📸 API: Procesando etiqueta ML con OCR')
  return api.post('/driver-scanner/process-ml-label', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
},
  /**
   * Procesar código de barras de MercadoLibre
   */
  processMLBarcode(formData) {
    console.log('📦 API: Procesando código de barras ML')
    return api.post('/driver-scanner/process-ml-barcode', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * Finalizar sesión de escaneo
   */
  finalizeSession(sessionData) {
    console.log('✅ API: Finalizando sesión de scanner')
    return api.post('/driver-scanner/finalize-session', sessionData)
  },

  /**
   * Obtener estadísticas del scanner para una empresa
   */
  getMLStats(companyId = null) {
    console.log('📊 API: Obteniendo estadísticas ML')
    const endpoint = companyId ? `/driver-scanner/stats/${companyId}` : '/driver-scanner/stats'
    return api.get(endpoint)
  }
}