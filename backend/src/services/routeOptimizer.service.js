const axios = require('axios');
const RoutePlan = require('../models/RoutePlan');
const Order = require('../models/Order');
// 👇 AÑADIR ESTA LÍNEA
const { Client } = require("@googlemaps/google-maps-services-js");

class RouteOptimizerService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.pythonOptimizerUrl = process.env.PYTHON_OPTIMIZER_URL || 'http://localhost:5001/optimize';
    // 👇 AÑADIR ESTA LÍNEA
    this.googleMapsClient = new Client({});
  }

  /**
   * 🔹 Optimiza y asigna una ruta completa (usa OR-Tools o heurístico)
   */
  async optimizeRoute(routeConfig) {
    try {
      const { orderIds, driverId, companyId, company, createdBy, preferences = {}, startLocation, endLocation } = routeConfig;
      const companyRef = companyId || company;

      // 1️⃣ Buscar pedidos válidos
      const orders = await Order.find({ _id: { $in: orderIds }, company: companyRef });
      if (!orders.length) throw new Error('No se encontraron pedidos válidos');

      // 2️⃣ Geocodificar direcciones
      const geocodedOrders = await Promise.all(
        orders.map(async (order) => {
          // Asumir que el pedido ya puede tener coords, si no, geocodificar
          if (order.location && order.location.latitude) {
            return { order, lat: order.location.latitude, lng: order.location.longitude, fullAddress: order.shipping_address };
          }
          
          const address = `${order.shipping_address}, ${order.shipping_commune || ''}, Chile`;
          const geo = await this.geocodeAddress(address);
          if (!geo) {
            console.warn(`⚠️ No se pudo geocodificar: "${address}"`);
            return null;
          }
          // Opcional: Guardar la geocodificación en la orden
          // await Order.updateOne({ _id: order._id }, { $set: { location: { latitude: geo.lat, longitude: geo.lng } } });
          return { order, lat: geo.lat, lng: geo.lng, fullAddress: address };
        })
      );

      const validOrders = geocodedOrders.filter(Boolean);
      if (!validOrders.length) throw new Error('No se pudieron geocodificar direcciones');

      // 3️⃣ Preparar ubicaciones
      const locations = [
        { lat: startLocation.latitude, lng: startLocation.longitude },
        ...validOrders.map(o => ({ lat: o.lat, lng: o.lng })),
        { lat: endLocation.latitude, lng: endLocation.longitude }
      ];

      let optimizedOrderIndexes; // Nombres de variables más claros
      let usedEngine = 'heuristic';

      // 4️⃣ Intentar optimizar con microservicio Python
      try {
        console.log(`🚀 Intentando optimización OR-Tools en ${this.pythonOptimizerUrl}`);
        
        // 👇 ¡CAMBIO! Enviar también las preferencias
        const optimizerPayload = {
          locations,
          preferences: preferences || { prioritizeTime: true }
        };
        
        const res = await axios.post(this.pythonOptimizerUrl, optimizerPayload, { timeout: 8000 }); // 👈 CAMBIO
        
        if (res.data && res.data.route && res.data.route.length) {
          optimizedOrderIndexes = res.data.route; // Esto son ÍNDICES
          usedEngine = 'or-tools';
          console.log('✅ OR-Tools devolvió una ruta válida.');
        } else {
          console.warn('⚠️ OR-Tools devolvió respuesta vacía, se usará heurístico.');
        }
      } catch (err) {
        console.warn('⚠️ Falló optimizador OR-Tools, usando heurístico:', err.message);
      }

      let sequence; // Esta será la secuencia de OBJETOS de pedido

      // 5️⃣ Si no hay ruta desde OR-Tools → fallback heurístico
      if (!optimizedOrderIndexes) {
        sequence = this.heuristicOptimize(
          { lat: startLocation.latitude, lng: startLocation.longitude },
          validOrders,
          { lat: endLocation.latitude, lng: endLocation.longitude }
        );
        usedEngine = 'heuristic';
      } else {
        // 6️⃣ Generar secuencia de pedidos desde los ÍNDICES
        sequence = optimizedOrderIndexes
          .slice(1, -1) // Quitar índice 0 (inicio) e índice final (fin)
          .map(i => validOrders[i - 1]); // Mapear índice a objeto de pedido
      }

      // 7️⃣ ¡NUEVO PASO CRÍTICO! Obtener la ruta real y polilínea de Google
      const waypoints = sequence.map(o => ({
        location: { lat: o.lat, lng: o.lng }
      }));

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
        const directionsResult = await this.googleMapsClient.directions(directionsRequest);
        if (directionsResult.data.routes && directionsResult.data.routes.length > 0) {
          routeData = directionsResult.data.routes[0];
          console.log('✅ Ruta real obtenida de Google Directions');
          
          for (const leg of routeData.legs) {
            totalDistance += leg.distance.value;
            totalDuration += leg.duration.value;
          }
        }
      } catch (e) {
        console.error('⚠️ Error al llamar a Google Directions API', e.message);
        // Fallback a la estimación Haversine si Google falla
        totalDistance = this.estimateTotalDistance(sequence, startLocation, endLocation);
      }

      // 8️⃣ Crear y asignar RoutePlan (antes 7️⃣)
      const routePlan = new RoutePlan({
        company: companyRef,
        driver: driverId,
        createdBy,
        startLocation,
        endLocation,
        orders: sequence.map((o, i) => ({
          order: o.order._id,
          sequenceNumber: i + 1,
          // Estimar llegada usando los datos reales de Google
          estimatedArrival: new Date(Date.now() + (routeData ? routeData.legs.slice(0, i + 1).reduce((acc, leg) => acc + leg.duration.value, 0) * 1000 : (i + 1) * 10 * 60 * 1000)),
          deliveryStatus: 'pending'
        })),
        optimization: {
          algorithm: usedEngine,
          optimizedAt: new Date(),
          
          // 👇 ¡CAMBIOS CLAVE! Usar los datos reales
          totalDistance: totalDistance, // en metros
          totalDuration: totalDuration, // en segundos
          overview_polyline: routeData ? routeData.overview_polyline.points : null,
          map_bounds: routeData ? routeData.bounds : null,
          googleRouteData: routeData // Opcional: guardar todo
        },
        preferences,
        status: 'assigned',
        assignedAt: new Date()
      });

      await routePlan.save();
      await routePlan.populate('orders.order driver');

      // 9️⃣ Marcar pedidos como asignados (antes 8️⃣)
      await Order.updateMany(
        { _id: { $in: routePlan.orders.map(o => o.order._id || o.order) } },
        { status: 'assigned', assigned_driver: driverId, assigned_at: new Date() }
      );

      return {
        success: true,
        message: `Ruta optimizada y asignada (${usedEngine})`,
        routePlan,
        summary: {
          totalOrders: routePlan.orders.length,
          driver: routePlan.driver.full_name,
          totalDistance: routePlan.optimization.totalDistance, // ya está en metros
          totalDuration: routePlan.optimization.totalDuration, // en segundos
          algorithm: usedEngine
        }
      };
    } catch (error) {
      console.error('❌ Error optimizando ruta:', error);
      throw new Error(`Error en optimización: ${error.message}`);
    }
  }

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
    
    // Nota: 'end' no se usa aquí, pero se incluirá en el cálculo de Google Directions
    return route;
  }

  /** 📏 Distancia Haversine (en METROS) */
  haversineDistance(a, b) {
    const R = 6371000; // 👈 CAMBIO: Radio en metros
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const aHav = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(aHav), Math.sqrt(1 - aHav));
  }

  /** 📊 Estimar distancia total (en METROS) */
  estimateTotalDistance(sequence, start, end) {
    if (!sequence.length) return 0;
    
    let total = 0;
    // De Inicio a primera orden
    total += this.haversineDistance(start, sequence[0]);
    
    // Entre órdenes
    for (let i = 0; i < sequence.length - 1; i++) {
      total += this.haversineDistance(sequence[i], sequence[i + 1]);
    }
    
    // De última orden a Fin
    total += this.haversineDistance(sequence[sequence.length - 1], end);
    
    return Math.round(total);
  }
}

module.exports = new RouteOptimizerService();