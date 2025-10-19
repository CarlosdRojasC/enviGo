// /app/src/services/routeOptimizer.service.js
const axios = require("axios");
const RoutePlan = require("../models/RoutePlan");
const GeoService = require("./routeOptimizer/geo.service");
const { Client } = require("@googlemaps/google-maps-services-js");

const geoService = new GeoService();
const googleMapsClient = new Client({});

// ====== Constantes de configuración ======
const GOOGLE_DIRECTIONS_BATCH_POINTS = 25; // puntos por request (origen + (hasta 23 waypoints) + destino)
const GOOGLE_MAX_WAYPOINTS = GOOGLE_DIRECTIONS_BATCH_POINTS - 2;
const DIRECTIONS_TIMEOUT_MS = Number(process.env.DIRECTIONS_TIMEOUT_MS || 30000);
const MAX_RETRIES = Number(process.env.DIRECTIONS_MAX_RETRIES || 5);
const BASE_BACKOFF_MS = Number(process.env.DIRECTIONS_BASE_BACKOFF_MS || 500);

// ====== Utilidades ======
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (n) => Math.floor(n * (0.75 + Math.random() * 0.5));

const isNumber = (v) => typeof v === "number" && !Number.isNaN(v);

const getCoords = (point) => {
  if (
    point &&
    point.location &&
    typeof point.location.latitude !== "undefined" &&
    typeof point.location.longitude !== "undefined"
  ) {
    return { lat: Number(point.location.latitude), lng: Number(point.location.longitude) };
  } else if (
    point &&
    typeof point.latitude !== "undefined" &&
    typeof point.longitude !== "undefined"
  ) {
    return { lat: Number(point.latitude), lng: Number(point.longitude) };
  }
  console.error("🚨 Punto de ruta con estructura de coordenadas inválida:", point);
  throw new Error("Punto de ruta inválido encontrado.");
};

const validateCoords = (c) => !!(c && isNumber(c.lat) && isNumber(c.lng));

/**
 * Decodificador/encodificador de polylines (Google Polyline Algorithm)
 * Implementación sin dependencias
 */
