// /app/src/services/routeOptimizer.service.js
const axios = require("axios");
const RoutePlan = require("../models/RoutePlan");
const GeoService = require("./routeOptimizer/geo.service");
const { Client } = require("@googlemaps/google-maps-services-js");

const geoService = new GeoService();
const googleMapsClient = new Client({});

// ====== Configuración general ======
const GOOGLE_DIRECTIONS_BATCH_POINTS = 25; // (1 origen + 23 waypoints + 1 destino)
const DIRECTIONS_TIMEOUT_MS = Number(process.env.DIRECTIONS_TIMEOUT_MS || 30000);
const MAX_RETRIES = Number(process.env.DIRECTIONS_MAX_RETRIES || 5);
const BASE_BACKOFF_MS = Number(process.env.DIRECTIONS_BASE_BACKOFF_MS || 500);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (n) => Math.floor(n * (0.75 + Math.random() * 0.5));
const isNumber = (v) => typeof v === "number" && !Number.isNaN(v);

// ✅ Normaliza coordenadas en múltiples formatos
const getCoords = (point) => {
  if (!point) throw new Error("Punto nulo recibido en getCoords.");

  // ✅ Formatos aceptados
  if (point.lat && point.lng) {
    return { lat: Number(point.lat), lng: Number(point.lng) };
  }
  if (typeof point.latitude !== "undefined" && typeof point.longitude !== "undefined") {
    return { lat: Number(point.latitude), lng: Number(point.longitude) };
  }
  if (point.location && typeof point.location.latitude !== "undefined" && typeof point.location.longitude !== "undefined") {
    return { lat: Number(point.location.latitude), lng: Number(point.location.longitude) };
  }
  if (point.delivery_location && point.delivery_location.lat && point.delivery_location.lng) {
    return { lat: Number(point.delivery_location.lat), lng: Number(point.delivery_location.lng) };
  }

  console.error("🚨 Punto de ruta con estructura inválida:", point);
  throw new Error("Punto de ruta inválido: no contiene coordenadas válidas.");
};

const validateCoords = (c) => !!(c && isNumber(c.lat) && isNumber(c.lng));

// === Codificación / decodificación de polilíneas ===
const decodePolyline = (str) => {
  let index = 0,
    lat = 0,
    lng = 0,
    points = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
};

const encodePolyline = (points) => {
  let lastLat = 0, lastLng = 0, result = "";
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    let dLat = lat - lastLat;
    let dLng = lng - lastLng;
    [dLat, dLng].forEach((coord) => {
      let v = coord < 0 ? ~(coord << 1) : (coord << 1);
      while (v >= 0x20) {
        result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
        v >>= 5;
      }
      result += String.fromCharCode(v + 63);
    });
    lastLat = lat;
    lastLng = lng;
  }
  return result;
};

// ====== Peticiones con reintento exponencial ======
async function callDirectionsWithRetry(params, label) {
  let attempt = 0;
  while (true) {
    try {
      const res = await googleMapsClient.directions({
        params,
        timeout: DIRECTIONS_TIMEOUT_MS,
      });
      const payload = res?.data;
      const gStatus = payload?.status;
      const gMessage = payload?.error_message;
      if (gStatus && gStatus !== "OK") {
        const retriableStatuses = new Set([
          "OVER_QUERY_LIMIT", "UNKNOWN_ERROR", "RESOURCE_EXHAUSTED", "INTERNAL_ERROR",
        ]);
        if (retriableStatuses.has(gStatus) && attempt < MAX_RETRIES) {
          attempt++;
          const wait = jitter(BASE_BACKOFF_MS * Math.pow(2, attempt));
          console.warn(`⏳ Google status=${gStatus} (${attempt}/${MAX_RETRIES}) en ${wait}ms`);
          await sleep(wait);
          continue;
        }
        throw new Error(gMessage || gStatus);
      }
      return res;
    } catch (e) {
      const statusCode = e?.response?.status;
      const retriableHttp = statusCode && [408, 409, 429, 500, 502, 503, 504].includes(statusCode);
      if (retriableHttp && attempt < MAX_RETRIES) {
        attempt++;
        const wait = jitter(BASE_BACKOFF_MS * Math.pow(2, attempt));
        console.warn(`⏳ Retry Directions (${attempt}/${MAX_RETRIES}) en ${wait}ms...`);
        await sleep(wait);
        continue;
      }
      console.error(`❌ Error Directions ${label}:`, e?.message);
      throw e;
    }
  }
}

