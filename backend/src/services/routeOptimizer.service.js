const axios = require('axios');
const { VehicleRoutingIndexManager, RoutingModel, DefaultRoutingSearchParameters } = require('ortools');
const RoutePlan = require('../models/RoutePlan');
const Order = require('../models/Order');

class RouteOptimizerService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  /**
   * 🔹 Optimiza una ruta usando OR-Tools (sin límite de waypoints)
   */
  async optimizeRoute(routeConfig) {
    try {
      const { orderIds, driverId, companyId, createdBy, preferences = {}, startLocation, endLocation } = routeConfig;

      // 1️⃣ Obtener pedidos
      const orders = await Order.find({ _id: { $in: orderIds }, company: companyId });
      if (!orders.length) throw new Error('No se encontraron pedidos válidos');

      // 2️⃣ Geocodificar direcciones de pedidos
      const geocodedOrders = await Promise.all(
        orders.map(async (order) => {
          const address = `${order.shipping_address}, ${order.shipping_commune}, Chile`;
          const geo = await this.geocodeAddress(address);
          if (!geo) {
            console.warn(`⚠️ No se pudo geocodificar la dirección: "${address}"`);
            return null;
          }
          return {
            order,
            lat: geo.lat,
            lng: geo.lng,
            fullAddress: address
          };
        })
      );

      const validOrders = geocodedOrders.filter(Boolean);
      if (!validOrders.length) throw new Error('No se pudieron geocodificar las direcciones de los pedidos');

      // 3️⃣ Construir matriz de distancias
      const locations = [
        { lat: startLocation.latitude, lng: startLocation.longitude }, // origen
        ...validOrders.map(o => ({ lat: o.lat, lng: o.lng })),
        { lat: endLocation.latitude, lng: endLocation.longitude } // destino
      ];

      const distanceMatrix = this.buildDistanceMatrix(locations);

      // 4️⃣ Optimizar secuencia con OR-Tools
      const optimizedOrder = this.solveVRP(distanceMatrix);

      // 5️⃣ Crear lista ordenada
      const optimizedSequence = optimizedOrder
        .slice(1, -1) // quita origen y destino
        .map(index => validOrders[index - 1]);

      // 6️⃣ Crear RoutePlan
      const routePlan = new RoutePlan({
        company: companyId,
        driver: driverId,
        createdBy,
        startLocation,
        endLocation,
        orders: optimizedSequence.map((o, i) => ({
          order: o.order._id,
          sequenceNumber: i + 1,
          estimatedArrival: new Date(Date.now() + (i * 10 * 60 * 1000)), // 10 min por parada aprox
          deliveryStatus: 'pending'
        })),
        optimization: {
          totalDistance: this.calculateTotalDistance(distanceMatrix, optimizedOrder),
          totalDuration: 0,
          algorithm: 'or-tools-vrp',
          optimizedAt: new Date()
        },
        preferences,
        status: 'draft'
      });

      await routePlan.save();
      await routePlan.populate('orders.order driver');

      return {
        success: true,
        routePlan,
        summary: {
          totalOrders: routePlan.orders.length,
          totalDistance: routePlan.optimization.totalDistance,
          estimatedTime: `${Math.round(routePlan.optimization.totalDistance / 30)} min aprox`
        }
      };
    } catch (error) {
      console.error('❌ Error optimizando ruta:', error);
      throw new Error(`Error en optimización: ${error.message}`);
    }
  }

  /**
   * 🗺️ Geocodifica una dirección con Google
   */
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

  /**
   * 📏 Calcula distancia entre dos puntos (Haversine)
   */
  haversineDistance(a, b) {
    const R = 6371; // km
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const aHav = Math.sin(dLat/2)**2 + Math.sin(dLon/2)**2 * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(aHav), Math.sqrt(1 - aHav));
  }

  /**
   * 🧮 Crea matriz de distancias NxN
   */
  buildDistanceMatrix(locations) {
    const matrix = [];
    for (let i = 0; i < locations.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < locations.length; j++) {
        matrix[i][j] = i === j ? 0 : this.haversineDistance(locations[i], locations[j]);
      }
    }
    return matrix;
  }

  /**
   * 🤖 Usa OR-Tools para resolver el VRP
   */
  solveVRP(distanceMatrix) {
    const numLocations = distanceMatrix.length;
    const manager = new VehicleRoutingIndexManager(numLocations, 1, [0], [numLocations - 1]);
    const routing = new RoutingModel(manager);

    const distanceCallback = (fromIndex, toIndex) => {
      const fromNode = manager.IndexToNode(fromIndex);
      const toNode = manager.IndexToNode(toIndex);
      return Math.round(distanceMatrix[fromNode][toNode] * 1000); // metros
    };

    const transitCallbackIndex = routing.RegisterTransitCallback(distanceCallback);
    routing.SetArcCostEvaluatorOfAllVehicles(transitCallbackIndex);

    const searchParams = new DefaultRoutingSearchParameters();
    searchParams.first_solution_strategy = 3; // PATH_CHEAPEST_ARC
    searchParams.time_limit = { seconds: 10 };

    const solution = routing.SolveWithParameters(searchParams);
    if (!solution) throw new Error('No se pudo encontrar solución óptima');

    const route = [];
    let index = routing.Start(0);
    while (!routing.IsEnd(index)) {
      route.push(manager.IndexToNode(index));
      index = solution.Value(routing.NextVar(index));
    }
    route.push(manager.IndexToNode(index));
    return route;
  }

  /**
   * 📏 Suma total de distancia recorrida en km
   */
  calculateTotalDistance(matrix, route) {
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      total += matrix[route[i]][route[i + 1]];
    }
    return Math.round(total * 100) / 100;
  }
}

module.exports = new RouteOptimizerService();
