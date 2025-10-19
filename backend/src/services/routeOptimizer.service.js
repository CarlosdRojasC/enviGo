// backend/src/services/routeOptimizer.service.js
const axios = require("axios");
const RoutePlan = require("../models/RoutePlan");
const Order = require("../models/Order");
const GeoService = require("./routeOptimizer/geo.service");

const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

const geoService = new GeoService();

/**
 * Optimiza una ruta utilizando Google Route Optimization API
 * @param {Object} config
 * @returns {Object}
 */
exports.optimizeRoute = async (config) => {
  const {
    startLocation,
    endLocation,
    orderIds,
    driverId,
    companyId,
    createdBy,
  } = config;

  if (!startLocation || !endLocation || !orderIds?.length) {
    throw new Error("Faltan datos para optimizar la ruta.");
  }

  // Obtener pedidos con coordenadas válidas
  const orders = await geoService.validateOrderCoordinates(orderIds);
  if (orders.length === 0) {
    throw new Error("No hay pedidos válidos para optimizar la ruta.");
  }

  // Construir puntos intermedios
  const intermediates = orders.map((order) => ({
    location: {
      latLng: {
        latitude: order.location.latitude,
        longitude: order.location.longitude,
      },
    },
  }));

  const body = {
    origin: { location: { latLng: startLocation } },
    destination: { location: { latLng: endLocation } },
    intermediates,
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE_OPTIMAL",
    optimizeWaypointOrder: true,
    polylineQuality: "HIGH_QUALITY",
  };

  try {
    const response = await axios.post(GOOGLE_ROUTES_URL, body, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask":
          "routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration,routes.polyline",
      },
    });

    const route = response.data.routes?.[0];
    if (!route) throw new Error("No se obtuvo una ruta optimizada.");

    // Ordenar pedidos según el índice optimizado
    const orderedOrders = route.optimizedIntermediateWaypointIndex.map((i, idx) => ({
      order: orders[i]._id,
      sequenceNumber: idx + 1,
      deliveryStatus: "pending",
    }));

    // Crear plan de ruta
    const routePlan = new RoutePlan({
      company: companyId,
      driver: driverId,
      createdBy,
      startLocation,
      endLocation,
      orders: orderedOrders,
      optimization: {
        totalDistance: route.distanceMeters,
        totalDuration: route.duration,
        overview_polyline: route.polyline.encodedPolyline,
      },
      status: "draft",
    });

    await routePlan.save();
    await routePlan.populate("driver orders.order");

    return routePlan;
  } catch (error) {
    console.error("❌ Error en optimización con Google API:", error.response?.data || error.message);
    throw new Error("Error optimizando la ruta con Google Maps API");
  }
};
