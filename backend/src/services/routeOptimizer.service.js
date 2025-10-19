const axios = require("axios");
const RoutePlan = require("../models/RoutePlan");
const GeoService = require("./routeOptimizer/geo.service");

// ✅ URL CORRECTA para Route Optimization API
const GOOGLE_ROUTE_OPTIMIZATION_URL = 
  "https://routeoptimization.googleapis.com/v1/projects/{PROJECT_ID}/optimizeToursRequest:optimizeTours";

const geoService = new GeoService();

/**
 * Optimiza una ruta utilizando Google Route Optimization API
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

  // Verificar variables de entorno necesarias
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("Falta GOOGLE_MAPS_API_KEY en variables de entorno");
  }

  if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
    throw new Error("Falta GOOGLE_CLOUD_PROJECT_ID en variables de entorno");
  }

  // 🧭 Obtener pedidos con coordenadas válidas
  const orders = await geoService.validateOrderCoordinates(orderIds);
  if (orders.length === 0) {
    throw new Error("No hay pedidos válidos para optimizar la ruta.");
  }

  // 🚗 Definir vehículo con la estructura correcta
  const vehicle = {
    startWaypoint: {
      location: {
        latLng: {
          latitude: startLocation.latitude,
          longitude: startLocation.longitude,
        },
      },
    },
    endWaypoint: {
      location: {
        latLng: {
          latitude: endLocation.latitude,
          longitude: endLocation.longitude,
        },
      },
    },
    travelMode: "DRIVING", // ✅ Cambio: era "DRIVE"
    costPerKilometer: 1.0,
    costPerHour: 10.0,
  };

  // 📦 Crear los "shipments" (entregas) con estructura correcta
  const shipments = orders.map((order, index) => ({
    deliveries: [
      {
        arrivalWaypoint: {
          location: {
            latLng: {
              latitude: order.location.latitude,
              longitude: order.location.longitude,
            },
          },
        },
        duration: "120s", // ✅ Formato correcto de duración
        timeWindows: [
          {
            startTime: "2025-10-19T08:00:00Z",
            endTime: "2025-10-19T18:00:00Z",
          },
        ],
      },
    ],
    label: `order_${index + 1}`, // ✅ Usar label en lugar de name
  }));

  // 🧩 Estructura correcta del request
  const requestBody = {
    parent: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}`,
    model: {
      shipments,
      vehicles: [vehicle],
      globalStartTime: "2025-10-19T08:00:00Z",
      globalEndTime: "2025-10-19T20:00:00Z",
    },
  };

  // ✅ Construir URL con PROJECT_ID
  const apiUrl = GOOGLE_ROUTE_OPTIMIZATION_URL.replace(
    "{PROJECT_ID}", 
    process.env.GOOGLE_CLOUD_PROJECT_ID
  );

  console.log("🛣️ Llamando a Google Route Optimization API...");
  console.log("📍 URL:", apiUrl);

  try {
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${await getAccessToken()}`, // ✅ OAuth en lugar de API Key
      },
    });

    const solution = response.data;
    if (!solution || !solution.routes || solution.routes.length === 0) {
      throw new Error("No se recibió una solución de optimización válida.");
    }

    const route = solution.routes[0];

    // 🔢 Procesar la respuesta optimizada
    const orderedDeliveries = [];
    if (route.visits) {
      route.visits.forEach((visit, index) => {
        if (visit.shipmentIndex !== undefined) {
          const order = orders[visit.shipmentIndex];
          if (order) {
            orderedDeliveries.push({
              order: order._id,
              sequenceNumber: index + 1,
              deliveryStatus: "pending",
            });
          }
        }
      });
    }

    // 🗺️ Guardar en BD
    const routePlan = new RoutePlan({
      company: companyId,
      driver: driverId,
      createdBy,
      startLocation,
      endLocation,
      orders: orderedDeliveries,
      optimization: {
        algorithm: "google_route_optimization",
        totalDistance: route.routeDistanceMeters || 0,
        totalDuration: route.routeDuration || "0s",
        overview_polyline: route.routePolyline?.encodedPolyline || null,
      },
      status: "draft",
    });

    await routePlan.save();
    await routePlan.populate("driver orders.order");

    console.log("✅ Ruta optimizada correctamente con Route Optimization API.");
    return routePlan;

  } catch (error) {
    console.error("❌ Error en optimización con Route Optimization API:");
    console.error("🧾 Status:", error.response?.status);
    console.error("📡 URL llamada:", apiUrl);
    console.error("📋 Response:", error.response?.data);
    console.error("📨 Request body:", JSON.stringify(requestBody, null, 2));
    
    // Si falla Google API, usar fallback a OSRM
    console.log("🔄 Intentando con OSRM como fallback...");
    return await fallbackToOSRM(config);
  }
};

/**
 * Obtener token de acceso OAuth para Google Cloud
 */
async function getAccessToken() {
  try {
    // Si estás en Google Cloud (App Engine, Cloud Run, etc.)
    const metadataUrl = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
    const response = await axios.get(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' }
    });
    return response.data.access_token;
  } catch (error) {
    // Fallback: usar Google Application Default Credentials
    console.log("⚠️ No se pudo obtener token desde metadata, usando API Key como fallback");
    throw new Error("Configurar autenticación OAuth para Route Optimization API");
  }
}

/**
 * Fallback a OSRM si Google Route Optimization falla
 */
async function fallbackToOSRM(config) {
  console.log("🔄 Usando OSRM como método de optimización alternativo...");
  
  const RouteOptimizerService = require("./routeOptimizer/index");
  return await RouteOptimizerService.optimizeRoute(config);
}