// ====== Preferencias opcionales ======
function buildPreferences(preferences = {}) {
  const avoidList = [];
  if (preferences.avoidTolls) avoidList.push("tolls");
  if (preferences.avoidHighways) avoidList.push("highways");
  if (preferences.avoidFerries) avoidList.push("ferries");
  const params = {};
  if (avoidList.length) params.avoid = avoidList;
  if (preferences.language) params.language = preferences.language;
  if (preferences.region) params.region = preferences.region;
  return params;
}

// ====== FUNCIÓN PRINCIPAL ======
const optimizeRoute = async (config) => {
  const {
    startLocation,
    endLocation,
    orderIds,
    driverId,
    companyId,
    createdBy,
    preferences = {},
    existingRouteId // ✅ Nuevo parámetro opcional
  } = config;

  if (!process.env.GOOGLE_MAPS_API_KEY) throw new Error("Falta GOOGLE_MAPS_API_KEY");
  if (!process.env.PYTHON_OPTIMIZER_URL) throw new Error("Falta PYTHON_OPTIMIZER_URL");

  const orders = await geoService.validateOrderCoordinates(orderIds);
  if (!orders?.length) throw new Error("No hay pedidos válidos para optimizar.");
  console.log(`✅ ${orders.length} órdenes validadas.`);

  // === Normalización de puntos ===
  const normalizePoint = (p, type) => ({
    latitude: Number(p?.latitude ?? p?.lat ?? p?.location?.latitude),
    longitude: Number(p?.longitude ?? p?.lng ?? p?.location?.longitude),
    address: p?.address || p?.formatted_address || `${type === "start" ? "Inicio" : "Destino"} sin dirección`,
    type: p?.type || type
  });

  const startPoint = normalizePoint(startLocation, "start");
  const endPoint = normalizePoint(endLocation, "end");

  console.log("🧭 Normalizando coordenadas:", { start: startPoint, end: endPoint });

  const locations = [getCoords(startPoint), ...orders.map(getCoords), getCoords(endPoint)];
  locations.forEach((c, i) => {
    if (!validateCoords(c)) throw new Error(`Coordenadas inválidas en índice ${i}`);
  });

  // === Llamada al optimizador Python ===
  let optimizedIndices;
  try {
    console.log(`🐍 Llamando a Python OR-Tools → ${process.env.PYTHON_OPTIMIZER_URL}`);
    const pythonResponse = await axios.post(
      `${process.env.PYTHON_OPTIMIZER_URL}`,
      { locations, preferences },
      { timeout: 60000 }
    );
    optimizedIndices = pythonResponse?.data?.route;
    if (!Array.isArray(optimizedIndices) || optimizedIndices.length === 0)
      throw new Error("Python no devolvió una ruta válida.");
  } catch (error) {
    console.error("❌ Error en Python:", error?.message);
    throw new Error("El microservicio Python falló.");
  }

  const originalStops = [startLocation, ...orders, endLocation];

  // 🛑 Aseguramos que el recorrido siempre comience en el punto inicial
  // y termine en el destino final. El optimizador de Python puede
  // devolver los índices reordenados, pero debemos fijar el primer y
  // último punto para calcular bien kms y tiempos.
  const START_INDEX = 0;
  const END_INDEX = originalStops.length - 1;

  const visitOrder = optimizedIndices.filter(
    (i) => i !== START_INDEX && i !== END_INDEX
  );

  // Reconstruimos la secuencia final: inicio fijo, paradas optimizadas y
  // destino final fijo.
  const optimizedStops = [
    originalStops[START_INDEX],
    ...visitOrder.map((i) => originalStops[i]),
    originalStops[END_INDEX]
  ];

  const orderedOrders = optimizedStops.slice(1, -1);

  // === Directions API ===
  console.log("🗺️ Procesando Directions (por lotes)...");
  let totalDistance = 0,
    totalDuration = 0;
  const polylineSegments = [];
  const fullPathPoints = [];
  const prefParams = buildPreferences(preferences);

  for (let i = 0; i < optimizedStops.length - 1; i += GOOGLE_DIRECTIONS_BATCH_POINTS - 1) {
    const batch = optimizedStops.slice(i, i + GOOGLE_DIRECTIONS_BATCH_POINTS);
    if (batch.length < 2) continue;
    const origin = getCoords(batch[0]);
    const destination = getCoords(batch[batch.length - 1]);
    const waypoints = batch.slice(1, -1).map(getCoords);

    const directionsParams = {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      waypoints: waypoints.map((wp) => `${wp.lat},${wp.lng}`),
      optimizeWaypoints: false,
      travelMode: "DRIVING",
      key: process.env.GOOGLE_MAPS_API_KEY,
      ...prefParams
    };

    const directionsResult = await callDirectionsWithRetry(directionsParams, `Lote ${i}`);
    const routes = directionsResult?.data?.routes || [];
    if (!routes.length) continue;

    const route = routes[0];
    for (const leg of route.legs || []) {
      totalDistance += leg.distance?.value || 0;
      totalDuration += leg.duration?.value || 0;
    }

    const polyline = route?.overview_polyline?.points;
    if (polyline) {
      polylineSegments.push(polyline);
      const pts = decodePolyline(polyline);
      fullPathPoints.push(...pts);
    }
  }

  const overviewPolyline = fullPathPoints.length ? encodePolyline(fullPathPoints) : undefined;
  console.log(
    `✅ Direcciones completadas. Distancia=${(totalDistance / 1000).toFixed(1)}km, Duración=${(
      totalDuration / 3600
    ).toFixed(2)}h`
  );

  // === Si se está reoptimizando una ruta existente ===
 if (existingRouteId) {
    // 1. Obtener la ruta actual para preservar su estado
    const currentRoute = await RoutePlan.findById(existingRouteId);
    
    // Mapa de estados actuales de los pedidos (ID -> Estado/Prueba)
    const currentOrdersMap = new Map();
    if (currentRoute && currentRoute.orders) {
      currentRoute.orders.forEach(o => {
        // Guardamos todo el objeto del pedido para no perder nada (status, pruebas, fechas)
        currentOrdersMap.set(o.order.toString(), o);
      });
    }

    // Determinar el estado general de la ruta (mantener in_progress si ya estaba iniciada)
    const statusToKeep = currentRoute && currentRoute.status === 'in_progress' 
      ? 'in_progress' 
      : 'assigned';

    // 2. Construir la nueva lista de pedidos preservando el estado de los completados
    const newOrders = orderedOrders.map((order, index) => {
      const existingInfo = currentOrdersMap.get(order._id.toString());
      
      // Si ya existía, conservamos su estado, prueba, fechas, etc.
      if (existingInfo) {
        return {
          order: order._id,
          sequenceNumber: index + 1, // Actualizamos solo la secuencia
          deliveryStatus: existingInfo.deliveryStatus,
          deliveryProof: existingInfo.deliveryProof,
          deliveredAt: existingInfo.deliveredAt,
          attemptedAt: existingInfo.attemptedAt
        };
      }
      
      // Si es nuevo (raro en re-optimización, pero posible), va como pending
      return {
        order: order._id,
        sequenceNumber: index + 1,
        deliveryStatus: "pending"
      };
    });

    // 3. Actualizar la ruta
    const updated = await RoutePlan.findByIdAndUpdate(
      existingRouteId,
      {
        $set: {
          startLocation: startPoint,
          endLocation: endPoint,
          orders: newOrders, // Usamos la lista con estados preservados
          optimization: {
            algorithm: "python_or-tools+google_directions",
            totalDistance,
            totalDuration,
            overview_polyline: overviewPolyline,
            overview_polyline_segments: polylineSegments
          },
          updatedAt: new Date(),
          status: statusToKeep // ✅ Mantener estado (assigned o in_progress)
        }
      },
      { new: true }
    ).populate("driver orders.order");

    console.log(`✅ Ruta ${existingRouteId} re-optimizada conservando progreso.`);
    return updated;
  }
  // === Si no existe ruta previa, crear una nueva ===
  const routePlan = new RoutePlan({
    company: companyId,
    driver: driverId,
    createdBy,
    startLocation: startPoint,
    endLocation: endPoint,
    orders: orderedOrders.map((order, index) => ({
      order: order._id,
      sequenceNumber: index + 1,
      deliveryStatus: "pending"
    })),
    optimization: {
      algorithm: "python_or-tools+google_directions",
      totalDistance,
      totalDuration,
      overview_polyline: overviewPolyline,
      overview_polyline_segments: polylineSegments,
      batches: Math.ceil((optimizedStops.length - 1) / (GOOGLE_DIRECTIONS_BATCH_POINTS - 1))
    },
    status: "assigned",
    assignedAt: new Date()
  });

  await routePlan.save();
  await routePlan.populate("driver orders.order");
  console.log(`✅ Ruta guardada (${overviewPolyline ? "con" : "sin"} polyline).`);

  return routePlan;
};


