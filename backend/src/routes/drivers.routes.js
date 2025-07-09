const express = require('express');
const router = express.Router();
const {
  authenticateToken,
  isAdmin,
  isCompanyOwner,
  hasCompanyAccess
} = require('../middlewares/auth.middleware');

router.get('/driver-orders', authenticateToken, async (req, res) => {
  try {
    const { 
      driver_id, 
      status, 
      date, 
      company_id,
      page = 1, 
      limit = 50 
    } = req.query;

    console.log('📊 Obteniendo vista de pedidos de conductores...');

    // 1. Obtener órdenes de Shipday con conductores asignados
    const shipdayOrders = await ShipdayService.getOrders();
    console.log(`📦 Órdenes de Shipday: ${shipdayOrders.length}`);

    // 2. Filtrar solo órdenes con conductor asignado
    const ordersWithDrivers = shipdayOrders.filter(order => 
      order.carrierId || order.carrierEmail
    );

    console.log(`👨‍💼 Órdenes con conductor: ${ordersWithDrivers.length}`);

    // 3. Obtener información adicional de la base de datos local
    const shipdayOrderIds = ordersWithDrivers.map(o => o.orderId?.toString()).filter(Boolean);
    
    const localOrders = await Order.find({
      shipday_order_id: { $in: shipdayOrderIds }
    })
    .populate('company_id', 'name')
    .lean();

    console.log(`💾 Órdenes locales encontradas: ${localOrders.length}`);

    // 4. Combinar datos de Shipday con datos locales
    let combinedOrders = ordersWithDrivers.map(shipdayOrder => {
      const localOrder = localOrders.find(lo => 
        lo.shipday_order_id === shipdayOrder.orderId?.toString()
      );

      // Mapear estado de Shipday a nuestro sistema
      const mappedStatus = mapShipdayStatusToLocal(shipdayOrder.orderStatus);

      return {
        // IDs
        id: shipdayOrder.orderId,
        shipday_order_id: shipdayOrder.orderId,
        local_order_id: localOrder?._id,

        // Información básica del pedido
        order_number: shipdayOrder.orderNumber || localOrder?.order_number || `SD-${shipdayOrder.orderId}`,
        customer_name: shipdayOrder.customerName,
        customer_phone: shipdayOrder.customerPhoneNumber,
        delivery_address: shipdayOrder.deliveryAddress,
        
        // Estado y tracking
        status: mappedStatus,
        shipday_status: shipdayOrder.orderStatus,
        tracking_url: shipdayOrder.trackingUrl,
        
        // Información del conductor
        driver: shipdayOrder.carrierId ? {
          id: shipdayOrder.carrierId,
          shipday_id: shipdayOrder.carrierId,
          name: shipdayOrder.carrierName || 'Conductor Sin Nombre',
          email: shipdayOrder.carrierEmail,
          phone: shipdayOrder.carrierPhoneNumber,
          status: determineDriverStatus(shipdayOrder)
        } : null,

        // Tiempos (Shipday)
        assigned_time: shipdayOrder.assignedTime ? new Date(shipdayOrder.assignedTime) : null,
        pickup_time: shipdayOrder.pickedupTime ? new Date(shipdayOrder.pickedupTime) : null,
        delivery_time: shipdayOrder.deliveryTime ? new Date(shipdayOrder.deliveryTime) : null,
        estimated_delivery: shipdayOrder.estimatedDeliveryTime ? new Date(shipdayOrder.estimatedDeliveryTime) : null,
        
        // Información financiera (local)
        total_amount: localOrder?.total_amount,
        shipping_cost: localOrder?.shipping_cost,
        
        // Información de la empresa (local)
        company: localOrder?.company_id ? {
          id: localOrder.company_id._id || localOrder.company_id,
          name: localOrder.company_id.name || 'Empresa Desconocida'
        } : null,

        // Información de entrega
        delivery_location: {
          formatted_address: shipdayOrder.deliveryAddress,
          // Coordenadas si están disponibles en Shipday
          lat: shipdayOrder.deliveryLat,
          lng: shipdayOrder.deliveryLng
        },

        // Prueba de entrega
        proof_of_delivery: localOrder?.proof_of_delivery || null,

        // Fechas
        order_date: localOrder?.order_date || shipdayOrder.placementTime,
        created_at: localOrder?.created_at || shipdayOrder.placementTime,
        updated_at: localOrder?.updated_at || new Date()
      };
    });

    // 5. Aplicar filtros
    if (driver_id) {
      combinedOrders = combinedOrders.filter(order => 
        order.driver?.id === driver_id || order.driver?.shipday_id === driver_id
      );
    }

    if (status) {
      combinedOrders = combinedOrders.filter(order => order.status === status);
    }

    if (date) {
      const filterDate = new Date(date);
      const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999));
      
      combinedOrders = combinedOrders.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate >= startOfDay && orderDate <= endOfDay;
      });
    }

    if (company_id && req.user.role !== 'admin') {
      // Si no es admin, filtrar por empresa
      combinedOrders = combinedOrders.filter(order => 
        order.company?.id?.toString() === company_id
      );
    }

    // 6. Ordenar por fecha más reciente primero
    combinedOrders.sort((a, b) => {
      const dateA = new Date(a.assigned_time || a.order_date);
      const dateB = new Date(b.assigned_time || b.order_date);
      return dateB - dateA;
    });

    // 7. Paginación
    const total = combinedOrders.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = combinedOrders.slice(startIndex, endIndex);

    // 8. Calcular estadísticas
    const stats = calculateDriverOrderStats(combinedOrders);

    // 9. Obtener lista de conductores únicos para filtros
    const uniqueDrivers = getUniqueDriversFromOrders(combinedOrders);

    console.log(`✅ Vista de conductores preparada: ${paginatedOrders.length}/${total} órdenes`);

    res.json({
      success: true,
      data: {
        orders: paginatedOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: endIndex < total,
          hasPrev: page > 1
        },
        stats,
        filters: {
          drivers: uniqueDrivers,
          statuses: [
            { value: 'assigned', label: 'Asignado', count: combinedOrders.filter(o => o.status === 'assigned').length },
            { value: 'picked_up', label: 'Recogido', count: combinedOrders.filter(o => o.status === 'picked_up').length },
            { value: 'in_transit', label: 'En Tránsito', count: combinedOrders.filter(o => o.status === 'in_transit').length },
            { value: 'delivered', label: 'Entregado', count: combinedOrders.filter(o => o.status === 'delivered').length }
          ]
        },
        last_updated: new Date(),
        data_sources: {
          shipday_orders: shipdayOrders.length,
          local_orders: localOrders.length,
          combined_orders: total
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo pedidos de conductores:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo pedidos de conductores',
      details: error.message
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Mapea estados de Shipday a nuestro sistema local
 */
function mapShipdayStatusToLocal(shipdayStatus) {
  const statusMap = {
    'assigned': 'assigned',
    'pickedup': 'picked_up', 
    'in_transit': 'in_transit',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'pending': 'pending'
  };
  
  return statusMap[shipdayStatus?.toLowerCase()] || 'unknown';
}

/**
 * Determina el estado del conductor basado en la información de Shipday
 */
function determineDriverStatus(shipdayOrder) {
  // Si tiene una orden asignada activa, está ocupado
  if (['assigned', 'pickedup', 'in_transit'].includes(shipdayOrder.orderStatus)) {
    return 'busy';
  }
  
  // Si completó una entrega recientemente, está disponible
  if (shipdayOrder.orderStatus === 'delivered') {
    return 'available';
  }
  
  return 'unknown';
}

/**
 * Calcula estadísticas para la vista de conductores
 */
function calculateDriverOrderStats(orders) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  
  // Conductores únicos activos
  const activeDrivers = new Set(
    orders
      .filter(o => o.driver && ['assigned', 'picked_up', 'in_transit'].includes(o.status))
      .map(o => o.driver.id)
  ).size;
  
  // Órdenes en tránsito
  const ordersInTransit = orders.filter(o => 
    ['assigned', 'picked_up', 'in_transit'].includes(o.status)
  ).length;
  
  // Entregados hoy
  const deliveredToday = orders.filter(o => {
    if (o.status !== 'delivered' || !o.delivery_time) return false;
    const deliveryDate = new Date(o.delivery_time);
    return deliveryDate >= startOfDay;
  }).length;
  
  // Total de órdenes
  const totalOrders = orders.length;
  
  // Órdenes por estado
  const ordersByStatus = {
    assigned: orders.filter(o => o.status === 'assigned').length,
    picked_up: orders.filter(o => o.status === 'picked_up').length,
    in_transit: orders.filter(o => o.status === 'in_transit').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };
  
  return {
    activeDrivers,
    ordersInTransit,
    deliveredToday,
    totalOrders,
    ordersByStatus,
    efficiency: totalOrders > 0 ? Math.round((deliveredToday / totalOrders) * 100) : 0
  };
}

/**
 * Extrae conductores únicos para usar en filtros
 */
function getUniqueDriversFromOrders(orders) {
  const driversMap = new Map();
  
  orders.forEach(order => {
    if (order.driver) {
      driversMap.set(order.driver.id, {
        id: order.driver.id,
        name: order.driver.name,
        email: order.driver.email,
        active_orders: orders.filter(o => 
          o.driver?.id === order.driver.id && 
          ['assigned', 'picked_up', 'in_transit'].includes(o.status)
        ).length
      });
    }
  });
  
  return Array.from(driversMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ==================== ESTADÍSTICAS EN TIEMPO REAL ====================

/**
 * Endpoint para obtener solo estadísticas actualizadas (para auto-refresh)
 */
router.get('/driver-orders/stats', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas rápidas de conductores...');
    
    // Obtener datos básicos de Shipday
    const shipdayOrders = await ShipdayService.getOrders();
    const ordersWithDrivers = shipdayOrders.filter(order => 
      order.carrierId || order.carrierEmail
    );
    
    // Mapear a nuestro formato básico
    const mappedOrders = ordersWithDrivers.map(order => ({
      status: mapShipdayStatusToLocal(order.orderStatus),
      driver_id: order.carrierId,
      delivery_time: order.deliveryTime
    }));
    
    const stats = calculateDriverOrderStats(mappedOrders);
    
    res.json({
      success: true,
      stats,
      last_updated: new Date(),
      orders_count: mappedOrders.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});
module.exports = router;