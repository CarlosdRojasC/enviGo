<template>
  <div class="p-6 bg-gray-50 min-h-screen">
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

    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div class="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 class="text-xl font-semibold text-gray-900">Rutas planificadas</h3>
          <p class="text-gray-600 text-sm">Visualiza el progreso de cada ruta y accede al mapa en un clic.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">Total {{ routes.length }}</span>
          <span class="px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">Activas {{ statusCounts.in_progress }}</span>
          <span class="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">Asignadas {{ statusCounts.assigned }}</span>
          <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Completas {{ statusCounts.completed }}</span>
        </div>
      </div>

      <div v-if="loading" class="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="border border-slate-100 rounded-xl p-4 animate-pulse bg-slate-50/60">
          <div class="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
          <div class="h-3 bg-slate-200 rounded w-2/3 mb-6"></div>
          <div class="space-y-2">
            <div class="h-3 bg-slate-200 rounded"></div>
            <div class="h-3 bg-slate-200 rounded w-5/6"></div>
            <div class="h-3 bg-slate-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>

      <div v-else-if="routes.length === 0" class="p-10 text-center text-gray-500">
        <div class="inline-flex flex-col items-center gap-2 px-6 py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div class="text-5xl">🛣️</div>
          <h3 class="text-lg font-semibold text-gray-800">No hay rutas registradas</h3>
          <p class="text-gray-500 max-w-md">Optimiza tus pedidos y visualiza las entregas aquí. Puedes comenzar creando una nueva ruta.</p>
          <button
            @click="showRouteOptimizerModal = true"
            class="mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Optimizar Ruta
          </button>
        </div>
      </div>

      <div v-else class="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <article
          v-for="route in routes"
          :key="route._id"
          class="relative group bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
        >
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r" :class="getStatusAccent(route.status)"></div>
          <div class="p-5 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Ruta #{{ route._id.slice(-6).toUpperCase() }}</p>
                <h4 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {{ getDriverName(route.driver) }}
                  <span
                    v-if="route.status === 'in_progress'"
                    class="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full"
                  >
                    <span class="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
                    En vivo
                  </span>
                </h4>
                <p class="text-xs text-slate-500">Actualizado {{ formatDate(route.updatedAt || route.createdAt) }}</p>
              </div>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
                :class="getStatusBadgeClass(route.status) + ' border-current'"
              >
                {{ getStatusText(route.status) }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-3 text-sm">
              <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p class="text-[11px] uppercase text-slate-500 font-semibold">Paradas</p>
                <p class="text-lg font-bold text-slate-900">{{ route.orders?.length || 0 }}</p>
              </div>
              <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p class="text-[11px] uppercase text-slate-500 font-semibold">Distancia</p>
                <p class="text-lg font-bold text-slate-900">{{ formatDistance(route.optimization?.totalDistance) }}</p>
              </div>
              <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p class="text-[11px] uppercase text-slate-500 font-semibold">Duración</p>
                <p class="text-lg font-bold text-slate-900">{{ formatDuration(route.optimization?.totalDuration) }}</p>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <div class="flex flex-col gap-1 text-xs text-slate-500">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="getStatusDot(route.status)"></span>
                  <span class="font-semibold text-slate-700">Inicio</span>
                  <span class="text-slate-500 truncate max-w-[170px]">{{ route.startLocation?.formatted_address || 'No definido' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span class="font-semibold text-slate-700">Fin</span>
                  <span class="text-slate-500 truncate max-w-[170px]">{{ route.endLocation?.formatted_address || 'No definido' }}</span>
                </div>
              </div>
              <button
                @click="viewRoute(route)"
                class="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 hover:bg-blue-100 transition"
              >
                <span v-if="route.status === 'in_progress'">📡 Rastrear</span>
                <span v-else>👁️ Ver Ruta</span>
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div
      v-if="showRouteMap"
      class="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 backdrop-blur"
      @click.self="closeRouteMap"
    >
      <div class="bg-white/90 backdrop-blur rounded-2xl w-full max-w-7xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] border border-slate-200">
        <div class="flex-1 relative bg-slate-900/80">
          <div id="routeMapContainer" class="w-full h-[70vh] md:h-full"></div>
          <div v-if="!mapInstance" class="absolute inset-0 flex items-center justify-center text-gray-200 bg-slate-900/50">
            Inicializando mapa...
          </div>

          <div class="absolute bottom-4 left-4 bg-white/95 p-4 rounded-xl shadow-lg text-xs space-y-2 z-10 border border-slate-100">
             <div class="font-bold text-gray-700 mb-1 flex items-center gap-1">⚡ Leyenda</div>
             <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-green-500"></span> Entregado</div>
             <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-yellow-500"></span> Pendiente</div>
             <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-blue-600"></span> Camión (En vivo)</div>
          </div>
        </div>

        <div class="w-full md:w-[360px] bg-gradient-to-b from-white via-slate-50 to-white border-l border-slate-200 p-5 overflow-y-auto">
          <div class="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500 font-semibold">Ruta activa</p>
              <h3 class="text-2xl font-black text-slate-900 flex items-center gap-2">
                <span class="text-xl">🗺️</span> #{{ activeRoute?._id?.slice(-6).toUpperCase() }}
              </h3>
              <p class="text-sm text-slate-600 mt-1">
                Conductor <span class="font-semibold text-slate-800">{{ getDriverName(activeRoute?.driver) }}</span>
              </p>
            </div>
            <button @click="closeRouteMap" class="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
              ✖
            </button>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mt-4 space-y-3">
            <div class="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
              <span>Configurar</span>
              <span class="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700" v-if="reoptLoading">
                <span class="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span> Recalculando
              </span>
            </div>
            <div class="grid grid-cols-1 gap-3">
              <div>
                <label class="text-xs font-semibold text-gray-600">Inicio</label>
                <input
                  ref="startInputEl"
                  v-model="startAddress"
                  type="text"
                  placeholder="Escribe una dirección"
                  class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-600">Fin</label>
                <input
                  ref="endInputEl"
                  v-model="endAddress"
                  type="text"
                  placeholder="Escribe una dirección"
                  class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
            </div>
            <div class="flex gap-2 pt-1">
              <button
                @click="reoptimizeActiveRoute"
                :disabled="reoptLoading || !activeRoute"
                class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span class="text-lg">🔁</span>
                <span>{{ reoptLoading ? 'Recalculando...' : 'Reoptimizar' }}</span>
              </button>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mt-4 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-gray-800">Paradas planificadas</h4>
              <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{{ activeRoute?.orders?.length || 0 }} paradas</span>
            </div>
            <ol class="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              <li
                v-for="(stop, idx) in activeRoute?.orders"
                :key="stop._id"
                class="flex items-start gap-3 bg-gradient-to-r from-white to-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm"
              >
                <span
                  class="w-8 h-8 flex items-center justify-center rounded-full text-white font-extrabold text-sm shadow"
                  :style="{ backgroundColor: getMarkerColor(stop.deliveryStatus) }"
                >
                  {{ idx + 1 }}
                </span>
                <div class="flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <p class="font-semibold text-slate-900">
                      {{ stop.order?.customer_name || 'Cliente' }}
                    </p>
                    <span
                      class="text-[10px] uppercase font-bold px-2 py-1 rounded-full"
                      :class="{
                        'bg-green-100 text-green-700': stop.deliveryStatus === 'delivered' || stop.deliveryStatus === 'completed',
                        'bg-amber-100 text-amber-700': !stop.deliveryStatus || stop.deliveryStatus === 'pending' || stop.deliveryStatus === 'in_progress',
                        'bg-red-100 text-red-700': stop.deliveryStatus === 'failed'
                      }"
                    >
                      {{ (stop.deliveryStatus || 'pendiente').replace('_', ' ') }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-600 mt-1 leading-relaxed">
                    {{ stop.order?.delivery_location?.formatted_address || stop.order?.shipping_address || 'Sin dirección' }}
                  </p>
                </div>
              </li>
            </ol>

            <div class="pt-2 text-sm text-gray-700 flex flex-col gap-1 border-t border-dashed border-slate-200 pt-3">
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase tracking-wide text-slate-500">Distancia total</span>
                <span class="font-semibold text-slate-900">{{ formatDistance(activeRoute?.optimization?.totalDistance) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase tracking-wide text-slate-500">Duración estimada</span>
                <span class="font-semibold text-slate-900">{{ formatDuration(activeRoute?.optimization?.totalDuration) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

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
import { ref, computed, onMounted, onUnmounted, nextTick, toRaw } from "vue";
import { apiService } from "../services/api";
import { useWebSocket } from '../services/websocket.service';

// Estado
const routes = ref([]);
const loading = ref(false);
const showRouteMap = ref(false);
const activeRoute = ref(null);
const mapInstance = ref(null);
const showRouteOptimizerModal = ref(false);
const activeDriverIds = ref(new Set());
const stopMarkers = [];
// WebSocket Composable
const { on, off } = useWebSocket();

// Edición y reoptimización
const reoptLoading = ref(false);
const startAddress = ref("");
const endAddress = ref("");
const startInputEl = ref(null);
const endInputEl = ref(null);

// Marcadores / utilidades de mapa
let startMarker = null;
let endMarker = null;
let geocoder = null;
let currentRoutePolyline = null;
let driverMarker = null; // 🚛 Marcador del conductor en tiempo real
let infoWindow = null;
// Helpers
const getDriverName = (driver) => driver?.full_name || driver?.name || driver?.email || "Sin asignar";
const getStatusText = (status) => ({
  draft: "Borrador",
  assigned: "Asignada",
  in_progress: "En Progreso",
  completed: "Completada",
  cancelled: "Cancelada",
}[status] || status);
const getStatusBadgeClass = (status) => ({
  draft: "bg-gray-100 text-gray-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}[status] || "bg-gray-100 text-gray-800");

const statusThemes = {
  draft: { accent: "from-slate-200 to-slate-300", dot: "bg-slate-400" },
  assigned: { accent: "from-blue-200 via-blue-300 to-blue-400", dot: "bg-blue-500" },
  in_progress: { accent: "from-amber-200 via-yellow-300 to-orange-400", dot: "bg-amber-500" },
  completed: { accent: "from-emerald-200 via-green-300 to-emerald-400", dot: "bg-emerald-500" },
  cancelled: { accent: "from-rose-200 via-red-300 to-red-400", dot: "bg-rose-500" },
};

const statusCounts = computed(() => routes.value.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, { draft: 0, assigned: 0, in_progress: 0, completed: 0, cancelled: 0 }));

const getStatusAccent = (status) => `bg-gradient-to-r ${statusThemes[status]?.accent || "from-slate-200 to-slate-300"}`;
const getStatusDot = (status) => statusThemes[status]?.dot || "bg-slate-400";

const formatDate = (date) => {
  if (!date) return "hoy";
  const d = new Date(date);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
};

const getMarkerColor = (status) => {
  switch (status) {
    case "completed": return "#16A34A"; // Verde
    case "delivered": return "#16A34A"; // Verde
    case "in_progress": return "#F59E0B"; // Amarillo
    case "failed": return "#EF4444"; // Rojo
    default: return "#F59E0B"; // Amarillo por defecto (pendiente)
  }
};

const carSymbol = {
  path: 'M17.402,0H5.643C2.526,0,0,3.467,0,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644 V6.584C23.044,3.467,20.518,0,17.402,0z M22.057,14.188v11.665l-2.729,0.351v-4.806L22.057,14.188z M20.625,10.773 c-1.016,3.9-2.219,8.51-2.219,8.51H4.638c0,0-1.203-4.61-2.218-8.51C2.42,10.773,11.523,7.6,20.625,10.773z M5.171,21.047l-2.728-0.351 v4.806l2.728-2.652V21.047z M5.328,30.338v-4.806l2.728,2.652v-2.348l1.626,0.209v4.293H5.328z M10.669,30.338v-4.293l1.626-0.209v2.348 l2.728-2.652v4.806H10.669z M20.158,30.338h-4.354v-4.293l1.626,0.209v2.348l2.728-2.652V30.338z',
  scale: 0.7,
  fillColor: "#2563EB",
  fillOpacity: 1,
  strokeWeight: 1,
  strokeColor: "#ffffff",
  anchor: { x: 11.5, y: 23 },
  rotation: 0
};

const getGoogleMapsApiKey = () => window.env?.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const hasLatLng = (p) => p && typeof p.latitude === "number" && typeof p.longitude === "number";

const formatDistance = (m) => {
  if (typeof m !== "number" || Number.isNaN(m)) return "—";
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
};
const formatDuration = (s) => {
  if (typeof s !== "number" || Number.isNaN(s)) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

// Stats
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

// Cargar Google Maps
const loadGoogleMaps = async () => {
  if (typeof window.google !== "undefined" && window.google.maps) return window.google.maps;
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    alert("⚠️ Falta configurar Google Maps API Key");
    throw new Error("Missing Google Maps API key");
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
};

// ✅ MANEJADOR DE UBICACIÓN DEL CONDUCTOR
const handleDriverLocation = (payload) => {
  console.log('📍 Tracking recibido:', payload);

  if (!payload || !payload.driver_id || !payload.location) return;

  const { driver_id, location } = payload;
  activeDriverIds.value.add(driver_id);

  if (showRouteMap.value && activeRoute.value) {
    const currentDriverId = activeRoute.value.driver?._id || activeRoute.value.driver;

    console.log('🧪 Comparando IDs de driver', {
      currentDriverId,
      payloadDriverId: driver_id,
      equalStrict: currentDriverId === driver_id,
      equalLoose: currentDriverId == driver_id
    });

    // Usa comparación flexible para evitar problemas string/ObjectId
    if (currentDriverId == driver_id) {
      updateDriverMarker(location.latitude, location.longitude, location.heading);
    }
  }
};


const updateDriverMarker = (lat, lng, heading) => {
  let map = mapInstance.value;
  if (toRaw) map = toRaw(map); // Vue proxy fix
  if (!map || typeof window.google === "undefined") return;

  const latLng = new google.maps.LatLng(lat, lng);

  if (driverMarker) {
    // Mover marcador existente
    driverMarker.setPosition(latLng);
    
    // Actualizar rotación si hay icono
    const icon = driverMarker.getIcon();
    if (icon) {
       icon.rotation = heading || 0;
       driverMarker.setIcon(icon);
    }
  } else {
    // Crear nuevo marcador (Camión)
    driverMarker = new google.maps.Marker({
      position: latLng,
      map: map,
      title: "Conductor",
      icon: {
        ...carSymbol,
        rotation: heading || 0
      },
      zIndex: 9999 // Siempre encima
    });
  }
};

// Cargar rutas
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

// Reverse geocode
const reverseGeocode = (maps, lat, lng) =>
  new Promise((resolve) => {
    const gc = geocoder || new maps.Geocoder();
    gc.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.length) resolve(results[0].formatted_address);
      else resolve(`${lat}, ${lng}`);
    });
  });

const updateStartFromLatLng = async (maps, lat, lng) => {
  const addr = await reverseGeocode(maps, lat, lng);
  startAddress.value = addr;
  activeRoute.value.startLocation = {
    ...(activeRoute.value.startLocation || {}),
    latitude: lat, longitude: lng, formatted_address: addr,
  };
  if (startMarker) startMarker.setPosition({ lat, lng });
};

const updateEndFromLatLng = async (maps, lat, lng) => {
  const addr = await reverseGeocode(maps, lat, lng);
  endAddress.value = addr;
  activeRoute.value.endLocation = {
    ...(activeRoute.value.endLocation || {}),
    latitude: lat, longitude: lng, formatted_address: addr,
  };
  if (endMarker) endMarker.setPosition({ lat, lng });
};

const clearStopMarkers = () => {
  while (stopMarkers.length) {
    const m = stopMarkers.pop();
    if (m) m.setMap(null);
  }
};

const renderStopMarkers = (maps, map, route) => {
  clearStopMarkers();
  const safeMap = toRaw ? toRaw(map) : map;
  (route.orders || []).forEach((o, idx) => {
    const lat = o?.order?.location?.latitude ?? o?.order?.delivery_location?.latitude;
    const lng = o?.order?.location?.longitude ?? o?.order?.delivery_location?.longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      const marker = new maps.Marker({
        map: safeMap,
        position: { lat, lng },
        title: `Parada ${idx + 1}`,
        label: { text: `${idx + 1}`, color: "white", fontSize: "12px", fontWeight: "bold" },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: getMarkerColor(o.deliveryStatus),
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        },
      });
      stopMarkers.push(marker);
    }
  });
};

const renderStartEndMarkers = (maps, map, route) => {
  const safeMap = toRaw ? toRaw(map) : map;
  if (hasLatLng(route.startLocation)) {
    if (!startMarker) {
      startMarker = new maps.Marker({
        map: safeMap,
        position: { lat: route.startLocation.latitude, lng: route.startLocation.longitude },
        draggable: true,
        label: "S",
        title: "Inicio",
      });
      startMarker.addListener("dragend", async (e) => {
        await updateStartFromLatLng(maps, e.latLng.lat(), e.latLng.lng());
      });
    } else {
      startMarker.setMap(safeMap);
      startMarker.setPosition({ lat: route.startLocation.latitude, lng: route.startLocation.longitude });
    }
  } else if (startMarker) {
    startMarker.setMap(null);
    startMarker = null;
  }

  if (hasLatLng(route.endLocation)) {
    if (!endMarker) {
      endMarker = new maps.Marker({
        map: safeMap,
        position: { lat: route.endLocation.latitude, lng: route.endLocation.longitude },
        draggable: true,
        label: "F",
        title: "Fin",
      });
      endMarker.addListener("dragend", async (e) => {
        await updateEndFromLatLng(maps, e.latLng.lat(), e.latLng.lng());
      });
    } else {
      endMarker.setMap(safeMap);
      endMarker.setPosition({ lat: route.endLocation.latitude, lng: route.endLocation.longitude });
    }
  } else if (endMarker) {
    endMarker.setMap(null);
    endMarker = null;
  }
};

const syncRouteFields = (route) => {
  startAddress.value = route.startLocation?.formatted_address || (hasLatLng(route.startLocation) ? `${route.startLocation.latitude}, ${route.startLocation.longitude}` : "");
  endAddress.value = route.endLocation?.formatted_address || (hasLatLng(route.endLocation) ? `${route.endLocation.latitude}, ${route.endLocation.longitude}` : "");
};

const persistRouteLocally = (updated) => {
  const idx = routes.value.findIndex(x => x._id === updated._id);
  if (idx !== -1) routes.value.splice(idx, 1, updated);
  else routes.value.unshift(updated);
};

const applyRouteUpdate = async (updated) => {
  persistRouteLocally(updated);
  activeRoute.value = updated;
  syncRouteFields(updated);

  const maps = await loadGoogleMaps();
  const map = toRaw ? toRaw(mapInstance.value) : mapInstance.value;
  if (map) {
    renderStartEndMarkers(maps, map, updated);
    renderStopMarkers(maps, map, updated);
    drawRouteOnMap(maps, map, updated);
  }
};

// Dibuja polyline
const drawRouteOnMap = (maps, map, route) => {
  if (currentRoutePolyline) {
    currentRoutePolyline.setMap(null);
    currentRoutePolyline = null;
  }
  const poly = route.optimization?.overview_polyline;
  if (!poly) return;

  const decodedPath = maps.geometry.encoding.decodePath(poly);
  currentRoutePolyline = new maps.Polyline({
    path: decodedPath,
    geodesic: true,
    strokeColor: "#1E88E5",
    strokeOpacity: 0.8,
    strokeWeight: 5,
  });
  currentRoutePolyline.setMap(map);

  const bounds = new maps.LatLngBounds();
  decodedPath.forEach(p => bounds.extend(p));
  if (hasLatLng(route.startLocation)) bounds.extend({ lat: route.startLocation.latitude, lng: route.startLocation.longitude });
  if (hasLatLng(route.endLocation)) bounds.extend({ lat: route.endLocation.latitude, lng: route.endLocation.longitude });
  map.fitBounds(bounds, 60);
};

const closeRouteMap = () => {
    showRouteMap.value = false;
    if (driverMarker) {
        driverMarker.setMap(null);
        driverMarker = null;
    }
    if (currentRoutePolyline) {
      currentRoutePolyline.setMap(null);
      currentRoutePolyline = null;
    }
    clearStopMarkers();
    if (startMarker) {
      startMarker.setMap(null);
      startMarker = null;
    }
    if (endMarker) {
      endMarker.setMap(null);
      endMarker = null;
    }
};

// Ver ruta y preparar mapa
const viewRoute = async (route) => {
  activeRoute.value = route;
  syncRouteFields(route);
  showRouteMap.value = true;

  driverMarker = null;
  clearStopMarkers();
  startMarker = null;
  endMarker = null;
  if (currentRoutePolyline) {
    currentRoutePolyline.setMap(null);
    currentRoutePolyline = null;
  }

  await nextTick();

  const mapContainer = document.getElementById("routeMapContainer");
  if (!mapContainer) return;

  try {
    const maps = await loadGoogleMaps();

    infoWindow = new maps.InfoWindow();

    const map = new maps.Map(mapContainer, {
      center: hasLatLng(route.startLocation)
        ? { lat: route.startLocation.latitude, lng: route.startLocation.longitude }
        : { lat: 0, lng: 0 },
      zoom: 12,
      mapId: "ENVIGO_MAP_DEFAULT",
    });
    mapInstance.value = map;

    geocoder = new maps.Geocoder();
    renderStartEndMarkers(maps, map, route);

    // Autocomplete
    if (startInputEl.value) {
      const acStart = new maps.places.Autocomplete(startInputEl.value, { fields: ["geometry", "formatted_address"] });
      acStart.addListener("place_changed", async () => {
        const place = acStart.getPlace();
        if (place?.geometry?.location) {
          await updateStartFromLatLng(maps, place.geometry.location.lat(), place.geometry.location.lng());
          map.panTo({ lat: activeRoute.value.startLocation.latitude, lng: activeRoute.value.startLocation.longitude });
        }
      });
    }
    if (endInputEl.value) {
      const acEnd = new maps.places.Autocomplete(endInputEl.value, { fields: ["geometry", "formatted_address"] });
      acEnd.addListener("place_changed", async () => {
        const place = acEnd.getPlace();
        if (place?.geometry?.location) {
          await updateEndFromLatLng(maps, place.geometry.location.lat(), place.geometry.location.lng());
          map.panTo({ lat: activeRoute.value.endLocation.latitude, lng: activeRoute.value.endLocation.longitude });
        }
      });
    }

    renderStopMarkers(maps, map, route);
    drawRouteOnMap(maps, map, route);
  } catch (err) {
    console.error("💥 Error al dibujar mapa:", err);
    mapContainer.innerHTML = "❌ Error al cargar mapa.";
  }
};

const reoptimizeActiveRoute = async () => {
  if (!activeRoute.value) return;
  const r = activeRoute.value;

  const stops = (r.orders || []).map(s => s?.order?._id).filter(Boolean);

  if (!hasLatLng(r.startLocation) || !hasLatLng(r.endLocation) || stops.length === 0) {
    alert("Faltan coordenadas o paradas.");
    return;
  }

  reoptLoading.value = true;
  try {
    const payload = {
      startLocation: {
        latitude: r.startLocation.latitude,
        longitude: r.startLocation.longitude,
        address: startAddress.value,
      },
      endLocation: {
        latitude: r.endLocation.latitude,
        longitude: r.endLocation.longitude,
        address: endAddress.value,
      },
      orderIds: r.orders.map(o => o.order._id),
      preferences: { avoidTolls: false, avoidHighways: false, prioritizeTime: true },
    };

    const res = await apiService.routes.reoptimize(r._id, payload);
    const updated = res.data?.data || res.data?.route || res.data;
    if (!updated) throw new Error("Error del servidor");

    await applyRouteUpdate(updated);
  } catch (e) {
    console.error(e);
    alert("No se pudo reoptimizar la ruta.");
  } finally {
    reoptLoading.value = false;
  }
};

// Lifecycle Hooks
onMounted(() => {
  loadRoutes();
  // ✅ Suscribirse al evento correcto 'driver_location_update'
  on('driver_location_update', handleDriverLocation);
});

onUnmounted(() => {
  off('driver_location_update', handleDriverLocation);
  if (driverMarker) {
     driverMarker.setMap(null);
  }
});
</script>

<style scoped>
#routeMapContainer {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}
</style>