// ==================== MÉTODOS ADICIONALES REQUERIDOS ====================

/**
 * Asigna una ruta existente a un conductor
 */
const assignRouteToDriver = async (routeId, driverId) => {
  try {
    const Driver = require('../models/Driver');
    
    // Validar que el conductor existe
    const driver = await Driver.findById(driverId);
    if (!driver) {
      throw new Error('Conductor no encontrado');
    }

    // Validar que la ruta existe
    const route = await RoutePlan.findById(routeId);
    if (!route) {
      throw new Error('Ruta no encontrada');
    }

    // Actualizar la ruta con el conductor
    route.driver = driverId;
    route.status = 'assigned';
    route.assignedAt = new Date();

    await route.save();
    await route.populate(['driver', 'company', 'orders.order']);

    console.log(`✅ Ruta ${routeId} asignada al conductor ${driver.full_name} (${driver.email})`);

    return {
      message: `Ruta asignada correctamente al conductor ${driver.full_name}`,
      routePlan: route
    };
  } catch (error) {
    console.error('❌ Error asignando ruta:', error);
    throw error;
  }
};

/**
 * Inicia una ruta asignada (cambiar estado a in_progress)
 */
const startRoute = async (routeId, driverId) => {
  try {
    const route = await RoutePlan.findById(routeId).populate(['driver', 'orders.order']);
    
    if (!route) {
      throw new Error('Ruta no encontrada');
    }

    // Validar que la ruta está asignada al conductor correcto
    if (route.driver._id.toString() !== driverId.toString()) {
      throw new Error('Esta ruta no está asignada a tu usuario');
    }

    if (route.status !== 'assigned') {
      throw new Error(`No se puede iniciar una ruta con estado: ${route.status}`);
    }

    // Cambiar estado a in_progress
    route.status = 'in_progress';
    route.startedAt = new Date();

    await route.save();

    console.log(`🚀 Ruta ${routeId} iniciada por conductor ${route.driver.full_name}`);

    return {
      message: 'Ruta iniciada correctamente',
      routePlan: route
    };
  } catch (error) {
    console.error('❌ Error iniciando ruta:', error);
    throw error;
  }
};

