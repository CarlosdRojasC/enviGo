const axios = require("axios");
const RoutePlan = require("../models/RoutePlan");
const GeoService = require("./routeOptimizer/geo.service");
const { Client } = require("@googlemaps/google-maps-services-js");

const geoService = new GeoService();
const googleMapsClient = new Client({});

const GOOGLE_DIRECTIONS_BATCH_SIZE = 25;

// Función auxiliar para obtener coordenadas
const getCoords = (point) => {
  if (point.location && typeof point.location.latitude !== 'undefined' && typeof point.location.longitude !== 'undefined') {
    return { lat: point.location.latitude, lng: point.location.longitude };
  } else if (typeof point.latitude !== 'undefined' && typeof point.longitude !== 'undefined') {
    return { lat: point.latitude, lng: point.longitude };
  } else {
    console.error("🚨 Punto de ruta con estructura de coordenadas inválida:", point);
    throw new Error("Punto de ruta inválido encontrado.");
  }
};


exports.optimizeRoute = async (config) => {
  const { startLocation, endLocation, orderIds, driverId, companyId, createdBy, preferences = {} } = config;

  if (!process.env.GOOGLE_MAPS_API_KEY) throw new Error("Falta GOOGLE_MAPS_API_KEY");
  if (!process.env.PYTHON_OPTIMIZER_URL) throw new Error("Falta PYTHON_OPTIMIZER_URL");

  // 1️⃣ Obtener pedidos válidos
  const orders = await geoService.validateOrderCoordinates(orderIds);
  if (orders.length === 0) throw new Error("No hay pedidos válidos para optimizar.");
  console.log(`✅ ${orders.length} órdenes validadas.`);

  // 2️⃣ Preparar ubicaciones para Python
  const locations = [
    getCoords(startLocation),
    ...orders.map(getCoords),
    getCoords(endLocation)
  ];

  let optimizedIndices;
  
  // 3️⃣ Llamar a Python
  try {
    console.log(`🐍 Llamando a Python OR-Tools en ${process.env.PYTHON_OPTIMIZER_URL}`);
    const pythonResponse = await axios.post(process.env.PYTHON_OPTIMIZER_URL, { locations, preferences });
    optimizedIndices = pythonResponse.data.route;
    if (!optimizedIndices || optimizedIndices.length === 0) throw new Error("Python no devolvió una ruta válida.");
    console.log(`🧠 Orden óptimo recibido.`);
  } catch (error) {
    console.error("❌ Error en Python:", error.message);
    throw new Error("El microservicio de optimización (Python) falló.");
  }

  // 4️⃣ Reconstruir secuencia completa
  const originalStopsForMapping = [startLocation, ...orders, endLocation];
  const optimizedStopSequence = optimizedIndices.map(index => originalStopsForMapping[index]);
  const orderedOrders = optimizedStopSequence.slice(1, -1);

  // 5️⃣ Llamar a Google Directions en LOTES
  let totalDistance = 0;
  let totalDuration = 0;
  let combinedPolylines = [];

  console.log(`🗺️ Iniciando llamadas en lote a Google Directions...`);
  
  for (let i = 0; i < optimizedStopSequence.length - 1; i += (GOOGLE_DIRECTIONS_BATCH_SIZE - 1)) {
    
    const batchPoints = optimizedStopSequence.slice(i, i + GOOGLE_DIRECTIONS_BATCH_SIZE);
    
    const origin = batchPoints[0];
    const destination = batchPoints[batchPoints.length - 1];
    const waypoints = batchPoints.slice(1, -1);

    const originLabel = originalStopsForMapping.indexOf(origin) === 0 ? 'Inicio' : `Orden ${orders.findIndex(o => o === origin) + 1}`;
    const destinationLabel = originalStopsForMapping.indexOf(destination) === originalStopsForMapping.length - 1 ? 'Fin' : `Orden ${orders.findIndex(o => o === destination) + 1}`;
    console.log(`...Lote ${Math.floor(i / (GOOGLE_DIRECTIONS_BATCH_SIZE - 1)) + 1}: ${originLabel} -> ${destinationLabel} (${waypoints.length} paradas)`);

    // Construir la petición
    const directionsRequest = {
      params: {
        // ✅ CORRECCIÓN: Usar getCoords directamente
        origin: getCoords(origin),
        // ✅ CORRECCIÓN: Usar getCoords directamente
        destination: getCoords(destination),
        // ✅ CORRECCIÓN: La estructura para waypoints es correcta
        waypoints: waypoints.map(wp => ({ location: getCoords(wp) })),
        optimizeWaypoints: false,
        travelMode: 'DRIVING',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 15000, 
    };

    // Loguear los parámetros (sin cambios)
    console.log(`➡️ Enviando parámetros a Directions (Lote ${Math.floor(i / (GOOGLE_DIRECTIONS_BATCH_SIZE - 1)) + 1}):`, JSON.stringify(directionsRequest.params, null, 2));
    try {
      const directionsResult = await googleMapsClient.directions(directionsRequest);
      
      if (directionsResult.data.routes && directionsResult.data.routes.length > 0) {
        const route = directionsResult.data.routes[0];
        
        for (const leg of route.legs) {
          totalDistance += leg.distance.value;
          totalDuration += leg.duration.value;
        }
        combinedPolylines.push(route.overview_polyline.points);
        
      } else {
        console.warn("⚠️ Google Directions no devolvió ruta para un lote.");
      }
    } catch (e) {
  console.error(`❌ ERROR COMPLETO en lote (${originLabel} -> ${destinationLabel}):`, JSON.stringify(e, Object.getOwnPropertyNames(e), 2)); 

  if (e.response) {
    console.error("🧾 Google API Response:", e.response.data);
    console.error("📦 Status:", e.response.status);
  } else if (e.request) {
    console.error("📡 Request enviado pero sin respuesta:", e.request);
  } else {
    console.error("💥 Error al configurar petición:", e.message);
  }

  const errorMsg = e.message || 'Error desconocido al llamar a Directions API';
  throw new Error(`Fallo en un lote de Google Directions (${originLabel} -> ${destinationLabel}): ${errorMsg}`);
}
  } // Fin del bucle for

  console.log(`✅ Lotes completados. Distancia: ${totalDistance}m, Duración: ${totalDuration}s`);

  // 6️⃣ Guardar en BD
  const routePlan = new RoutePlan({
    company: companyId,
    driver: driverId,
    createdBy,
    startLocation,
    endLocation,
    orders: orderedOrders.map((order, index) => ({
      order: order._id,
      sequenceNumber: index + 1,
      deliveryStatus: "pending",
    })),
    optimization: {
      algorithm: "python_or-tools+google_directions",
      totalDistance: totalDistance,
      totalDuration: totalDuration,
      overview_polyline: combinedPolylines.join(''),
    },
    status: "draft",
  });

  await routePlan.save();
  await routePlan.populate("driver orders.order");

  console.log("✅ Ruta híbrida optimizada y guardada en BD.");
  return routePlan;
};