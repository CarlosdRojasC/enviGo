<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <!-- Header -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-2">
          🛣️ Gestión de Rutas
        </h1>
        <p class="text-gray-600 mt-1">
          Optimiza y administra las rutas de entrega de tus conductores
        </p>
      </div>
      <div class="flex gap-3">
        <button
          @click="showRouteOptimizerModal = true"
          class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
        >
          ✨ Optimizar Nueva Ruta
        </button>
        <button
          @click="refreshRoutes"
          class="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          :disabled="loading"
        >
          🔄 Actualizar
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
      >
        <div class="flex items-center gap-4">
          <div class="text-3xl">{{ card.icon }}</div>
          <div>
            <h3 class="text-2xl font-bold text-gray-900">{{ card.value }}</h3>
            <p class="text-gray-600">{{ card.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Debug info (temporal) -->
    <div v-if="routes.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <details>
        <summary class="cursor-pointer font-semibold text-yellow-800">🔍 Debug - Datos de la primera ruta</summary>
        <pre class="mt-2 text-xs text-yellow-700 overflow-auto max-h-40">{{ JSON.stringify(routes[0], null, 2) }}</pre>
      </details>
    </div>

    <!-- Routes Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-xl font-semibold text-gray-900">Lista de Rutas</h3>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conductor</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entregas</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distancia</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                <div class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span class="ml-2">Cargando rutas...</span>
                </div>
              </td>
            </tr>

            <tr v-else-if="routes.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                <div class="text-center">
                  <div class="text-5xl mb-3">🛣️</div>
                  <h3 class="text-lg font-medium text-gray-800 mb-1">No hay rutas registradas</h3>
                  <p class="text-gray-500 mb-4">Crea tu primera ruta optimizada.</p>
                  <button
                    @click="showRouteOptimizerModal = true"
                    class="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Optimizar Ruta
                  </button>
                </div>
              </td>
            </tr>

            <tr v-for="route in routes" :key="route._id" class="hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-800">#{{ route._id.slice(-6).toUpperCase() }}</td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="font-medium text-gray-900">
                    {{ getDriverName(route.driver) }}
                  </span>
                  <span v-if="route.driver?.email" class="text-xs text-gray-500">
                    {{ route.driver.email }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getStatusBadgeClass(route.status)"
                >
                  {{ getStatusText(route.status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-gray-700">{{ route.orders?.length || 0 }}</td>
              <td class="px-6 py-4 text-gray-700">{{ formatDistance(route.optimization?.totalDistance) }}</td>
              <td class="px-6 py-4 text-gray-700">{{ formatDuration(route.optimization?.totalDuration) }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <button @click="viewRoute(route)" class="text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                  👁️ Ver Ruta
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Route Map Modal -->
    <div
      v-if="showRouteMap"
      class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      @click.self="showRouteMap = false"
    >
      <div class="bg-white rounded-xl w-full max-w-7xl shadow-xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        <!-- MAP -->
        <div class="flex-1 relative">
          <div id="routeMapContainer" class="w-full h-[70vh] md:h-full"></div>
          <div v-if="!mapInstance" class="absolute inset-0 flex items-center justify-center text-gray-400 bg-white bg-opacity-70">
            Inicializando mapa...
          </div>
        </div>

        <!-- SIDEBAR -->
        <div class="w-full md:w-80 bg-gray-50 border-l p-4 overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span class="text-xl">🗺️</span> Ruta #{{ activeRoute?._id?.slice(-6).toUpperCase() }}
            </h3>
            <button @click="showRouteMap = false" class="text-gray-500 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-gray-200">
              ✖
            </button>
          </div>
          <div class="text-sm text-gray-600 mb-3">
            Conductor: <span class="font-medium">{{ getDriverName(activeRoute?.driver) }}</span>
          </div>

          <!-- === NUEVO: Controles del panel === -->
          <div class="space-y-3 mb-4">
            <!-- Estilo de marcadores -->
            <div>
              <label class="text-xs font-semibold text-gray-600 block mb-1">Estilo de marcadores</label>
              <div class="flex gap-2">
                <button
                  class="px-3 py-1 rounded-lg border"
                  :class="markerStyle === 'numero' ? 'border-gray-900 text-gray-900' : 'border-gray-300 text-gray-600'"
                  @click="markerStyle = 'numero'; redrawOrderMarkers()"
                >Números</button>
                <button
                  class="px-3 py-1 rounded-lg border"
                  :class="markerStyle === 'paquete' ? 'border-gray-900 text-gray-900' : 'border-gray-300 text-gray-600'"
                  @click="markerStyle = 'paquete'; redrawOrderMarkers()"
                >📦 + Nº</button>
              </div>
            </div>

            <!-- Fijar por dirección -->
            <div>
              <label class="text-xs font-semibold text-gray-600 block mb-1">Fijar inicio/fin por dirección</label>
              <div class="flex gap-2 mb-2">
                <input v-model="startAddress" class="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Dirección de inicio" />
                <button class="px-3 py-2 rounded-lg bg-gray-100" @click="geocodeAndSet('start', startAddress)">Usar</button>
              </div>
              <div class="flex gap-2">
                <input v-model="endAddress" class="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Dirección de fin" />
                <button class="px-3 py-2 rounded-lg bg-gray-100" @click="geocodeAndSet('end', endAddress)">Usar</button>
              </div>
            </div>

            <!-- Fijar con clic en mapa -->
            <div>
              <label class="text-xs font-semibold text-gray-600 block mb-1">Fijar inicio/fin con clic en el mapa</label>
              <div class="flex gap-2">
                <button
                  class="px-3 py-1 rounded-lg border"
                  :class="clickMode === 'start' ? 'border-blue-600 text-blue-700' : 'border-gray-300 text-gray-600'"
                  @click="clickMode = (clickMode === 'start' ? 'none' : 'start')"
                >Seleccionar Inicio</button>
                <button
                  class="px-3 py-1 rounded-lg border"
                  :class="clickMode === 'end' ? 'border-red-600 text-red-700' : 'border-gray-300 text-gray-600'"
                  @click="clickMode = (clickMode === 'end' ? 'none' : 'end')"
                >Seleccionar Fin</button>
                <button class="px-3 py-1 rounded-lg border border-gray-300 text-gray-600" @click="clickMode='none'">Ninguno</button>
              </div>
            </div>

            <!-- Acciones -->
            <div class="flex items-center gap-2">
              <button class="px-3 py-2 rounded-lg border" @click="swapStartEnd">↔️ Intercambiar</button>
              <button
                class="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold flex-1 disabled:opacity-60"
                :disabled="reoptimizing || !activeRoute"
                @click="reoptimizeRoute"
              >{{ reoptimizing ? 'Reoptimizando…' : 'Reoptimizar Ruta' }}</button>
            </div>
          </div>

          <h4 class="text-sm font-semibold text-gray-700 mb-2">Paradas:</h4>
          <ol class="space-y-2">
            <li
              v-for="(stop, idx) in sortedStops"
              :key="stop._id || stop.order?._id"
              class="flex items-start gap-3 bg-white p-2 rounded-md shadow-sm hover:bg-blue-50 transition"
            >
              <span
                class="w-6 h-6 flex items-center justify-center rounded-full text-white font-bold text-sm"
                :style="{ backgroundColor: getMarkerColor(stop.deliveryStatus) }"
              >
                {{ idx + 1 }}
              </span>
              <div class="flex-1">
                <p class="font-medium text-gray-800">
                  {{ stop.order?.customer_name || 'Cliente' }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ stop.order?.delivery_location?.formatted_address || stop.order?.shipping_address || 'Sin dirección' }}
                </p>
                <div class="flex gap-1 mt-1">
                  <button class="text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200" @click="setStartFromStop(stop)">Fijar como inicio</button>
                  <button class="text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200" @click="setEndFromStop(stop)">Fijar como fin</button>
                </div>
              </div>
            </li>
          </ol>

          <div class="mt-4 text-sm text-gray-600 border-t pt-3">
            Distancia total: <b>{{ formatDistance(activeRoute?.optimization?.totalDistance) }}</b><br />
            Duración estimada: <b>{{ formatDuration(activeRoute?.optimization?.totalDuration) }}</b>
          </div>
        </div>
      </div>
    </div>

    <!-- Optimizer Modal Placeholder -->
    <div
      v-if="showRouteOptimizerModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showRouteOptimizerModal = false"
    >
      <div class="bg-white rounded-xl p-8 shadow-xl max-w-lg w-full text-center">
        <h2 class="text-2xl font-bold mb-2">✨ Optimizar Nueva Ruta</h2>
        <p class="text-gray-600 mb-4">Próximamente podrás configurar la optimización de rutas desde aquí.</p>
        <button @click="showRouteOptimizerModal = false" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { apiService } from "../services/api";

// ================== Estado base ==================
const routes = ref([]);
const loading = ref(false);
const showRouteMap = ref(false);
const activeRoute = ref(null);
const mapInstance = ref(null);
const showRouteOptimizerModal = ref(false);

// ================== NUEVO: estado panel/markers ==================
const markerStyle = ref('numero'); // 'numero' | 'paquete'
const clickMode = ref('none');     // 'none' | 'start' | 'end'
const startAddress = ref('');
const endAddress = ref('');
const reoptimizing = ref(false);

let startMarker = null;
let endMarker = null;
let orderMarkers = [];
let routePolylineInstance = null;
let gmaps = null;

// ================== Helpers UI ==================
const getDriverName = (driver) => {
  if (!driver) return 'Sin asignar';
  return driver.full_name || driver.name || driver.email || 'Conductor';
};

const getStatusText = (status) => {
  const statusMap = {
    'draft': 'Borrador',
    'assigned': 'Asignada',
    'in_progress': 'En Progreso',
    'completed': 'Completada',
    'cancelled': 'Cancelada'
  };
  return statusMap[status] || status;
};

const getStatusBadgeClass = (status) => {
  const classMap = {
    'draft': 'bg-gray-100 text-gray-800',
    'assigned': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  };
  return classMap[status] || 'bg-gray-100 text-gray-800';
};

// ================== Google Maps Loader ==================
const getGoogleMapsApiKey = () => {
  return (
    window.env?.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    ""
  );
};

const loadGoogleMaps = async () => {
  if (typeof window.google !== "undefined" && window.google.maps) {
    gmaps = window.google.maps;
    return gmaps;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    console.error("🚫 No se encontró Google Maps API Key");
    alert("⚠️ Falta configurar Google Maps API Key en el frontend");
    throw new Error("Missing Google Maps API key");
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,marker,places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("✅ Google Maps API cargada correctamente");
      gmaps = window.google.maps;
      resolve(gmaps);
    };
    script.onerror = (e) => {
      console.error("❌ Error al cargar Google Maps:", e);
      reject(e);
    };
    document.head.appendChild(script);
  });
};

// ================== Estadísticas ==================
const statCards = computed(() => {
  const total = routes.value.length;
  const completed = routes.value.filter(r => r.status === 'completed').length;
  const inProgress = routes.value.filter(r => r.status === 'in_progress').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return [
    { icon: "🛣️", label: "Rutas Totales", value: total },
    { icon: "✅", label: "Completadas", value: completed },
    { icon: "🚀", label: "En Progreso", value: inProgress },
    { icon: "📊", label: "Tasa Éxito", value: `${completionRate}%` },
  ];
});

// ================== Carga de rutas ==================
const loadRoutes = async () => {
  loading.value = true;
  try {
    const res = await apiService.routes.getAll();
    routes.value = res.data?.data?.routes || res.data?.routes || res.data || [];
  } catch (err) {
    console.error("❌ Error cargando rutas:", err);
  } finally {
    loading.value = false;
  }
};

const refreshRoutes = () => loadRoutes();

// ================== Lista ordenada por sequenceNumber ==================
const sortedStops = computed(() => {
  if (!activeRoute.value?.orders) return [];
  return [...activeRoute.value.orders].sort((a, b) => {
    const sa = a.sequenceNumber ?? 999999;
    const sb = b.sequenceNumber ?? 999999;
    return sa - sb;
  });
});

// ================== Mapa: helpers ==================
const getMarkerColor = (status) => {
  switch (status) {
    case "completed": return "#16A34A";
    case "in_progress": return "#F59E0B";
    default: return "#1E88E5";
  }
};

const buildMarkerContent = (label, color = "#1E88E5", style = markerStyle.value) => {
  if (style === 'paquete') {
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.style.transform = 'translateY(2px)';
    const pkg = document.createElement('div');
    pkg.textContent = '📦';
    pkg.style.fontSize = '22px';
    pkg.style.lineHeight = '1';
    const badge = document.createElement('div');
    badge.textContent = String(label);
    Object.assign(badge.style, {
      position: 'absolute',
      right: '-6px',
      top: '-6px',
      width: '20px',
      height: '20px',
      borderRadius: '10px',
      background: color,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '700',
      fontSize: '12px',
      boxShadow: '0 2px 6px rgba(0,0,0,.3)',
    });
    wrap.appendChild(pkg);
    wrap.appendChild(badge);
    return wrap;
  }

  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "#fff",
    border: `2px solid ${color}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    color,
    boxShadow: "0 2px 6px rgba(0,0,0,.3)",
  });
  el.textContent = String(label);
  return el;
};

const getOrderLatLng = (o) => {
  if (o?.order?.location?.latitude && o?.order?.location?.longitude) {
    return { lat: Number(o.order.location.latitude), lng: Number(o.order.location.longitude) };
  }
  if (o?.order?.delivery_location?.lat && o?.order?.delivery_location?.lng) {
    return { lat: Number(o.order.delivery_location.lat), lng: Number(o.order.delivery_location.lng) };
  }
  return null;
};

// ================== Mapa: dibujo/limpieza ==================
const clearOrderMarkersOnly = () => {
  orderMarkers.forEach(m => m.map = null);
  orderMarkers = [];
};

const clearMarkers = () => {
  clearOrderMarkersOnly();
  if (startMarker) startMarker.map = null;
  if (endMarker) endMarker.map = null;
  startMarker = null;
  endMarker = null;
};

const drawStartEndMarkers = () => {
  if (!mapInstance.value || !gmaps) return;

  // Inicio
  const s = { lat: activeRoute.value.startLocation.latitude, lng: activeRoute.value.startLocation.longitude };
  startMarker = new gmaps.marker.AdvancedMarkerElement({
    map: mapInstance.value,
    position: s,
    title: "Inicio",
    content: (() => {
      const c = buildMarkerContent('I', '#22C55E', 'numero');
      c.style.border = '2px solid #22C55E';
      c.style.color = '#22C55E';
      return c;
    })()
  });

  // Fin
  const e = { lat: activeRoute.value.endLocation.latitude, lng: activeRoute.value.endLocation.longitude };
  endMarker = new gmaps.marker.AdvancedMarkerElement({
    map: mapInstance.value,
    position: e,
    title: "Fin",
    content: (() => {
      const c = buildMarkerContent('F', '#EF4444', 'numero');
      c.style.border = '2px solid #EF4444';
      c.style.color = '#EF4444';
      return c;
    })()
  });
};

const drawOrderMarkers = () => {
  if (!mapInstance.value || !gmaps) return;
  clearOrderMarkersOnly();
  sortedStops.value.forEach((o, idx) => {
    const pos = getOrderLatLng(o);
    if (!pos) return;
    const marker = new gmaps.marker.AdvancedMarkerElement({
      map: mapInstance.value,
      position: pos,
      title: `Parada ${idx + 1}`,
      content: buildMarkerContent(idx + 1, getMarkerColor(o.deliveryStatus), markerStyle.value)
    });
    orderMarkers.push(marker);
  });
};

const redrawOrderMarkers = () => {
  clearOrderMarkersOnly();
  drawOrderMarkers();
};

const drawRoutePolyline = () => {
  if (!mapInstance.value || !gmaps) return;
  const polylineString = activeRoute.value?.optimization?.overview_polyline;
  if (!polylineString) return;
  const decodedPath = gmaps.geometry.encoding.decodePath(polylineString);
  if (routePolylineInstance) routePolylineInstance.setMap(null);
  routePolylineInstance = new gmaps.Polyline({
    path: decodedPath,
    geodesic: true,
    strokeColor: "#1E88E5",
    strokeOpacity: 0.9,
    strokeWeight: 5,
  });
  routePolylineInstance.setMap(mapInstance.value);
};

const fitToData = () => {
  if (!mapInstance.value || !gmaps) return;
  const b = new gmaps.LatLngBounds();
  const s = activeRoute.value.startLocation;
  const e = activeRoute.value.endLocation;
  if (s?.latitude && s?.longitude) b.extend(new gmaps.LatLng(s.latitude, s.longitude));
  sortedStops.value.forEach(o => {
    const p = getOrderLatLng(o);
    if (p) b.extend(new gmaps.LatLng(p.lat, p.lng));
  });
  if (e?.latitude && e?.longitude) b.extend(new gmaps.LatLng(e.latitude, e.longitude));
  if (!b.isEmpty()) mapInstance.value.fitBounds(b, 60);
};

// ================== Acciones: ver ruta / fijar inicio/fin ==================
const viewRoute = async (route) => {
  activeRoute.value = route;
  showRouteMap.value = true;
  await nextTick();

  const mapContainer = document.getElementById("routeMapContainer");
  if (!mapContainer) return;

  try {
    const maps = await loadGoogleMaps();
    // Crear mapa (aunque no haya polyline)
    const center = route?.startLocation?.latitude && route?.startLocation?.longitude
      ? { lat: route.startLocation.latitude, lng: route.startLocation.longitude }
      : { lat: 0, lng: 0 };

    const map = new maps.Map(mapContainer, {
      center,
      zoom: 12,
      mapId: "ENVIGO_MAP_DEFAULT"
    });
    mapInstance.value = map;

    // Clic para fijar inicio/fin
    map.addListener('click', (e) => {
      if (clickMode.value === 'none') return;
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      if (clickMode.value === 'start') setStartLocation(pos);
      if (clickMode.value === 'end') setEndLocation(pos);
      clickMode.value = 'none';
    });

    // Dibujar capa y marcadores
    drawRoutePolyline();
    drawStartEndMarkers();
    drawOrderMarkers();
    fitToData();
  } catch (err) {
    console.error("💥 Error al dibujar mapa:", err);
    mapContainer.innerHTML = "❌ Error al cargar mapa.";
  }
};

const setStartLocation = ({ lat, lng }) => {
  activeRoute.value.startLocation = {
    ...(activeRoute.value.startLocation || {}),
    latitude: lat,
    longitude: lng
  };
  if (startMarker) startMarker.position = new gmaps.LatLng(lat, lng);
  fitToData();
};

const setEndLocation = ({ lat, lng }) => {
  activeRoute.value.endLocation = {
    ...(activeRoute.value.endLocation || {}),
    latitude: lat,
    longitude: lng
  };
  if (endMarker) endMarker.position = new gmaps.LatLng(lat, lng);
  fitToData();
};

const geocodeAndSet = async (which, query) => {
  if (!query) return;
  try {
    await loadGoogleMaps();
    const geocoder = new gmaps.Geocoder();
    const { results } = await geocoder.geocode({ address: query });
    if (!results?.length) return alert('No se encontró esa dirección.');
    const loc = results[0].geometry.location;
    const pos = { lat: loc.lat(), lng: loc.lng() };
    if (which === 'start') setStartLocation(pos);
    if (which === 'end')   setEndLocation(pos);
  } catch (e) {
    console.error(e);
    alert('No se pudo geocodificar la dirección.');
  }
};

const swapStartEnd = () => {
  const s = activeRoute.value.startLocation;
  activeRoute.value.startLocation = activeRoute.value.endLocation;
  activeRoute.value.endLocation = s;
  drawStartEndMarkers();
  fitToData();
};

const setStartFromStop = (stop) => {
  const p = getOrderLatLng(stop);
  if (p) setStartLocation(p);
};

const setEndFromStop = (stop) => {
  const p = getOrderLatLng(stop);
  if (p) setEndLocation(p);
};

// ================== Reoptimizar ==================
const reoptimizeRoute = async () => {
  if (!activeRoute.value) return;
  reoptimizing.value = true;
  try {
    const payload = {
      startLocation: {
        latitude: activeRoute.value.startLocation.latitude,
        longitude: activeRoute.value.startLocation.longitude
      },
      endLocation: {
        latitude: activeRoute.value.endLocation.latitude,
        longitude: activeRoute.value.endLocation.longitude
      },
      preferences: {} // Ej: { avoidTolls:true, avoidHighways:false, language:'es', region:'co' }
    };
    const res = await apiService.routes.reoptimize(activeRoute.value._id, payload);
    const updated = res.data?.routePlan || res.data?.data?.routePlan || res.data;
    if (!updated) throw new Error('Respuesta inválida del servidor');

    // Actualizar y redibujar
    activeRoute.value = updated;
    drawRoutePolyline();
    redrawOrderMarkers();
    fitToData();
  } catch (e) {
    console.error(e);
    alert('No fue posible reoptimizar la ruta.');
  } finally {
    reoptimizing.value = false;
  }
};

// ================== Formatos ==================
const formatDistance = (m) => {
  if (typeof m !== 'number') return '—';
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
};
const formatDuration = (s) => {
  if (typeof s !== 'number') return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

// ================== Lifecycle ==================
onMounted(() => {
  loadRoutes();
});
</script>

<style scoped>
#routeMapContainer {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}
</style>
