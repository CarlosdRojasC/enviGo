// backend/src/services/routeOptimizer.service.js - CÓDIGO COMPLETO MEJORADO

const axios = require('axios');
const RoutePlan = require('../models/RoutePlan');
const Order = require('../models/Order');
const { Client } = require("@googlemaps/google-maps-services-js");

class RouteOptimizerService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    console.log("API Key Cargada:", this.googleApiKey ? "Sí" : "¡NO!");
    this.pythonOptimizerUrl = process.env.PYTHON_OPTIMIZER_URL || 'http://localhost:5001/optimize';
    this.googleMapsClient = new Client({});
  }

  // ==================== MÉTODOS MEJORADOS PARA EL FRONTEND ====================

  /**
   * ✅ NUEVO: Obtener rutas con órdenes pobladas para el frontend
   */
  async getRoutesWithPopulatedOrders(companyId, filters = {}) {
    try {
      const query = { company: companyId, ...filters };
      
      console.log(`📋 Obteniendo rutas pobladas para empresa: ${companyId}`);
      
      const routes = await RoutePlan.find(query)
        .populate('driver', 'full_name name email phone')
        .populate({
          path: 'orders.order',
          select: 'order_number customer_name customer_phone shipping_address shipping_commune location total_amount status notes',
          populate: {
            path: 'location',
            select: 'latitude longitude'
          }
        })
        .populate('company', 'name address')
        .sort({ createdAt: -1 });

      // ✅ ENRIQUECER con información formateada para el frontend
      const enrichedRoutes = routes.map(route => {
        const routeObj = route.toObject();
        
        // Formatear distancia y duración desde optimization
        if (routeObj.optimization) {
          const distanceKm = (routeObj.optimization.totalDistance || 0) / 1000;
          const durationMinutes = Math.round((routeObj.optimization.totalDuration || 0) / 60);
          
          routeObj.routeInfo = {
            distance: distanceKm >= 1 
              ? `${distanceKm.toFixed(1)} km` 
              : `${routeObj.optimization.totalDistance || 0} m`,
            duration: durationMinutes >= 60 
              ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min` 
              : `${durationMinutes} min`,
            totalDistanceKm: distanceKm,
            totalDurationMinutes: durationMinutes,
            hasPolyline: !!routeObj.optimization.overview_polyline,
            algorithm: routeObj.optimization.algorithm || 'or-tools'
          };
        } else {
          routeObj.routeInfo = {
            distance: '',
            duration: '',
            totalDistanceKm: 0,
            totalDurationMinutes: 0,
            hasPolyline: false,
            algorithm: 'unknown'
          };
        }

        // ✅ PREPARAR datos para mapa
        routeObj.mapData = {
          hasValidCoordinates: routeObj.orders.every(o => 
            o.order?.location?.latitude && o.order?.location?.longitude
          ),
          totalStops: routeObj.orders.length,
          completedStops: routeObj.orders.filter(o => o.deliveryStatus === 'delivered').length
        };

        // Agregar información adicional útil
        routeObj.totalPackages = routeObj.orders ? routeObj.orders.length : 0;

        return routeObj;
      });

      console.log(`✅ ${enrichedRoutes.length} rutas enriquecidas obtenidas`);
      return enrichedRoutes;

    } catch (error) {
      console.error('❌ Error obteniendo rutas pobladas:', error);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Obtener una ruta completa por ID con datos para el mapa
   */
  async getRouteById(routeId, includeProofDetails = true) {
    try {
      console.log(`🔍 Obteniendo ruta completa: ${routeId}`);

      const populateFields = [
        {
          path: 'driver',
          select: 'full_name name email phone avatar'
        },
        {
          path: 'orders.order',
          select: 'order_number customer_name customer_phone shipping_address shipping_commune location total_amount status notes',
        },
        {
          path: 'company',
          select: 'name address'
        }
      ];

      if (includeProofDetails) {
        populateFields.push({
          path: 'orders.proof.deliveredBy',
          select: 'full_name name'
        });
      }

      const route = await RoutePlan.findById(routeId).populate(populateFields);

      if (!route) {
        throw new Error('Ruta no encontrada');
      }

      const routeObj = route.toObject();

      // ✅ ENRIQUECER con progreso de entregas
      routeObj.deliveryProgress = {
        total: routeObj.orders.length,
        completed: routeObj.orders.filter(o => o.deliveryStatus === 'delivered').length,
        pending: routeObj.orders.filter(o => o.deliveryStatus === 'pending').length,
        inProgress: routeObj.orders.filter(o => o.deliveryStatus === 'in_progress').length,
        failed: routeObj.orders.filter(o => o.deliveryStatus === 'failed').length,
        percentage: routeObj.orders.length > 0 
          ? Math.round((routeObj.orders.filter(o => o.deliveryStatus === 'delivered').length / routeObj.orders.length) * 100)
          : 0
      };

      // ✅ FORMATEAR información de distancia/duración
      if (routeObj.optimization) {
        const distanceKm = (routeObj.optimization.totalDistance || 0) / 1000;
        const durationMinutes = Math.round((routeObj.optimization.totalDuration || 0) / 60);
        
        routeObj.routeInfo = {
          distance: distanceKm >= 1 
            ? `${distanceKm.toFixed(1)} km` 
            : `${routeObj.optimization.totalDistance || 0} m`,
          duration: durationMinutes >= 60 
            ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min` 
            : `${durationMinutes} min`,
          totalDistanceKm: distanceKm,
          totalDurationMinutes: durationMinutes,
          hasPolyline: !!routeObj.optimization.overview_polyline,
          polyline: routeObj.optimization.overview_polyline,
          algorithm: routeObj.optimization.algorithm || 'or-tools',
          bounds: routeObj.optimization.map_bounds
        };
      }

      // ✅ PREPARAR órdenes para el mapa con navegación
      routeObj.orders = routeObj.orders.map(orderItem => ({
        ...orderItem,
        navigationLinks: this.generateNavigationLinks(orderItem.order),
        canMarkDelivered: orderItem.deliveryStatus === 'pending' || orderItem.deliveryStatus === 'in_progress',
        hasProof: !!(orderItem.proof?.photoUrl || orderItem.proof?.signature || orderItem.proof?.notes)
      }));

      console.log(`✅ Ruta completa obtenida: ${routeObj.orders.length} órdenes, ${routeObj.deliveryProgress.completed} completadas`);
      return routeObj;

    } catch (error) {
      console.error('❌ Error obteniendo ruta por ID:', error);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Generar links de navegación para una orden
   */
  generateNavigationLinks(order) {
    if (!order?.location?.latitude || !order?.location?.longitude) {
      console.warn('⚠️ Orden sin coordenadas para navegación:', order?.order_number);
      return null;
    }

    const lat = order.location.latitude;
    const lng = order.location.longitude;
    const address = encodeURIComponent(order.shipping_address || '');

    return {
      waze: `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`,
      googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      appleMaps: `maps://maps.apple.com/?daddr=${lat},${lng}`,
      googleMapsAddress: `https://www.google.com/maps/dir/?api=1&destination=${address}`
    };
  }

  /**
   * ✅ NUEVO: Actualizar estado de entrega con prueba
   */
  async updateDeliveryStatus(routeId, orderId, status, proofData = null, driverId = null) {
    try {
      console.log(`📦 Actualizando entrega: Ruta ${routeId}, Orden ${orderId} -> ${status}`);

      const route = await RoutePlan.findById(routeId);
      if (!route) {
        throw new Error('Ruta no encontrada');
      }

      const orderIndex = route.orders.findIndex(o => o.order.toString() === orderId);
      if (orderIndex === -1) {
        throw new Error('Orden no encontrada en la ruta');
      }

      const previousStatus = route.orders[orderIndex].deliveryStatus;

      // ✅ VALIDAR transición de estados
      const validTransitions = {
        'pending': ['in_progress', 'delivered', 'failed', 'cancelled'],
        'in_progress': ['delivered', 'failed', 'cancelled'],
        'delivered': [], // Estado final
        'failed': ['pending', 'in_progress'], // Permitir reintentos
        'cancelled': ['pending'] // Permitir reactivar
      };

      const allowedStates = validTransitions[previousStatus] || [];
      if (!allowedStates.includes(status)) {
        throw new Error(`Transición inválida: ${previousStatus} -> ${status}`);
      }

      // ✅ ACTUALIZAR estado
      route.orders[orderIndex].deliveryStatus = status;
      
      if (status === 'delivered') {
        route.orders[orderIndex].actualArrival = new Date();
        
        // ✅ GUARDAR prueba de entrega
        if (proofData) {
          route.orders[orderIndex].proof = {
            ...route.orders[orderIndex].proof,
            ...proofData,
            timestamp: new Date(),
            deliveredBy: driverId
          };
        }
      } else if (status === 'in_progress') {
        route.orders[orderIndex].actualArrival = null; // Limpiar si se marca como en progreso
      }

      // ✅ ACTUALIZAR estado general de la ruta
      const completedOrders = route.orders.filter(o => o.deliveryStatus === 'delivered').length;
      const totalOrders = route.orders.length;
      const inProgressOrders = route.orders.filter(o => o.deliveryStatus === 'in_progress').length;

      if (completedOrders === totalOrders) {
        route.status = 'completed';
        route.completedAt = new Date();
        console.log(`🏁 Ruta completada: ${completedOrders}/${totalOrders} entregas`);
      } else if ((completedOrders > 0 || inProgressOrders > 0) && route.status === 'assigned') {
        route.status = 'in_progress';
        if (!route.startedAt) {
          route.startedAt = new Date();
        }
        console.log(`🚀 Ruta iniciada: ${completedOrders}/${totalOrders} entregas completadas`);
      }

      await route.save();

      // ✅ TAMBIÉN actualizar el estado en la orden original
      const updateData = {
        status: status === 'delivered' ? 'delivered' : status === 'failed' ? 'failed' : 'in_transit'
      };
      
      if (status === 'delivered') {
        updateData.delivery_date = new Date();
      }

      await Order.findByIdAndUpdate(orderId, updateData);

      console.log(`✅ Estado actualizado: ${previousStatus} -> ${status}`);

      return {
        message: `Entrega marcada como ${status}`,
        routePlan: await this.getRouteById(routeId), // Devolver ruta actualizada
        deliveryProgress: {
          completed: completedOrders,
          total: totalOrders,
          percentage: Math.round((completedOrders / totalOrders) * 100)
        }
      };

    } catch (error) {
      console.error('❌ Error actualizando estado de entrega:', error);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Registrar cuando se abre navegación
   */
  async trackNavigation(routeId, orderId, navigationType) {
    try {
      const route = await RoutePlan.findById(routeId);
      if (!route) return;

      const orderIndex = route.orders.findIndex(o => o.order.toString() === orderId);
      if (orderIndex === -1) return;

      // Registrar que se abrió la navegación
      if (!route.orders[orderIndex].navigation) {
        route.orders[orderIndex].navigation = {};
      }

      route.orders[orderIndex].navigation[`openedIn${navigationType}`] = true;
      route.orders[orderIndex].navigation.lastOpened = new Date();

      await route.save();
      
      console.log(`📍 Navegación registrada: ${navigationType} para orden ${orderId}`);
    } catch (error) {
      console.error('❌ Error registrando navegación:', error);
      // No hacer throw - es logging opcional
    }
  }

  /**
   * ✅ NUEVO: Obtener ruta activa de un conductor
   */
  async getActiveRouteForDriver(driverId) {
    try {
      console.log(`🚚 Obteniendo ruta activa para conductor: ${driverId}`);

      const activeRoute = await RoutePlan.findOne({
        driver: driverId,
        status: { $in: ['assigned', 'in_progress'] }
      }).populate([
        {
          path: 'orders.order',
          select: 'order_number customer_name customer_phone shipping_address shipping_commune location total_amount'
        },
        {
          path: 'company',
          select: 'name address'
        }
      ]);

      if (!activeRoute) {
        console.log('📭 No hay rutas activas para el conductor');
        return null;
      }

      // Enriquecer con links de navegación
      const enrichedRoute = activeRoute.toObject();
      enrichedRoute.orders = enrichedRoute.orders.map(orderItem => ({
        ...orderItem,
        navigationLinks: this.generateNavigationLinks(orderItem.order),
        canMarkDelivered: orderItem.deliveryStatus === 'pending' || orderItem.deliveryStatus === 'in_progress'
      }));

      console.log(`✅ Ruta activa encontrada: ${enrichedRoute.orders.length} entregas`);
      return enrichedRoute;

    } catch (error) {
      console.error('❌ Error obteniendo ruta activa:', error);
      throw error;
    }
  }

/**
 * ✅ CORREGIDO: Validar que las órdenes tengan coordenadas
 */
async validateOrderCoordinates(orderIds) {
  try {
    // 🔧 FIX: Eliminar duplicados en los IDs
    const uniqueOrderIds = [...new Set(orderIds.map(id => id.toString()))];
    console.log(`🔍 Validando coordenadas para ${uniqueOrderIds.length} órdenes únicas (de ${orderIds.length} originales)`);

    // 1️⃣ Buscar TODAS las órdenes primero
    const allOrders = await Order.find({ _id: { $in: uniqueOrderIds } });
    console.log(`📦 ${allOrders.length} órdenes encontradas en BD`);

    if (allOrders.length === 0) {
      throw new Error('No se encontraron órdenes válidas');
    }

    // 2️⃣ Identificar cuáles YA tienen coordenadas válidas
    const ordersWithCoords = allOrders.filter(order => 
      order.location?.latitude && 
      order.location?.longitude &&
      !isNaN(order.location.latitude) && 
      !isNaN(order.location.longitude)
    );

    console.log(`✅ ${ordersWithCoords.length} órdenes ya tienen coordenadas válidas`);

    // 3️⃣ Identificar cuáles necesitan geocodificación
    const orderIdsWithCoords = ordersWithCoords.map(o => o._id.toString());
    const ordersWithoutCoords = allOrders.filter(order => 
      !orderIdsWithCoords.includes(order._id.toString())
    );

    console.log(`⚠️ ${ordersWithoutCoords.length} órdenes necesitan geocodificación`);

    // 4️⃣ Geocodificar las órdenes que no tienen coordenadas
    let geocodedCount = 0;
    if (ordersWithoutCoords.length > 0) {
      for (const order of ordersWithoutCoords) {
        const success = await this.geocodeOrderIfNeeded(order._id);
        if (success) {
          geocodedCount++;
        }
      }
      console.log(`🌍 Geocodificación completada: ${geocodedCount}/${ordersWithoutCoords.length} exitosas`);
    }

    // 5️⃣ Consultar NUEVAMENTE todas las órdenes después de geocodificar
    const finalOrders = await Order.find({ 
      _id: { $in: uniqueOrderIds },
      'location.latitude': { $exists: true, $ne: null },
      'location.longitude': { $exists: true, $ne: null }
    });

    // 6️⃣ Validar que las coordenadas sean números válidos
    const validOrders = finalOrders.filter(order => {
      const lat = order.location?.latitude;
      const lng = order.location?.longitude;
      return lat && lng && !isNaN(lat) && !isNaN(lng) && 
             lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    });

    console.log(`✅ ${validOrders.length} órdenes con coordenadas válidas finales`);

    // 7️⃣ Mostrar estadísticas finales
    const initialWithCoords = ordersWithCoords.length;
    const newlyGeocoded = validOrders.length - initialWithCoords;
    const totalFailed = allOrders.length - validOrders.length;

    console.log(`📊 Resumen de geocodificación:
      - Órdenes iniciales: ${allOrders.length}
      - Ya tenían coordenadas: ${initialWithCoords}
      - Recién geocodificadas: ${newlyGeocoded}
      - Total válidas: ${validOrders.length}
      - No se pudieron procesar: ${totalFailed}`);

    // 8️⃣ Si no hay órdenes válidas, mostrar detalles de error
    if (validOrders.length === 0) {
      console.error(`❌ DETALLES DEL ERROR:`);
      console.error(`- Órdenes encontradas en BD: ${allOrders.length}`);
      console.error(`- Órdenes que necesitaban geocodificación: ${ordersWithoutCoords.length}`);
      console.error(`- Órdenes geocodificadas exitosamente: ${geocodedCount}`);
      
      // Mostrar algunas órdenes de ejemplo para debug
      if (allOrders.length > 0) {
        const sampleOrder = allOrders[0];
        console.error(`- Ejemplo de orden: ${sampleOrder.order_number || sampleOrder._id}`);
        console.error(`- Dirección: ${sampleOrder.shipping_address}`);
        console.error(`- Location: ${JSON.stringify(sampleOrder.location)}`);
      }
      
      throw new Error(`No se pudo geocodificar ninguna orden. De ${allOrders.length} órdenes encontradas, ${ordersWithoutCoords.length} necesitaban geocodificación pero solo ${geocodedCount} fueron exitosas.`);
    }

    // 9️⃣ Mostrar las órdenes que NO se pudieron geocodificar (para debug)
    const failedOrderIds = uniqueOrderIds.filter(id => 
      !validOrders.find(order => order._id.toString() === id.toString())
    );

    if (failedOrderIds.length > 0) {
      console.warn(`⚠️ ${failedOrderIds.length} órdenes no se pudieron geocodificar:`, failedOrderIds);
      
      // Mostrar detalles de las primeras 3 órdenes fallidas
      const failedOrders = allOrders.filter(o => failedOrderIds.includes(o._id.toString())).slice(0, 3);
      failedOrders.forEach(order => {
        console.warn(`  - ${order.order_number || order._id}: "${order.shipping_address}"`);
      });
    }

    return validOrders;

  } catch (error) {
    console.error('❌ Error validando coordenadas:', error);
    throw error;
  }
}

/**
 * ✅ MEJORADO: Geocodificar orden con más validaciones
 */
async geocodeOrderIfNeeded(orderId) {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      console.warn(`⚠️ Orden ${orderId} no encontrada`);
      return false;
    }

    // Verificar si ya tiene coordenadas válidas
    if (order.location?.latitude && order.location?.longitude &&
        !isNaN(order.location.latitude) && !isNaN(order.location.longitude)) {
      return true; // Ya tiene coordenadas válidas
    }

    // Verificar que tenga dirección
    if (!order.shipping_address || order.shipping_address.trim() === '') {
      console.warn(`⚠️ Orden ${order.order_number || orderId} no tiene dirección de envío`);
      return false;
    }

    console.log(`🌍 Geocodificando orden ${order.order_number || orderId}: ${order.shipping_address}`);

    // Construir dirección completa
    const addressParts = [
      order.shipping_address.trim(),
      order.shipping_commune?.trim(),
      'Santiago',
      'Chile'
    ].filter(part => part && part !== '');
    
    const fullAddress = addressParts.join(', ');
    const coords = await this.geocodeAddress(fullAddress);

    if (coords && coords.lat && coords.lng && 
        !isNaN(coords.lat) && !isNaN(coords.lng) &&
        coords.lat >= -90 && coords.lat <= 90 && 
        coords.lng >= -180 && coords.lng <= 180) {
      
      // Actualizar la orden con las coordenadas
      const updateResult = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            'location.latitude': parseFloat(coords.lat),
            'location.longitude': parseFloat(coords.lng)
          }
        },
        { new: true, runValidators: true }
      );

      if (updateResult && updateResult.location?.latitude && updateResult.location?.longitude) {
        console.log(`✅ Coordenadas agregadas a orden ${order.order_number || orderId}: ${coords.lat}, ${coords.lng}`);
        return true;
      } else {
        console.error(`❌ No se pudo actualizar orden ${orderId} en BD`);
        return false;
      }
    } else {
      console.warn(`⚠️ Coordenadas inválidas para orden ${order.order_number || orderId}: ${JSON.stringify(coords)}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error geocodificando orden ${orderId}:`, error.message);
    return false;
  }
}

/**
 * ✅ MEJORADO: Geocodificación con mejor manejo de errores
 */
async geocodeAddress(address) {
  try {
    if (!this.googleApiKey) {
      console.error('❌ Google API Key no configurada');
      return null;
    }

    const cleanAddress = address.trim().replace(/\s+/g, ' ');
    console.log(`🌍 Geocodificando: "${cleanAddress}"`);

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { 
        address: cleanAddress, 
        key: this.googleApiKey,
        region: 'cl', // Bias hacia Chile
        components: 'country:CL' // Restringir a Chile
      },
      timeout: 10000 // 10 segundos timeout
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      console.log(`✅ Geocodificación exitosa: ${location.lat}, ${location.lng}`);
      return { lat: location.lat, lng: location.lng };
    } else {
      console.warn(`⚠️ Google Geocoding API: ${response.data.status} para "${cleanAddress}"`);
      return null;
    }

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Timeout geocodificando:', address);
    } else if (error.response) {
      console.error('❌ Error de Google API:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error geocodificando:', error.message);
    }
    return null;
  }
}

  /**
   * ✅ NUEVO: Geocodificar orden si no tiene coordenadas
   */
  async geocodeOrderIfNeeded(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order || (order.location?.latitude && order.location?.longitude)) {
        return; // Ya tiene coordenadas
      }

      console.log(`🌍 Geocodificando orden ${order.order_number}: ${order.shipping_address}`);

      const address = `${order.shipping_address}, ${order.shipping_commune || ''}, Chile`;
      const coords = await this.geocodeAddress(address);

      if (coords) {
        order.location = {
          latitude: coords.lat,
          longitude: coords.lng
        };
        await order.save();
        console.log(`✅ Coordenadas agregadas a orden ${order.order_number}: ${coords.lat}, ${coords.lng}`);
      } else {
        console.warn(`⚠️ No se pudo geocodificar orden ${order.order_number}`);
      }
    } catch (error) {
      console.error(`❌ Error geocodificando orden ${orderId}:`, error);
    }
  }

  // ==================== TU MÉTODO ORIGINAL optimizeRoute() - MANTENIDO ====================

 /**
 * 🔹 CORREGIDO: Optimiza y asigna una ruta completa (usa OR-Tools o heurístico)
 */