const decodePolyline = (str) => {
  let index = 0, lat = 0, lng = 0, points = [];

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

/**
 * Llama a Directions con reintentos y backoff.
 * Maneja errores de cuota/servidor/timeout y estados propios de la API.
 */
async function callDirectionsWithRetry(params, labelsForLog) {
  let attempt = 0;

  while (true) {
    try {
      const res = await googleMapsClient.directions({
        params,
        timeout: DIRECTIONS_TIMEOUT_MS,
      });

      // Revisa el payload de Google
      const payload = res?.data;
      const gStatus = payload?.status;
      const gMessage = payload?.error_message;

      if (gStatus && gStatus !== "OK") {
        // Estados que merecen reintento
        const retriableStatuses = new Set([
          "OVER_QUERY_LIMIT",
          "UNKNOWN_ERROR",
          "RESOURCE_EXHAUSTED",
          "INTERNAL_ERROR",
        ]);
        if (retriableStatuses.has(gStatus) && attempt < MAX_RETRIES) {
          attempt++;
          const wait = jitter(BASE_BACKOFF_MS * Math.pow(2, attempt));
          console.warn(
            `⏳ Google status=${gStatus} (intentando reintento ${attempt}/${MAX_RETRIES} en ${wait}ms)`,
            gMessage ? `— ${gMessage}` : ""
          );
          await sleep(wait);
          continue;
        }

        // No retriable o agotó intentos
        const human = gMessage || gStatus || "Error de Google Directions";
        throw Object.assign(new Error(human), { googleStatus: gStatus, googlePayload: payload });
      }

      return res;
    } catch (e) {
      // Axios/HTTP
      const statusCode = e?.response?.status;
      const code = e?.code;

      // Códigos HTTP que vale la pena reintentar
      const retriableHttp = statusCode && [408, 409, 413, 429, 500, 502, 503, 504].includes(statusCode);
      const retriableCode = code && ["ECONNRESET", "ETIMEDOUT", "ECONNABORTED", "EAI_AGAIN"].includes(code);

      const payload = e?.response?.data;
      const payloadStatus = payload?.status;

      // También reintentar si Google vino con status retriable en el body
      const retriableGoogle =
        payloadStatus && ["OVER_QUERY_LIMIT", "UNKNOWN_ERROR", "RESOURCE_EXHAUSTED", "INTERNAL_ERROR"].includes(payloadStatus);

      // Log enriquecido
      console.error(
        `❌ Directions fallo (${labelsForLog}) — intento ${attempt}/${MAX_RETRIES}\n` +
        `HTTP status: ${statusCode || "n/a"} | code: ${code || "n/a"}\n` +
        `Google status: ${payloadStatus || "n/a"} | message: ${payload?.error_message || e?.message || "(sin mensaje)"}`
      );
      if (payload) {
        console.error("🧾 Respuesta Google:", JSON.stringify(payload, null, 2));
      } else if (e?.request) {
        console.error("📡 Request sin respuesta (timeout o red).");
      }

      if ((retriableHttp || retriableCode || retriableGoogle) && attempt < MAX_RETRIES) {
        attempt++;
        const wait = jitter(BASE_BACKOFF_MS * Math.pow(2, attempt));
        console.warn(`⏳ Reintentando en ${wait}ms...`);
        await sleep(wait);
        continue;
      }

      // Sin reintento posible
      throw e;
    }
  }
}

/**
 * Mapea preferencias del usuario a parámetros de Directions (seguros si no se usan)
 */
function buildPreferences(preferences = {}) {
  const avoidList = [];
  if (preferences.avoidTolls) avoidList.push("tolls");
  if (preferences.avoidHighways) avoidList.push("highways");
  if (preferences.avoidFerries) avoidList.push("ferries");
  if (preferences.avoidIndoor) avoidList.push("indoor");

  const params = {};
  if (avoidList.length) params.avoid = avoidList;

  // language/region opcionales
  if (preferences.language) params.language = preferences.language;
  if (preferences.region) params.region = preferences.region;

  return params;
}

exports.optimizeRoute = async (config) => {
  const { startLocation, endLocation, orderIds, driverId, companyId, createdBy, preferences = {} } = config;

  if (!process.env.GOOGLE_MAPS_API_KEY) throw new Error("Falta GOOGLE_MAPS_API_KEY");
  if (!process.env.PYTHON_OPTIMIZER_URL) throw new Error("Falta PYTHON_OPTIMIZER_URL");

  // 1) Validar y obtener pedidos
  const orders = await geoService.validateOrderCoordinates(orderIds);
  if (!orders || orders.length === 0) throw new Error("No hay pedidos válidos para optimizar.");
  console.log(`✅ ${orders.length} órdenes validadas.`);

  // 2) Preparar locations para Python
  const locations = [
    getCoords(startLocation),
    ...orders.map(getCoords),
    getCoords(endLocation),
  ];

  // Seguridad extra
  locations.forEach((c, idx) => {
    if (!validateCoords(c)) throw new Error(`Coordenadas inválidas en índice ${idx} (lat/lng requeridos numéricos).`);
  });

  let optimizedIndices;

  // 3) Llamar al microservicio Python (OR-Tools)
  try {
    console.log(`🐍 Llamando a Python OR-Tools en ${process.env.PYTHON_OPTIMIZER_URL}`);
    const pythonResponse = await axios.post(
      process.env.PYTHON_OPTIMIZER_URL,
      { locations, preferences },
      { timeout: Number(process.env.PYTHON_OPTIMIZER_TIMEOUT_MS || 45000) }
    );

    optimizedIndices = pythonResponse?.data?.route;
    if (!Array.isArray(optimizedIndices) || optimizedIndices.length === 0) {
      console.error("🔎 Respuesta Python:", pythonResponse?.data);
      throw new Error("Python no devolvió una ruta válida.");
    }
    console.log(`🧠 Orden óptimo recibido (${optimizedIndices.length} nodos).`);
  } catch (error) {
    console.error("❌ Error en Python:", error?.message, error?.response?.data ? `| ${JSON.stringify(error.response.data)}` : "");
    throw new Error("El microservicio de optimización (Python) falló.");
  }

  // 4) Reconstruir secuencia completa de paradas según índices
  const originalStopsForMapping = [startLocation, ...orders, endLocation];
  const optimizedStopSequence = optimizedIndices.map((index) => {
    const stop = originalStopsForMapping[index];
    if (!stop) throw new Error(`Índice ${index} inexistente en la secuencia original.`);
    return stop;
  });

  // Ordenes en medio (sin start/end)
  const orderedOrders = optimizedStopSequence.slice(1, -1);

  // 5) Llamar a Google Directions en LOTES
  console.log(`🗺️ Iniciando llamadas en lote a Google Directions...`);

  let totalDistance = 0;
  let totalDuration = 0;

  // Para construir un único polyline completo:
  const fullPathPoints = [];
  const polylineSegments = []; // por si quieres dibujar lote por lote

  // Preferencias adicionales
  const prefParams = buildPreferences(preferences);

  // i avanza de (BATCH_POINTS - 1) para encadenar destino de lote N = origen de lote N+1
  for (let i = 0; i < optimizedStopSequence.length - 1; i += (GOOGLE_DIRECTIONS_BATCH_POINTS - 1)) {
    const batchPoints = optimizedStopSequence.slice(i, i + GOOGLE_DIRECTIONS_BATCH_POINTS);

    // Validaciones
    if (batchPoints.length < 2) continue; // nada que rutear
    if (batchPoints.length - 2 > GOOGLE_MAX_WAYPOINTS) {
      throw new Error(`El lote ${i} excede el máximo de waypoints (${GOOGLE_MAX_WAYPOINTS}).`);
    }

    const origin = batchPoints[0];
    const destination = batchPoints[batchPoints.length - 1];
    const waypoints = batchPoints.slice(1, -1);

    const originCoords = getCoords(origin);
    const destCoords = getCoords(destination);
    const waypointCoords = waypoints.map(getCoords);

    const allOk = [originCoords, destCoords, ...waypointCoords].every(validateCoords);
    if (!allOk) {
      console.error("📍 Lote con coordenadas inválidas:", {
        origin: originCoords, destination: destCoords, waypoints: waypointCoords
      });
      throw new Error(`Coordenadas inválidas detectadas en el lote ${i}.`);
    }

    const labels = (() => {
      const oIdx = originalStopsForMapping.indexOf(origin);
      const dIdx = originalStopsForMapping.indexOf(destination);
      const originLabel = oIdx === 0 ? "Inicio" : `Orden ${oIdx}`;
      const destinationLabel = dIdx === originalStopsForMapping.length - 1 ? "Fin" : `Orden ${dIdx}`;
      return `${originLabel} -> ${destinationLabel} (${waypointCoords.length} paradas)`;
    })();

    console.log(`...Lote ${Math.floor(i / (GOOGLE_DIRECTIONS_BATCH_POINTS - 1)) + 1}: ${labels}`);

    const directionsParams = {
      origin: originCoords,
      destination: destCoords,
      waypoints: waypointCoords.map((wp) => ({ location: wp })), // DirectionsWaypoint[]
      travelMode: "DRIVING",
      key: process.env.GOOGLE_MAPS_API_KEY,
      ...prefParams,
      // NO usamos optimizeWaypoints: ya viene optimizado por Python
    };

    // Log seguro: evita volcar toda la key
    console.log(
      `➡️ Params Directions (lote ${Math.floor(i / (GOOGLE_DIRECTIONS_BATCH_POINTS - 1)) + 1}):`,
      JSON.stringify({ ...directionsParams, key: "***" }, null, 2)
    );

    let directionsResult;
    try {
      directionsResult = await callDirectionsWithRetry(directionsParams, labels);
    } catch (e) {
      // Log ampliado y error claro para el consumidor
      const msg =
        e?.response?.data?.error_message ||
        e?.message ||
        "Error desconocido al llamar a Directions API";
      console.error(`❌ ERROR FINAL en lote (${labels}): ${msg}`);
      throw new Error(`Fallo en un lote de Google Directions (${labels}): ${msg}`);
    }

    const routes = directionsResult?.data?.routes || [];
    if (!routes.length) {
      console.warn(`⚠️ Google Directions no devolvió ruta para un lote (${labels}).`);
      throw new Error(`Google Directions no devolvió ruta para el lote: ${labels}`);
    }

    const route = routes[0];

    // Distancia y tiempo
    for (const leg of route.legs || []) {
      if (leg?.distance?.value) totalDistance += Number(leg.distance.value);
      if (leg?.duration?.value) totalDuration += Number(leg.duration.value);
    }

    // Polyline por lote
    const segmentPolyline = route?.overview_polyline?.points;
    if (segmentPolyline) {
      polylineSegments.push(segmentPolyline);

      // Decodificamos y acumulamos el path
      const pts = decodePolyline(segmentPolyline);
      // Evitar duplicar el punto de unión entre lotes
      if (fullPathPoints.length && pts.length && JSON.stringify(fullPathPoints[fullPathPoints.length - 1]) === JSON.stringify(pts[0])) {
        fullPathPoints.push(...pts.slice(1));
      } else {
        fullPathPoints.push(...pts);
      }
    } else {
      console.warn(`ℹ️ Ruta sin overview_polyline en el lote (${labels}). Se continuará sin ese segmento.`);
    }
  }

  console.log(`✅ Lotes completados. Distancia: ${totalDistance}m, Duración: ${totalDuration}s`);

  // Construye una sola polyline overview (si hay puntos)
  const overviewPolyline = fullPathPoints.length ? encodePolyline(fullPathPoints) : undefined;

  // 6) Guardar en BD
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
      totalDistance: totalDistance, // metros
      totalDuration: totalDuration, // segundos
      overview_polyline: overviewPolyline, // única polyline para todo el trayecto
      overview_polyline_segments: polylineSegments, // opcional: por lotes
      batches: Math.ceil((optimizedStopSequence.length - 1) / (GOOGLE_DIRECTIONS_BATCH_POINTS - 1)),
      params: {
        avoid: (buildPreferences(preferences).avoid || []),
        language: preferences.language || null,
        region: preferences.region || null,
      },
    },
    status: "draft",
  });

  await routePlan.save();
  await routePlan.populate("driver orders.order");

  console.log("✅ Ruta híbrida optimizada y guardada en BD.");
  return routePlan;
};
