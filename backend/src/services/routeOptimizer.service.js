const axios = require('axios');
const RoutePlan = require('../models/RoutePlan');
const Order = require('../models/Order');

class RouteOptimizerService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.pythonOptimizerUrl = process.env.PYTHON_OPTIMIZER_URL || 'http://localhost:5001/optimize';
  }

  /**
   * 🔹 Optimiza y asigna una ruta completa (usa OR-Tools o heurístico)
   */
  async optimizeRoute(routeConfig) {
    try {
      const { orderIds, driverId, companyId, createdBy, preferences = {}, startLocation, endLocation } = routeConfig;

      // 1️⃣ Buscar pedidos válidos
      const orders = await Order.find({ _id: { $in: orderIds }, company: companyId });
      if (!orders.length) throw new Error('No se encontraron pedidos válidos');

      // 2️⃣ Geocodificar direcciones
      const geocodedOrders = await Promise.all(
        orders.map(async (order) => {
          const address = `${order.shipping_address}, ${order.shipping_commune || ''}, Chile`;
          const geo = await this.geocodeAddress(address);
          if (!geo) {
            console.warn(`⚠️ No se pudo geocodificar: "${address}"`);
            return null;
          }
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

      let optimizedOrder;
      let usedEngine = 'heuristic';

      // 4️⃣ Intentar optimizar con microservicio Python
      try {
        console.log(`🚀 Intentando optimización OR-Tools en ${this.pythonOptimizerUrl}`);
        const res = await axios.post(this.pythonOptimizerUrl, { locations }, { timeout: 8000 });
        if (res.data && res.data.route && res.data.route.length) {
          optimizedOrder = res.data.route;
          usedEngine = 'or-tools';
          console.log('✅ OR-Tools devolvió una ruta válida.');
        } else {
          console.warn('⚠️ OR-Tools devolvió respuesta vacía, se usará heurístico.');
        }
      } catch (err) {
        console.warn('⚠️ Falló optimizador OR-Tools, usando heurístico:', err.message);
      }

      // 5️⃣ Si no hay ruta desde OR-Tools → fallback heurístico
      if (!optimizedOrder) {
        optimizedOrder = this.heuristicOptimize(
          { lat: startLocation.latitude, lng: startLocation.longitude },
          validOrders,
          { lat: endLocation.latitude, lng: endLocation.longitude }
        );
      }

      // 6️⃣ Generar secuencia de pedidos
      const sequence =
        usedEngine === 'or-tools'
          ? optimizedOrder.slice(1, -1).map(i => validOrders[i - 1])
          : optimizedOrder;

      // 7️⃣ Crear y asignar RoutePlan
      const routePlan = new RoutePlan({
        company: companyId,
        driver: driverId,
        createdBy,
        startLocation,
        endLocation,
        orders: sequence.map((o, i) => ({
          order: o.order._id,
          sequenceNumber: i + 1,
          estimatedArrival: new Date(Date.now() + i * 10 * 60 * 1000),
          deliveryStatus: 'pending'
        })),
        optimization: {
          algorithm: usedEngine,
          optimizedAt: new Date(),
          totalDistance: this.estimateTotalDistance(sequence)
        },
        preferences,
        status: 'assigned',
        assignedAt: new Date()
      });

      await routePlan.save();
      await routePlan.populate('orders.order driver');

      // 8️⃣ Marcar pedidos como asignados
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
          totalDistance: routePlan.optimization.totalDistance,
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

    return route;
  }

  /** 📏 Distancia Haversine */
  haversineDistance(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const aHav = Math.sin(dLat/2)**2 + Math.sin(dLon/2)**2 * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(aHav), Math.sqrt(1 - aHav));
  }

  /** 📊 Estimar distancia total */
  estimateTotalDistance(sequence) {
    let total = 0;
    for (let i = 0; i < sequence.length - 1; i++) {
      total += this.haversineDistance(sequence[i], sequence[i + 1]);
    }
    return Math.round(total * 100) / 100;
  }
}

module.exports = new RouteOptimizerService();