async optimizeRoute(routeConfig) {
  try {
    const { orderIds, driverId, companyId, company, createdBy, preferences = {}, startLocation, endLocation } = routeConfig;
    const companyRef = companyId || company;

    console.log(`🚀 Iniciando optimización de ruta: ${orderIds.length} órdenes`);

    // 1️⃣ USAR LA FUNCIÓN CORREGIDA - Buscar y validar pedidos con coordenadas
    const orders = await this.validateOrderCoordinates(orderIds);
    if (!orders.length) {
      throw new Error('No se encontraron pedidos válidos con coordenadas válidas');
    }

    console.log(`✅ ${orders.length} órdenes válidas con coordenadas encontradas`);

    // 2️⃣ Preparar órdenes geocodificadas (ya vienen con coordenadas)
    const geocodedOrders = orders.map(order => ({
      order,
      lat: order.location.latitude,
      lng: order.location.longitude,
      fullAddress: order.shipping_address
    }));

    console.log(`📍 ${geocodedOrders.length} órdenes preparadas para optimización`);

    // 3️⃣ Preparar ubicaciones para el optimizador
    const locations = [
      { lat: startLocation.latitude, lng: startLocation.longitude },
      ...geocodedOrders.map(o => ({ lat: o.lat, lng: o.lng })),
      { lat: endLocation.latitude, lng: endLocation.longitude }
    ];

    let optimizedOrderIndexes;
    let usedEngine = 'heuristic';

    // 4️⃣ Intentar optimizar con microservicio Python
    try {
      console.log(`🚀 Intentando optimización OR-Tools en ${this.pythonOptimizerUrl}`);
      
      const optimizerPayload = {
        locations,
        preferences: preferences || { prioritizeTime: true }
      };
      
      const res = await axios.post(this.pythonOptimizerUrl, optimizerPayload, { timeout: 10000 });
      
      if (res.data && res.data.route && res.data.route.length) {
        optimizedOrderIndexes = res.data.route;
        usedEngine = 'or-tools';
        console.log('✅ OR-Tools devolvió una ruta válida.');
      } else {
        console.warn('⚠️ OR-Tools devolvió respuesta vacía, usando heurístico.');
      }
    } catch (err) {
      console.warn('⚠️ Falló optimizador OR-Tools, usando heurístico:', err.message);
    }

    let sequence;

    // 5️⃣ Si no hay ruta desde OR-Tools → fallback heurístico
    if (!optimizedOrderIndexes) {
      sequence = this.heuristicOptimize(
        { lat: startLocation.latitude, lng: startLocation.longitude },
        geocodedOrders,
        { lat: endLocation.latitude, lng: endLocation.longitude }
      );
      usedEngine = 'heuristic';
    } else {
      // 6️⃣ Generar secuencia de pedidos desde los ÍNDICES
      sequence = optimizedOrderIndexes
        .slice(1, -1) // Quitar índice 0 (inicio) e índice final (fin)
        .map(i => geocodedOrders[i - 1]);
    }

    console.log(`🎯 Secuencia optimizada generada: ${sequence.length} órdenes`);

    // 7️⃣ Obtener la ruta real y polilínea de Google
    const waypoints = sequence.map(o => ({
      location: { lat: o.lat, lng: o.lng }
    }));

    // ✅ IMPORTAR GOOGLE MAPS CLIENT SI NO ESTÁ IMPORTADO
    const { Client } = require("@googlemaps/google-maps-services-js");
    const googleMapsClient = new Client({});

    const directionsRequest = {
      params: {
        origin: { lat: startLocation.latitude, lng: startLocation.longitude },
        destination: { lat: endLocation.latitude, lng: endLocation.longitude },
        waypoints: waypoints,
        optimizeWaypoints: false, // La secuencia YA está optimizada
        travelMode: 'DRIVING',
        key: this.googleApiKey,
      },
    };

    let routeData = null;
    let totalDistance = 0; // en metros
    let totalDuration = 0; // en segundos

    try {
      console.log('🗺️ Obteniendo ruta real de Google Directions...');
      const directionsResult = await googleMapsClient.directions(directionsRequest);
      if (directionsResult.data.routes && directionsResult.data.routes.length > 0) {
        routeData = directionsResult.data.routes[0];
        console.log('✅ Ruta real obtenida de Google Directions');
        
        // ✅ CALCULAR DISTANCIA Y DURACIÓN REAL
        for (const leg of routeData.legs) {
          totalDistance += leg.distance.value;
          totalDuration += leg.duration.value;
        }
        
        console.log(`📏 Distancia total: ${(totalDistance/1000).toFixed(1)} km`);
        console.log(`⏱️ Duración total: ${Math.round(totalDuration/60)} min`);
      }
    } catch (e) {
      console.error('⚠️ Error al llamar a Google Directions API', e.message);
      // Fallback a la estimación Haversine si Google falla
      totalDistance = this.estimateTotalDistance(sequence, startLocation, endLocation);
      totalDuration = Math.round(totalDistance / 1000 * 3.5 * 60); // ~3.5 min por km
      console.log(`📏 Usando estimación Haversine: ${(totalDistance/1000).toFixed(1)} km`);
    }

    // 8️⃣ Crear y asignar RoutePlan
    const routePlan = new RoutePlan({
      company: companyRef,
      driver: driverId,
      createdBy,
      startLocation,
      endLocation,
      orders: sequence.map((o, i) => ({
        order: o.order._id,
        sequenceNumber: i + 1,
        estimatedArrival: new Date(Date.now() + (routeData ? 
          routeData.legs.slice(0, i + 1).reduce((acc, leg) => acc + leg.duration.value, 0) * 1000 : 
          (i + 1) * 10 * 60 * 1000)),
        deliveryStatus: 'pending'
      })),
      optimization: {
        algorithm: usedEngine,
        optimizedAt: new Date(),
        totalDistance: totalDistance,
        totalDuration: totalDuration,
        overview_polyline: routeData ? routeData.overview_polyline.points : null,
        map_bounds: routeData ? routeData.bounds : null,
        googleRouteData: routeData // Opcional: guardar todo
      },
      preferences,
      status: 'assigned',
      assignedAt: new Date()
    });

    await routePlan.save();
    await routePlan.populate([
      'orders.order', 
      'driver',
      { path: 'company', select: 'name' }
    ]);

    // 9️⃣ Marcar pedidos como asignados
    await Order.updateMany(
      { _id: { $in: routePlan.orders.map(o => o.order._id || o.order) } },
      { 
        status: 'assigned', 
        assigned_driver: driverId, 
        assigned_at: new Date() 
      }
    );

    console.log(`✅ Ruta optimizada creada: ${routePlan._id} (${usedEngine})`);

    return {
      success: true,
      message: `Ruta optimizada y asignada usando ${usedEngine}`,
      routePlan,
      summary: {
        totalOrders: routePlan.orders.length,
        driver: routePlan.driver.full_name || routePlan.driver.name,
        totalDistance: routePlan.optimization.totalDistance,
        totalDuration: routePlan.optimization.totalDuration,
        totalDistanceKm: Math.round(routePlan.optimization.totalDistance / 1000 * 10) / 10,
        totalDurationMin: Math.round(routePlan.optimization.totalDuration / 60),
        algorithm: usedEngine,
        hasPolyline: !!routePlan.optimization.overview_polyline
      }
    };
  } catch (error) {
    console.error('❌ Error optimizando ruta:', error);
    throw new Error(`Error en optimización: ${error.message}`);
  }
}

  // ==================== TUS MÉTODOS ORIGINALES MANTENIDOS ====================

  /** 🌍 Geocodificación simple con Google */
  async geocodeAddress(address) {
    try {
      const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address, key: this.googleApiKey }
      });
      if (res.data.results.length > 0) {
        const loc = res.data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng };
      }
      return null;
    } catch (e) {
      console.error('Error geocodificando:', e.message);
      return null;
    }
  }

  /** 🧠 Fallback heurístico (nearest neighbor) */
  heuristicOptimize(start, orders, end) {
    const remaining = [...orders];
    const route = [];
    let current = start;

    while (remaining.length) {
      remaining.sort((a, b) =>
        this.haversineDistance(current, a) - this.haversineDistance(current, b)
      );
      const next = remaining.shift();
      route.push(next);
      current = next;
    }
    
    return route;
  }

  /** 📏 Distancia Haversine (en METROS) */
  haversineDistance(a, b) {
    const R = 6371000; // Radio en metros
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const aHav = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(aHav), Math.sqrt(1 - aHav));
  }

  /** 📊 Estimar distancia total (en METROS) */
  /** 📊 Estimar distancia total (en METROS) */