/**
 * Obtiene la ruta activa de un conductor específico
 */
const getActiveRouteForDriver = async (driverId) => {
  try {
    console.log(`🔍 Buscando ruta activa para conductor: ${driverId}`);

    const activeRoute = await RoutePlan.findOne({
      driver: driverId,
      status: { $in: ['assigned', 'in_progress'] }
    })
    .populate([
      'driver', 
      'company', 
      {
        path: 'orders.order',
        model: 'Order'
      }
    ])
    .sort({ assignedAt: -1 });

    if (activeRoute) {
      console.log(`✅ Ruta activa encontrada: ${activeRoute._id} con ${activeRoute.orders.length} pedidos`);
    } else {
      console.log(`ℹ️ No hay rutas activas para el conductor ${driverId}`);
    }

    return activeRoute;
  } catch (error) {
    console.error('❌ Error obteniendo ruta activa:', error);
    throw error;
  }
};

/**
 * Actualiza el estado de entrega de un pedido específico
 */
const updateDeliveryStatus = async (routeId, orderId, status, deliveryProof = null, driverInfo = null) => {
  try {
    console.log('📦 Actualizando estado de entrega en servicio:', {
      routeId,
      orderId,
      status,
      hasDeliveryProof: !!deliveryProof,
      hasDriverInfo: !!driverInfo
    });

    const RoutePlan = require('../models/RoutePlan');
    const Order = require('../models/Order');
    
    const route = await RoutePlan.findById(routeId).populate('orders.order driver');
    
    if (!route) {
      throw new Error('Ruta no encontrada');
    }

    // Buscar la orden en la ruta
    const orderItem = route.orders.find(o => o.order._id.toString() === orderId);
    if (!orderItem) {
      throw new Error('Orden no encontrada en la ruta');
    }

    console.log('📦 Orden encontrada en ruta:', {
      currentStatus: orderItem.deliveryStatus,
      newStatus: status,
      driverFromRoute: route.driver?.name || 'No asignado'
    });

    // Actualizar estado
    orderItem.deliveryStatus = status;
    
    const now = new Date();

    // ✅ MEJORADO: Función para determinar información del conductor
    const getConductorInfo = () => {
      // Prioridad 1: driverInfo pasado como parámetro
      if (driverInfo) {
        console.log('🔍 Usando driverInfo proporcionado:', driverInfo.name);
        return {
          id: driverInfo.id || driverInfo._id,
          name: driverInfo.name || driverInfo.full_name,
          email: driverInfo.email,
          phone: driverInfo.phone,
          source: 'parameter'
        };
      }

      // Prioridad 2: Driver de la ruta
      if (route.driver) {
        console.log('🔍 Usando driver de la ruta:', route.driver.name);
        return {
          id: route.driver._id,
          name: route.driver.full_name || route.driver.name,
          email: route.driver.email,
          phone: route.driver.phone,
          source: 'route'
        };
      }

      // Prioridad 3: Driver info existente en la orden
      const existingOrder = orderItem.order;
      if (existingOrder?.driver_info?.name) {
        console.log('🔍 Usando driver_info de la orden:', existingOrder.driver_info.name);
        return {
          id: existingOrder.shipday_driver_id || existingOrder.assigned_driver_id || 'unknown',
          name: existingOrder.driver_info.name,
          email: existingOrder.driver_info.email,
          phone: existingOrder.driver_info.phone,
          source: 'order_existing'
        };
      }

      console.warn('⚠️ No se pudo determinar información del conductor');
      return {
        id: 'unknown',
        name: 'Conductor desconocido',
        email: null,
        phone: null,
        source: 'unknown'
      };
    };

    const conductorInfo = getConductorInfo();
    
    console.log('👨‍💼 Información del conductor determinada:', {
      name: conductorInfo.name,
      source: conductorInfo.source,
      id: conductorInfo.id
    });

    // Si es entrega exitosa, guardar prueba con información del conductor
    if (status === 'delivered') {
      console.log('✅ Procesando entrega exitosa');

      // Guardar prueba de entrega en la ruta
      orderItem.deliveryProof = {
        photos: deliveryProof?.photos || [],
        photo: deliveryProof?.photo || (deliveryProof?.photos && deliveryProof.photos[0]) || null,
        recipientName: deliveryProof?.recipientName || 'No especificado',
        comments: deliveryProof?.comments || '',
        location: deliveryProof?.location || null,
        timestamp: now,
        deliveredBy: conductorInfo,
        deliveryMethod: deliveryProof?.deliveryMethod || 'driver_app'
      };

      orderItem.deliveredAt = now;

      // ✅ MEJORADO: Actualizar la orden principal con información completa del conductor
      const updateData = {
        status: 'delivered',
        delivery_date: now,
        updated_at: now,
        
        // ✅ NUEVO: Campo específico para quien entregó
        delivered_by_driver: {
          driver_id: conductorInfo.id,
          driver_name: conductorInfo.name,
          driver_email: conductorInfo.email,
          driver_phone: conductorInfo.phone,
          delivery_timestamp: now,
          source: conductorInfo.source
        },

        // ✅ MEJORADO: Actualizar driver_info si no existe o está incompleto
        ...((!orderItem.order.driver_info?.name || conductorInfo.source === 'route') && {
          driver_info: {
            name: conductorInfo.name,
            email: conductorInfo.email,
            phone: conductorInfo.phone,
            id: conductorInfo.id,
            updated_from_route: true
          }
        }),

        // ✅ MEJORADO: Proof of delivery con más información
        proof_of_delivery: {
          photo_urls: deliveryProof?.photos || [],
          photo_public_ids: [], // Se llenará si usas Cloudinary
          photo_url: deliveryProof?.photo || (deliveryProof?.photos && deliveryProof.photos[0]) || null,
          recipient_name: deliveryProof?.recipientName || 'No especificado',
          notes: deliveryProof?.comments || '',
          timestamp: now,
          delivered_by: conductorInfo.name,
          delivered_by_id: conductorInfo.id,
          delivered_by_email: conductorInfo.email,
          delivery_location: deliveryProof?.location,
          delivery_method: deliveryProof?.deliveryMethod || 'driver_app',
          
          // ✅ NUEVO: Información adicional para auditoría
          delivery_context: {
            route_id: routeId,
            sequence_number: orderItem.sequenceNumber,
            completed_via: 'route_optimizer'
          }
        }
      };

      const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true });

      console.log('✅ Entrega confirmada y orden actualizada:', {
        orderId,
        orderNumber: updatedOrder?.order_number,
        deliveredBy: conductorInfo.name,
        driverSource: conductorInfo.source,
        timestamp: now
      });

      // ✅ NUEVO: Registrar en DriverHistory si hay un conductor válido
      if (conductorInfo.id !== 'unknown') {
        try {
          const DriverHistoryService = require('./driverHistory.service');
          await DriverHistoryService.recordDelivery(updatedOrder, {
            driver_id: conductorInfo.id,
            driver_name: conductorInfo.name,
            driver_email: conductorInfo.email
          });
          console.log('📊 Entrega registrada en DriverHistory');
        } catch (historyError) {
          console.warn('⚠️ Error registrando en DriverHistory:', historyError.message);
          // No fallar por esto
        }
      }
    }

    // Si es fallo, guardar información del fallo
    if (status === 'failed') {
      console.log('❌ Procesando entrega fallida');

      orderItem.deliveryProof = {
        comments: deliveryProof?.comments || 'Entrega fallida',
        timestamp: now,
        failureReason: deliveryProof?.failureReason || 'No especificado',
        attemptedBy: conductorInfo
      };

      orderItem.attemptedAt = now;

      // Actualizar orden principal
      await Order.findByIdAndUpdate(orderId, {
        status: 'failed',
        updated_at: now,
        failure_reason: deliveryProof?.comments || 'Entrega fallida',
        attempted_by: conductorInfo.name,
        attempted_by_id: conductorInfo.id,
        attempted_by_email: conductorInfo.email,
        
        // ✅ NUEVO: También actualizar driver_info en caso de fallo
        ...((!orderItem.order.driver_info?.name || conductorInfo.source === 'route') && {
          driver_info: {
            name: conductorInfo.name,
            email: conductorInfo.email,
            phone: conductorInfo.phone,
            id: conductorInfo.id,
            updated_from_route: true
          }
        })
      });

      console.log('❌ Fallo de entrega registrado:', {
        orderId,
        attemptedBy: conductorInfo.name,
        reason: deliveryProof?.failureReason || 'No especificado'
      });
    }

    // ✅ MEJORADO: Verificar progreso de la ruta
    const completedCount = route.orders.filter(o => 
      ['delivered', 'failed', 'cancelled'].includes(o.deliveryStatus)
    ).length;
    
    const totalOrders = route.orders.length;
    const progressPercentage = Math.round((completedCount / totalOrders) * 100);

    console.log('📊 Progreso de la ruta:', {
      completedCount,
      totalOrders,
      progressPercentage: `${progressPercentage}%`
    });

    // Verificar si todas las entregas están completadas
    const allCompleted = completedCount === totalOrders;

    if (allCompleted && route.status !== 'completed') {
      route.status = 'completed';
      route.completedAt = now;
      route.completionSummary = {
        total_orders: totalOrders,
        delivered: route.orders.filter(o => o.deliveryStatus === 'delivered').length,
        failed: route.orders.filter(o => o.deliveryStatus === 'failed').length,
        cancelled: route.orders.filter(o => o.deliveryStatus === 'cancelled').length,
        completed_by: conductorInfo.name,
        completion_date: now
      };
      
      console.log('🏁 Ruta completada:', {
        routeId,
        completedBy: conductorInfo.name,
        summary: route.completionSummary
      });
    }

    await route.save();

    console.log('💾 Ruta guardada exitosamente');

    return {
      message: `Estado actualizado a ${status}`,
      routePlan: route,
      driverInfo: conductorInfo,
      progress: {
        completed: completedCount,
        total: totalOrders,
        percentage: progressPercentage
      }
    };

  } catch (error) {
    console.error('❌ Error en updateDeliveryStatus:', error);
    throw error;
  }
};


/**
 * Procesa actualizaciones offline del conductor
 */
const processOfflineUpdates = async (routeId, updates) => {
  try {
    const route = await RoutePlan.findById(routeId);
    if (!route) {
      throw new Error('Ruta no encontrada');
    }

    const processedUpdates = [];

    for (const update of updates) {
      try {
        if (update.type === 'status_update') {
          await updateDeliveryStatus(
            routeId, 
            update.orderId, 
            update.data.status, 
            update.data.deliveryProof
          );
          processedUpdates.push({
            orderId: update.orderId,
            success: true,
            message: 'Estado actualizado correctamente'
          });
        }
      } catch (error) {
        processedUpdates.push({
          orderId: update.orderId,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`🔄 Procesadas ${processedUpdates.length} actualizaciones offline`);

    return {
      message: `Procesadas ${processedUpdates.length} actualizaciones`,
      processedUpdates
    };
  } catch (error) {
    console.error('❌ Error procesando actualizaciones offline:', error);
    throw error;
  }
};

// ==================== EXPORTAR TODOS LOS MÉTODOS ====================
module.exports = {
  optimizeRoute,
  assignRouteToDriver,
  startRoute,
  getActiveRouteForDriver,
  updateDeliveryStatus,
  processOfflineUpdates
};