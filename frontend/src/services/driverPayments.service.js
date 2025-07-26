// frontend/src/services/driverPayments.js
import { api } from './api'

export const driverPaymentsService = {
  
  // ==================== MÉTODOS GLOBALES (SOLO ADMINS) ====================
  
  /**
   * Obtener TODAS las entregas de TODOS los conductores de EnviGo
   * Solo para admins
   */
  getAllDeliveries: (params = {}) => {
    console.log('📦 API: Obteniendo entregas globales de EnviGo');
    return api.get('/driver-history/all-deliveries', { params });
  },

  /**
   * Obtener resumen global de pagos pendientes
   * Solo para admins
   */
  getGlobalPaymentSummary: (params = {}) => {
    console.log('💰 API: Obteniendo resumen global de pagos');
    return api.get('/driver-history/global-payment-summary', { params });
  },

  /**
   * Obtener todos los conductores activos de EnviGo
   * Solo para admins
   */
  getAllActiveDrivers: (params = {}) => {
    console.log('👥 API: Obteniendo todos los conductores activos');
    return api.get('/driver-history/all-active-drivers', { params });
  },

  // ==================== MÉTODOS POR EMPRESA ====================

  /**
   * Obtener entregas de conductores para una empresa específica
   * Para admins y company_owners
   */
  getCompanyDeliveries: (companyId, params = {}) => {
    console.log('🏢 API: Obteniendo entregas de empresa específica');
    return api.get(`/driver-history/company/${companyId}/deliveries`, { params });
  },

  /**
   * Obtener conductores activos de una empresa
   */
  getCompanyActiveDrivers: (companyId, params = {}) => {
    console.log('👥 API: Obteniendo conductores activos de empresa');
    return api.get(`/driver-history/company/${companyId}/active-drivers`, { params });
  },

  /**
   * Obtener reporte mensual de una empresa
   */
  getCompanyMonthlyReport: (companyId, params = {}) => {
    console.log('📊 API: Obteniendo reporte mensual de empresa');
    return api.get(`/driver-history/company/${companyId}/monthly-report`, { params });
  },

  /**
   * Obtener estadísticas de entregas de una empresa
   */
  getCompanyStats: (companyId, params = {}) => {
    console.log('📈 API: Obteniendo estadísticas de empresa');
    return api.get(`/driver-history/company/${companyId}/stats`, { params });
  },

  // ==================== MÉTODOS DE CONDUCTORES INDIVIDUALES ====================

  /**
   * Obtener historial completo de un conductor
   * Solo para admins
   */
  getDriverHistory: (driverId, params = {}) => {
    console.log('📋 API: Obteniendo historial de conductor');
    return api.get(`/driver-history/driver/${driverId}`, { params });
  },

  /**
   * Obtener entregas pendientes de un conductor
   * Solo para admins
   */
  getDriverPendingPayments: (driverId, params = {}) => {
    console.log('⏳ API: Obteniendo pagos pendientes de conductor');
    return api.get(`/driver-history/driver/${driverId}/pending`, { params });
  },

  /**
   * Pagar todas las entregas pendientes de un conductor
   * Solo para admins
   */
  payAllPendingToDriver: (driverId, companyId = null) => {
    console.log('💸 API: Pagando todas las entregas pendientes');
    const body = companyId ? { companyId } : {};
    return api.post(`/driver-history/driver/${driverId}/pay-all`, body);
  },

  // ==================== MÉTODOS DE PAGOS ====================

  /**
   * Marcar entregas específicas como pagadas
   * Solo para admins
   */
  markDeliveriesAsPaid: (deliveryIds, notes = '') => {
    console.log('✅ API: Marcando entregas como pagadas');
    return api.post('/driver-history/mark-paid', { 
      deliveryIds,
      notes 
    });
  },

  // ==================== EXPORTACIÓN ====================

  /**
   * Exportar reporte a Excel
   * Solo para admins
   */
  exportPaymentsToExcel: (params = {}) => {
    console.log('📊 API: Exportando pagos a Excel');
    return api.get('/driver-history/export-excel', { 
      params,
      responseType: 'blob'
    });
  },

  // ==================== MÉTODOS HELPER ====================

  /**
   * Método inteligente que decide qué endpoint usar según el rol del usuario
   * Para mantener compatibilidad con componentes existentes
   */
  getDeliveredOrders: (params = {}, userRole = 'admin', companyId = null) => {
    if (userRole === 'admin') {
      // Los admins ven todo globalmente
      console.log('📦 API: Admin - obteniendo entregas globales');
      return api.get('/driver-history/all-deliveries', { params });
    } else if (userRole === 'company_owner' && companyId) {
      // Los company_owners solo ven su empresa
      console.log('🏢 API: Company Owner - obteniendo entregas de su empresa');
      return api.get(`/driver-history/company/${companyId}/deliveries`, { params });
    } else {
      throw new Error('Rol no autorizado para ver entregas');
    }
  },

  /**
   * Método inteligente para resumen de pagos
   */
  getPaymentSummary: (params = {}, userRole = 'admin', companyId = null) => {
    if (userRole === 'admin') {
      console.log('💰 API: Admin - obteniendo resumen global');
      return api.get('/driver-history/global-payment-summary', { params });
    } else if (userRole === 'company_owner' && companyId) {
      console.log('🏢 API: Company Owner - obteniendo resumen de su empresa');
      // Para company_owners, usar el endpoint de empresa pero solo para vista
      return api.get(`/driver-history/company/${companyId}/deliveries`, { 
        params: { ...params, payment_status: 'pending' }
      });
    } else {
      throw new Error('Rol no autorizado para ver resumen de pagos');
    }
  }
};