estimateTotalDistance(sequence, start, end) {
  if (!sequence || sequence.length === 0) {
    if (start && end) {
      const startPoint = { lat: start.latitude, lng: start.longitude };
      const endPoint = { lat: end.latitude, lng: end.longitude };
      return Math.round(this.haversineDistance(startPoint, endPoint));
    }
    return 0;
  }

  const startPoint = { lat: start.latitude, lng: start.longitude };
  const endPoint = { lat: end.latitude, lng: end.longitude };
  
  let total = 0;
  
  // 1. De Inicio a la primera orden
  total += this.haversineDistance(startPoint, { 
    lat: sequence[0].lat, 
    lng: sequence[0].lng 
  });
  
  // 2. Entre órdenes consecutivas
  for (let i = 0; i < sequence.length - 1; i++) {
    const current = { lat: sequence[i].lat, lng: sequence[i].lng };
    const next = { lat: sequence[i + 1].lat, lng: sequence[i + 1].lng };
    total += this.haversineDistance(current, next);
  }
  
  // 3. De la última orden al destino final
  if (sequence.length > 0) {
    const lastOrder = sequence[sequence.length - 1];
    total += this.haversineDistance(
      { lat: lastOrder.lat, lng: lastOrder.lng }, 
      endPoint
    );
  }
  
  return Math.round(total);
}

