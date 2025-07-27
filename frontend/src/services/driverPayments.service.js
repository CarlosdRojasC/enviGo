// frontend/src/services/driverPayments.service.js
// VERSIÓN ACTUALIZADA Y CORREGIDA

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
   * Método de test para debuggear
   */
  testDriverSystem: (params = {}) => {
    console.log('🧪 API: Ejecutando test del sistema de conductores');
    return api.get('/driver-history/test', { params });
  },

  /**
   * Crear registros en DriverHistory desde órdenes existentes
   */
  createHistoryFromOrders: () => {
    console.log('🔄 API: Creando registros históricos desde órdenes');
    return api.post('/driver-history/create-from-orders');
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
  markDeliveriesAsPaid: (deliveryIds, paymentNote = '') => {
    console.log('✅ API: Marcando entregas como pagadas');
    return api.post('/driver-history/mark-as-paid', {
      deliveryIds,
      paymentNote
    });
  },

  /**
   * Obtener historial de pagos
   * Solo para admins
   */
  getPaymentHistory: (params = {}) => {
    console.log('📜 API: Obteniendo historial de pagos');
    return api.get('/driver-history/payment-history', { params });
  },

  // ==================== EXPORTACIÓN Y REPORTES ====================

  /**
   * Exportar reporte de pagos a Excel
   * Solo para admins
   */
  exportPaymentsToExcel: (params = {}) => {
    console.log('📊 API: Exportando reporte a Excel');
    return api.get('/driver-history/export-excel', { 
      params,
      responseType: 'blob'
    });
  },

  /**
   * Generar reporte de pagos en PDF
   * Solo para admins
   */
  generatePaymentReportPDF: (params = {}) => {
    console.log('📄 API: Generando reporte PDF');
    return api.get('/driver-history/export-pdf', { 
      params,
      responseType: 'blob'
    });
  },

  // ==================== MÉTODOS DE CONFIGURACIÓN ====================

  /**
   * Obtener configuración de pagos
   * Solo para admins
   */
  getPaymentSettings: () => {
    console.log('⚙️ API: Obteniendo configuración de pagos');
    return api.get('/driver-history/settings');
  },

  /**
   * Actualizar configuración de pagos
   * Solo para admins
   */
  updatePaymentSettings: (settings) => {
    console.log('⚙️ API: Actualizando configuración de pagos');
    return api.put('/driver-history/settings', settings);
  }
}