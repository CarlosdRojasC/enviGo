import { api } from './api'

export const scannerService = {
  
  /**
   * Obtener clientes/empresas disponibles para el scanner
   */
  getCompanyClients() {
    console.log('📋 API: Obteniendo clientes para scanner')
    return api.get('/scanner/clients')
  },

  /**
   * Procesar código de barras de MercadoLibre
   */
  processMLBarcode(formData) {
    console.log('📦 API: Procesando código de barras ML')
    return api.post('/scanner/process-ml-barcode', formData, {
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
    return api.post('/scanner/finalize-session', sessionData)
  },

  /**
   * Obtener estadísticas del scanner para una empresa
   */
  getMLStats(companyId = null) {
    console.log('📊 API: Obteniendo estadísticas ML')
    const endpoint = companyId ? `/scanner/stats/${companyId}` : '/scanner/stats'
    return api.get(endpoint)
  }
}