/**
 * ✅ NUEVO: Obtener estadísticas de rutas para dashboard
 */
async getRouteStatistics(companyId, timeframe = 'week') {
  try {
    console.log(`📊 Obteniendo estadísticas de rutas: ${timeframe}`);

    const dateFilter = this.getDateFilterForTimeframe(timeframe);
    
    const pipeline = [
      {
        $match: {
          company: companyId,
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: null,
          totalRoutes: { $sum: 1 },
          completedRoutes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          inProgressRoutes: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          totalOrders: { $sum: { $size: '$orders' } },
          totalDeliveredOrders: {
            $sum: {
              $size: {
                $filter: {
                  input: '$orders',
                  cond: { $eq: ['$$this.deliveryStatus', 'delivered'] }
                }
              }
            }
          },
          totalDistance: { $sum: '$optimization.totalDistance' },
          totalDuration: { $sum: '$optimization.totalDuration' },
          avgRoutesPerDay: {
            $avg: {
              $cond: [
                { $ne: ['$createdAt', null] },
                { $dayOfYear: '$createdAt' },
                0
              ]
            }
          }
        }
      }
    ];

    const stats = await RoutePlan.aggregate(pipeline);
    const result = stats[0] || {
      totalRoutes: 0,
      completedRoutes: 0,
      inProgressRoutes: 0,
      totalOrders: 0,
      totalDeliveredOrders: 0,
      totalDistance: 0,
      totalDuration: 0
    };

    // Calcular métricas adicionales
    const deliveryRate = result.totalOrders > 0 
      ? Math.round((result.totalDeliveredOrders / result.totalOrders) * 100)
      : 0;

    const completionRate = result.totalRoutes > 0
      ? Math.round((result.completedRoutes / result.totalRoutes) * 100)
      : 0;

    const avgDistancePerRoute = result.totalRoutes > 0
      ? Math.round(result.totalDistance / result.totalRoutes / 1000 * 10) / 10 // km con 1 decimal
      : 0;

    const avgDurationPerRoute = result.totalRoutes > 0
      ? Math.round(result.totalDuration / result.totalRoutes / 60) // minutos
      : 0;

    return {
      overview: {
        totalRoutes: result.totalRoutes,
        completedRoutes: result.completedRoutes,
        inProgressRoutes: result.inProgressRoutes,
        pendingRoutes: result.totalRoutes - result.completedRoutes - result.inProgressRoutes
      },
      deliveries: {
        totalOrders: result.totalOrders,
        deliveredOrders: result.totalDeliveredOrders,
        deliveryRate: deliveryRate,
        pendingDeliveries: result.totalOrders - result.totalDeliveredOrders
      },
      efficiency: {
        completionRate: completionRate,
        avgDistancePerRoute: avgDistancePerRoute,
        avgDurationPerRoute: avgDurationPerRoute,
        totalDistanceKm: Math.round(result.totalDistance / 1000),
        totalDurationHours: Math.round(result.totalDuration / 3600 * 10) / 10
      },
      timeframe: timeframe,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    throw error;
  }
}

/**
 * ✅ HELPER: Obtener filtro de fecha según timeframe
 */
getDateFilterForTimeframe(timeframe) {
  const now = new Date();
  
  switch (timeframe) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      return weekStart;
    
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return quarterStart;
    
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    
    default:
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  }
}

