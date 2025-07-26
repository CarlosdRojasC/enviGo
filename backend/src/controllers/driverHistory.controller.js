// backend/src/controllers/driverHistory.controller.js - VERSIÓN CON DEBUG
const DriverHistoryService = require('../services/driverHistory.service');
const DriverHistory = require('../models/DriveryHistory');
const mongoose = require('mongoose');

class DriverHistoryController {

  // ==================== MÉTODO DE PRUEBA ====================
  
  /**
   * Método simple para probar que la clase funciona
   */
  async testMethod(req, res) {
    try {
      console.log('🔥 TEST METHOD FUNCIONANDO');
      console.log('🔥 MÉTODOS DISPONIBLES:', Object.getOwnPropertyNames(this));
      
      res.json({
        success: true,
        message: 'Test exitoso',
        methods: Object.getOwnPropertyNames(this),
        hasGroupMethod: typeof this.groupDeliveriesByDriverGlobal === 'function'
      });
    } catch (error) {
      console.error('❌ Error en test:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== MÉTODO PRINCIPAL SIMPLIFICADO ====================

  async getAllDeliveriesForPayments(req, res) {
    try {
      console.log('🔥 INICIANDO getAllDeliveriesForPayments');
      console.log('🔥 THIS:', typeof this);
      console.log('🔥 MÉTODOS EN THIS:', Object.getOwnPropertyNames(this));
      
      const { 
        date_from, 
        date_to, 
        driver_id, 
        company_id, 
        payment_status = 'pending' 
      } = req.query;

      console.log('🔥 QUERY PARAMS:', { date_from, date_to, driver_id, company_id, payment_status });

      // Filtros base
      const filters = {};

      // Filtro por fechas
      if (date_from || date_to) {
        filters.delivered_at = {};
        if (date_from) filters.delivered_at.$gte = new Date(date_from);
        if (date_to) filters.delivered_at.$lte = new Date(date_to + 'T23:59:59.999Z');
      }

      // Filtro por conductor específico
      if (driver_id) {
        filters.driver_id = driver_id;
      }

      // Filtro por empresa (opcional)
      if (company_id) {
        filters.company_id = new mongoose.Types.ObjectId(company_id);
      }

      // Filtro por estado de pago
      if (payment_status && payment_status !== 'all') {
        filters.payment_status = payment_status;
      }

      console.log('🔥 FILTROS APLICADOS:', filters);

      // Obtener entregas
      const deliveries = await DriverHistory.find(filters)
        .populate('company_id', 'name email phone')
        .populate('order_id', 'order_number customer_name total_amount')
        .sort({ delivered_at: -1 })
        .lean();

      console.log('🔥 ENTREGAS ENCONTRADAS:', deliveries.length);

      // VERIFICAR ANTES DE USAR EL MÉTODO
      console.log('🔥 VERIFICANDO MÉTODO groupDeliveriesByDriverGlobal');
      console.log('🔥 TIPO:', typeof this.groupDeliveriesByDriverGlobal);
      console.log('🔥 EXISTE:', 'groupDeliveriesByDriverGlobal' in this);

      // Usar método directo en lugar de this
      const driverGroups = this.groupDeliveriesByDriverGlobal ? 
        this.groupDeliveriesByDriverGlobal(deliveries) : 
        groupDeliveriesByDriverGlobalDirect(deliveries);

      console.log('🔥 DRIVERS AGRUPADOS:', driverGroups.length);

      // Estadísticas simples
      const stats = this.calculateGlobalDriverStats ? 
        this.calculateGlobalDriverStats(deliveries) : 
        calculateGlobalDriverStatsDirect(deliveries);

      console.log('🔥 STATS CALCULADAS:', stats);

      res.json({
        success: true,
        data: {
          period: { date_from, date_to },
          filters: { driver_id, company_id, payment_status },
          stats,
          drivers: driverGroups,
          deliveries: deliveries.map(delivery => ({
            id: delivery._id,
            driver_id: delivery.driver_id,
            driver_name: delivery.driver_name,
            driver_email: delivery.driver_email,
            order_number: delivery.order_number,
            customer_name: delivery.customer_name,
            delivery_address: delivery.delivery_address,
            delivered_at: delivery.delivered_at,
            payment_amount: delivery.payment_amount,
            payment_status: delivery.payment_status,
            paid_at: delivery.paid_at,
            company: {
              id: delivery.company_id?._id,
              name: delivery.company_id?.name || 'Empresa Desconocida'
            }
          }))
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo entregas globales:', error);
      console.error('❌ STACK TRACE:', error.stack);
      res.status(500).json({ 
        success: false, 
        error: 'Error obteniendo entregas para pagos',
        details: error.message,
        stack: error.stack
      });
    }
  }

  // ==================== MÉTODOS AUXILIARES CON VERIFICACIÓN ====================

  groupDeliveriesByDriverGlobal(deliveries) {
    console.log('🔥 EJECUTANDO groupDeliveriesByDriverGlobal');
    
    const drivers = {};

    deliveries.forEach(delivery => {
      const driverId = delivery.driver_id;
      const driverName = delivery.driver_name;
      const driverEmail = delivery.driver_email;

      if (!drivers[driverId]) {
        drivers[driverId] = {
          driver_id: driverId,
          driver_name: driverName,
          driver_email: driverEmail,
          total_deliveries: 0,
          total_amount: 0,
          pending_amount: 0,
          paid_amount: 0,
          companies_served: new Set(),
          deliveries: []
        };
      }

      drivers[driverId].total_deliveries += 1;
      drivers[driverId].total_amount += delivery.payment_amount;
      
      if (delivery.payment_status === 'pending') {
        drivers[driverId].pending_amount += delivery.payment_amount;
      } else {
        drivers[driverId].paid_amount += delivery.payment_amount;
      }

      if (delivery.company_id) {
        drivers[driverId].companies_served.add(delivery.company_id.name || 'Empresa Desconocida');
      }

      drivers[driverId].deliveries.push(delivery._id);
    });

    return Object.values(drivers).map(driver => ({
      ...driver,
      companies_served: Array.from(driver.companies_served),
      companies_count: driver.companies_served.length
    }));
  }

  calculateGlobalDriverStats(deliveries) {
    console.log('🔥 EJECUTANDO calculateGlobalDriverStats');
    
    const totalDeliveries = deliveries.length;
    const totalAmount = deliveries.reduce((sum, d) => sum + d.payment_amount, 0);
    
    const pendingDeliveries = deliveries.filter(d => d.payment_status === 'pending');
    const pendingAmount = pendingDeliveries.reduce((sum, d) => sum + d.payment_amount, 0);
    
    const uniqueDrivers = new Set(deliveries.map(d => d.driver_id)).size;
    const uniqueCompanies = new Set(deliveries.map(d => d.company_id?._id?.toString()).filter(Boolean)).size;

    return {
      total_deliveries: totalDeliveries,
      total_amount: totalAmount,
      pending_deliveries: pendingDeliveries.length,
      pending_amount: pendingAmount,
      paid_deliveries: totalDeliveries - pendingDeliveries.length,
      paid_amount: totalAmount - pendingAmount,
      unique_drivers: uniqueDrivers,
      unique_companies: uniqueCompanies,
      average_per_delivery: totalDeliveries > 0 ? totalAmount / totalDeliveries : 0,
      average_per_driver: uniqueDrivers > 0 ? totalAmount / uniqueDrivers : 0
    };
  }
}

// ==================== FUNCIONES AUXILIARES DIRECTAS (BACKUP) ====================

function groupDeliveriesByDriverGlobalDirect(deliveries) {
  console.log('🔥 USANDO FUNCIÓN DIRECTA groupDeliveriesByDriverGlobalDirect');
  
  const drivers = {};

  deliveries.forEach(delivery => {
    const driverId = delivery.driver_id;
    const driverName = delivery.driver_name;
    const driverEmail = delivery.driver_email;

    if (!drivers[driverId]) {
      drivers[driverId] = {
        driver_id: driverId,
        driver_name: driverName,
        driver_email: driverEmail,
        total_deliveries: 0,
        total_amount: 0,
        pending_amount: 0,
        paid_amount: 0,
        companies_served: new Set(),
        deliveries: []
      };
    }

    drivers[driverId].total_deliveries += 1;
    drivers[driverId].total_amount += delivery.payment_amount;
    
    if (delivery.payment_status === 'pending') {
      drivers[driverId].pending_amount += delivery.payment_amount;
    } else {
      drivers[driverId].paid_amount += delivery.payment_amount;
    }

    if (delivery.company_id) {
      drivers[driverId].companies_served.add(delivery.company_id.name || 'Empresa Desconocida');
    }

    drivers[driverId].deliveries.push(delivery._id);
  });

  return Object.values(drivers).map(driver => ({
    ...driver,
    companies_served: Array.from(driver.companies_served),
    companies_count: driver.companies_served.length
  }));
}

function calculateGlobalDriverStatsDirect(deliveries) {
  console.log('🔥 USANDO FUNCIÓN DIRECTA calculateGlobalDriverStatsDirect');
  
  const totalDeliveries = deliveries.length;
  const totalAmount = deliveries.reduce((sum, d) => sum + d.payment_amount, 0);
  
  const pendingDeliveries = deliveries.filter(d => d.payment_status === 'pending');
  const pendingAmount = pendingDeliveries.reduce((sum, d) => sum + d.payment_amount, 0);
  
  const uniqueDrivers = new Set(deliveries.map(d => d.driver_id)).size;
  const uniqueCompanies = new Set(deliveries.map(d => d.company_id?._id?.toString()).filter(Boolean)).size;

  return {
    total_deliveries: totalDeliveries,
    total_amount: totalAmount,
    pending_deliveries: pendingDeliveries.length,
    pending_amount: pendingAmount,
    paid_deliveries: totalDeliveries - pendingDeliveries.length,
    paid_amount: totalAmount - pendingAmount,
    unique_drivers: uniqueDrivers,
    unique_companies: uniqueCompanies,
    average_per_delivery: totalDeliveries > 0 ? totalAmount / totalDeliveries : 0,
    average_per_driver: uniqueDrivers > 0 ? totalAmount / uniqueDrivers : 0
  };
}

module.exports = new DriverHistoryController();