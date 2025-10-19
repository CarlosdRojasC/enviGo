const axios = require("axios");
const RoutePlan = require("../models/RoutePlan");
const GeoService = require("./routeOptimizer/geo.service");
// ✅ ¡Volvemos a la librería simple!
const { Client } = require("@googlemaps/google-maps-services-js");

const geoService = new GeoService();
const googleMapsClient = new Client({});

// Límite de la API Directions (1 Origen + 1 Destino + 23 Waypoints)
const GOOGLE_DIRECTIONS_BATCH_SIZE = 25; 

/**
 * Optimiza una ruta usando el enfoque HÍBRIDO:
 * 1. Python (OR-Tools) para el ORDEN (sin límite)
 * 2. Google Directions API en LOTES para el MAPA (polilínea y tiempos)
 */
exports.optimizeRoute = async (config) => {
  const { startLocation, endLocation, orderIds, driverId, companyId, createdBy, preferences = {} } = config;

  // Validar variables de entorno clave
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("Falta GOOGLE_MAPS_API_KEY en variables de entorno");
  }
  if (!process.env.PYTHON_OPTIMIZER_URL) {
    throw new Error("Falta PYTHON_OPTIMIZER_URL en variables de entorno");
  }

  // 1️⃣ Obtener pedidos con coordenadas válidas
  const orders = await geoService.validateOrderCoordinates(orderIds);
  if (orders.length === 0) {
    throw new Error("No hay pedidos válidos para optimizar la ruta.");
  }
  console.log(`✅ ${orders.length} órdenes validadas con coordenadas.`);

  // 2️⃣ Preparar ubicaciones para Python
  // (Inicio, Parada 1...N, Fin)
  const locations = [
    { lat: startLocation.latitude, lng: startLocation.longitude },
    ...orders.map(o => ({ lat: o.location.latitude, lng: o.location.longitude })),
    { lat: endLocation.latitude, lng: endLocation.longitude }
  ];

  let optimizedIndices;
  
  // 3️⃣ Llamar al CEREBRO (Python) para obtener el ORDEN
  try {
    console.log(`🐍 Llamando a Python OR-Tools en ${process.env.PYTHON_OPTIMIZER_URL}`);
    const pythonResponse = await axios.post(process.env.PYTHON_OPTIMIZER_URL, { 
      locations, 
      preferences 
    });
    optimizedIndices = pythonResponse.data.route;
    if (!optimizedIndices || optimizedIndices.length === 0) {
      throw new Error("Python no devolvió una ruta válida.");
    }
    console.log(`🧠 Orden óptimo recibido de Python.`);
  } catch (error) {
    console.error("❌ Error en el optimizador de Python:", error.message);
    throw new Error("El microservicio de optimización (Python) falló.");
  }

  // 4️⃣ Reconstruir la secuencia de ruta COMPLETA
  const allStops = [startLocation, ...orders, endLocation];
  // Mapear los índices a los objetos de parada reales
  const optimizedStopSequence = optimizedIndices.map(index => allStops[index]);
  // Extraer solo las órdenes ordenadas (quitando inicio y fin)
  const orderedOrders = optimizedStopSequence.slice(1, -1);

  // 5️⃣ Llamar a los OJOS (Google Directions) en LOTES
  let totalDistance = 0;
  let totalDuration = 0;
  let combinedPolylines = []; // Almacenará las polilíneas de cada lote

  console.log(`🗺️ Iniciando llamadas en lote a Google Directions...`);
  
  // (BATCH_SIZE - 1) porque los lotes se superponen en 1 punto
  for (let i = 0; i < optimizedStopSequence.length - 1; i += (GOOGLE_DIRECTIONS_BATCH_SIZE - 1)) {
    
    // Tomar un lote de hasta 25 puntos
    const batchPoints = optimizedStopSequence.slice(i, i + GOOGLE_DIRECTIONS_BATCH_SIZE);
    
    // El primer punto es el origen
    const origin = batchPoints[0];
    // El último punto es el destino
    const destination = batchPoints[batchPoints.length - 1];
    // Los puntos intermedios son los waypoints
    const waypoints = batchPoints.slice(1, -1);

    console.log(`...Lote ${Math.floor(i / (GOOGLE_DIRECTIONS_BATCH_SIZE - 1)) + 1}: ${origin.address || 'Inicio'} -> ${destination.address || 'Fin'} (${waypoints.length} paradas)`);

    const directionsRequest = {
      params: {
        origin: { lat: origin.latitude, lng: origin.longitude },
        destination: { lat: destination.latitude, lng: destination.longitude },
        waypoints: waypoints.map(wp => ({ location: { lat: wp.location.latitude, lng: wp.location.longitude } })),
        optimizeWaypoints: false, // ‼️ CRÍTICO: El orden YA está optimizado
        travelMode: 'DRIVING',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    };

    try {
      const directionsResult = await googleMapsClient.directions(directionsRequest);
      if (directionsResult.data.routes && directionsResult.data.routes.length > 0) {
        const route = directionsResult.data.routes[0];
        
        // Sumar los totales
        for (const leg of route.legs) {
          totalDistance += leg.distance.value; // metros
          totalDuration += leg.duration.value; // segundos
        }
        
        // Guardar la polilínea del mapa
        combinedPolylines.push(route.overview_polyline.points);
        
      } else {
        console.warn("⚠️ Google Directions no devolvió una ruta para un lote.");
      }
    } catch (e) {
      console.error("❌ ERROR en lote de Google Directions:", e.response ? e.response.data.error_message : e.message);
      // Omitir este lote y continuar, o lanzar un error
      throw new Error(`Fallo en un lote de Google Directions: ${e.message}`);
    }
  }

  console.log(`✅ Lotes completados. Distancia: ${totalDistance}m, Duración: ${totalDuration}s`);

  // 6️⃣ Guardar en BD
  const routePlan = new RoutePlan({
    company: companyId,
    driver: driverId,
    createdBy,
    startLocation,
    endLocation,
    // Guardar la secuencia de ÓRDENES optimizadas
    orders: orderedOrders.map((order, index) => ({
      order: order._id,
      sequenceNumber: index + 1,
      deliveryStatus: "pending",
    })),
    optimization: {
      algorithm: "python_or-tools",
      totalDistance: totalDistance,
      totalDuration: totalDuration,
      // Unir todas las polilíneas (esto puede tener saltos, pero es lo mejor que se puede hacer)
      // Tu frontend tendrá que dibujar múltiples polilíneas
      overview_polyline: combinedPolylines.join(''), // Simple concatenación
      // O mejor, guardar el array
      // polylines_array: combinedPolylines // (requiere cambio en modelo)
    },
    status: "draft",
  });

  await routePlan.save();
  await routePlan.populate("driver orders.order");

  console.log("✅ Ruta híbrida optimizada y guardada en BD.");
  return routePlan;
};

// ❌ Eliminamos la función getAccessToken y fallbackToOSRM