/**
 * ✅ NUEVO: Obtener rutas por conductor con filtros
 */
async getRoutesByDriver(driverId, filters = {}) {
  try {
    console.log(`🚚 Obteniendo rutas para conductor: ${driverId}`);

    const query = { driver: driverId };
    
    // Aplicar filtros
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    const routes = await RoutePlan.find(query)
      .populate({
        path: 'orders.order',
        select: 'order_number customer_name shipping_address total_amount status'
      })
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    // Enriquecer con estadísticas por ruta
    const enrichedRoutes = routes.map(route => {
      const routeObj = route.toObject();
      
      const completed = routeObj.orders.filter(o => o.deliveryStatus === 'delivered').length;
      const total = routeObj.orders.length;
      
      routeObj.stats = {
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalPackages: total,
        deliveredPackages: completed,
        pendingPackages: total - completed,
        distanceKm: routeObj.optimization?.totalDistance 
          ? Math.round(routeObj.optimization.totalDistance / 1000 * 10) / 10
          : 0,
        durationMinutes: routeObj.optimization?.totalDuration
          ? Math.round(routeObj.optimization.totalDuration / 60)
          : 0
      };
      
      return routeObj;
    });

    console.log(`✅ ${enrichedRoutes.length} rutas obtenidas para conductor`);
    return enrichedRoutes;

  } catch (error) {
    console.error('❌ Error obteniendo rutas por conductor:', error);
    throw error;
  }
}

/**
 * ✅ NUEVO: Eliminar una ruta (solo si no está en progreso)
 */
async deleteRoute(routeId, userId) {
  try {
    console.log(`🗑️ Eliminando ruta: ${routeId}`);

    const route = await RoutePlan.findById(routeId);
    if (!route) {
      throw new Error('Ruta no encontrada');
    }

    // Validar que se puede eliminar
    if (route.status === 'in_progress' || route.status === 'completed') {
      throw new Error('No se puede eliminar una ruta en progreso o completada');
    }

    // Liberar las órdenes asignadas
    await Order.updateMany(
      { _id: { $in: route.orders.map(o => o.order) } },
      { 
        $unset: { assigned_driver: "", assigned_at: "" },
        status: 'ready_for_pickup'
      }
    );

    // Eliminar la ruta
    await RoutePlan.findByIdAndDelete(routeId);

    console.log(`✅ Ruta eliminada: ${routeId}`);
    return { success: true, message: 'Ruta eliminada correctamente' };

  } catch (error) {
    console.error('❌ Error eliminando ruta:', error);
    throw error;
  }
}

/**
 * ✅ NUEVO: Reoptimizar una ruta existente
 */
async reoptimizeRoute(routeId) {
  try {
    console.log(`🔄 Reoptimizando ruta: ${routeId}`);

    const route = await RoutePlan.findById(routeId)
      .populate('orders.order')
      .populate('driver');

    if (!route) {
      throw new Error('Ruta no encontrada');
    }

    if (route.status === 'completed') {
      throw new Error('No se puede reoptimizar una ruta completada');
    }

    // Solo reoptimizar órdenes pendientes
    const pendingOrders = route.orders.filter(o => 
      o.deliveryStatus === 'pending' || o.deliveryStatus === 'in_progress'
    );

    if (pendingOrders.length === 0) {
      throw new Error('No hay órdenes pendientes para reoptimizar');
    }

    // Crear nueva configuración con las órdenes pendientes
    const reoptimizeConfig = {
      orderIds: pendingOrders.map(o => o.order._id),
      driverId: route.driver._id,
      companyId: route.company,
      createdBy: route.createdBy,
      startLocation: route.startLocation,
      endLocation: route.endLocation,
      preferences: route.preferences
    };

    // Eliminar la ruta actual
    await this.deleteRoute(routeId);

    // Crear nueva ruta optimizada
    const newRoute = await this.optimizeRoute(reoptimizeConfig);

    console.log(`✅ Ruta reoptimizada: ${routeId} -> ${newRoute.routePlan._id}`);
    return newRoute;

  } catch (error) {
    console.error('❌ Error reoptimizando ruta:', error);
    throw error;
  }
}

/**
 * ✅ NUEVO: Validar configuración del servicio
 */
validateConfiguration() {
  const errors = [];

  if (!this.googleApiKey) {
    errors.push('GOOGLE_MAPS_API_KEY no configurada');
  }

  if (!this.pythonOptimizerUrl) {
    console.warn('⚠️ PYTHON_OPTIMIZER_URL no configurada, usando solo optimización heurística');
  }

  if (errors.length > 0) {
    throw new Error(`Configuración inválida: ${errors.join(', ')}`);
  }

  console.log('✅ Configuración del RouteOptimizerService válida');
  return true;
}

} // ← Cierre de la clase RouteOptimizerService

// ✅ EXPORTAR el servicio como singleton
module.exports = new RouteOptimizerService();