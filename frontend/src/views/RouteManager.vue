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
                  <span class="font-medium text-gray-900">{{ getDriverName(route.driver) }}</span>
                  <span v-if="route.driver?.email" class="text-xs text-gray-500">{{ route.driver.email }}</span>
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
                <button
                  @click="viewRoute(route)"
                  class="text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                >
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

          <!-- Editor Inicio/Fin -->
          <div class="bg-white rounded-lg border p-3 mb-4 space-y-2">
            <div>
              <label class="text-xs font-semibold text-gray-600">Inicio</label>
              <input
                ref="startInputEl"
                v-model="startAddress"
                type="text"
                placeholder="Escribe una dirección"
                class="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-[11px] text-gray-500 mt-1">Sugerencia: también puedes <b>arrastrar</b> el pin de inicio en el mapa.</p>
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-600">Fin</label>
              <input
                ref="endInputEl"
                v-model="endAddress"
                type="text"
                placeholder="Escribe una dirección"
                class="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-[11px] text-gray-500 mt-1">Sugerencia: también puedes <b>arrastrar</b> el pin de fin.</p>
            </div>
            <div class="flex gap-2 pt-1">
              <button
                @click="reoptimizeActiveRoute"
                :disabled="reoptLoading || !activeRoute"
                class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-2 rounded-md text-sm font-semibold hover:shadow transition disabled:opacity-60"
              >
                🔁 Reoptimizar
              </button>
            </div>
            <p class="text-[11px] text-gray-500">Reoptimiza el orden de paradas y recalcula distancia/duración con los nuevos anclajes.</p>
          </div>

          <h4 class="text-sm font-semibold text-gray-700 mb-2">Paradas:</h4>
          <ol class="space-y-2">
            <li
              v-for="(stop, idx) in activeRoute?.orders"
              :key="stop._id"
              class="flex items-start gap-3 bg-white p-2 rounded-md shadow-sm hover:bg-blue-50 transition"
            >
              <span
                class="w-6 h-6 flex items-center justify-center rounded-full text-white font-bold text-sm"
                :style="{ backgroundColor: getMarkerColor(stop.deliveryStatus) }"
              >
                {{ idx + 1 }}
              </span>
              <div>
                <p class="font-medium text-gray-800">
                  {{ stop.order?.customer_name || 'Cliente' }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ stop.order?.delivery_location?.formatted_address || stop.order?.shipping_address || 'Sin dirección' }}
                </p>
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

// Estado
const routes = ref([]);
const loading = ref(false);
const showRouteMap = ref(false);
const activeRoute = ref(null);
const mapInstance = ref(null);
const showRouteOptimizerModal = ref(false);

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

const getMarkerColor = (status) => {
  switch (status) {
    case "completed": return "#16A34A";
    case "in_progress": return "#F59E0B";
    default: return "#1E88E5";
  }
};

const getGoogleMapsApiKey = () => window.env?.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const hasLatLng = (p) => p && typeof p.latitude === "number" && typeof p.longitude === "number";

const formatDistance = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);
const formatDuration = (s) => {
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

// Cargar Google Maps (con places)
const loadGoogleMaps = async () => {
  if (typeof window.google !== "undefined" && window.google.maps) return window.google.maps;

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    alert("⚠️ Falta configurar Google Maps API Key en el frontend");
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

// Updates desde coordenadas
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

// Dibuja polyline actual
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
    strokeOpacity: 0.9,
    strokeWeight: 5,
  });
  currentRoutePolyline.setMap(map);

  const bounds = new maps.LatLngBounds();
  decodedPath.forEach(p => bounds.extend(p));
  if (hasLatLng(route.startLocation)) bounds.extend({ lat: route.startLocation.latitude, lng: route.startLocation.longitude });
  if (hasLatLng(route.endLocation)) bounds.extend({ lat: route.endLocation.latitude, lng: route.endLocation.longitude });
  map.fitBounds(bounds, 60);
};

// Ver ruta y preparar mapa + Autocomplete + drag
const viewRoute = async (route) => {
  activeRoute.value = route;
  showRouteMap.value = true;
  await nextTick();

  const mapContainer = document.getElementById("routeMapContainer");
  if (!mapContainer) return;

  try {
    const maps = await loadGoogleMaps();

    const map = new maps.Map(mapContainer, {
      center: hasLatLng(route.startLocation)
        ? { lat: route.startLocation.latitude, lng: route.startLocation.longitude }
        : { lat: 0, lng: 0 },
      zoom: 12,
      mapId: "ENVIGO_MAP_DEFAULT",
    });
    mapInstance.value = map;

    geocoder = new maps.Geocoder();

    // Marcadores arrastrables
    if (hasLatLng(route.startLocation)) {
      startMarker = new maps.Marker({
        map,
        position: { lat: route.startLocation.latitude, lng: route.startLocation.longitude },
        draggable: true,
        label: "S",
        title: "Inicio",
      });
      startMarker.addListener("dragend", async (e) => {
        await updateStartFromLatLng(maps, e.latLng.lat(), e.latLng.lng());
      });
    }

    if (hasLatLng(route.endLocation)) {
      endMarker = new maps.Marker({
        map,
        position: { lat: route.endLocation.latitude, lng: route.endLocation.longitude },
        draggable: true,
        label: "F",
        title: "Fin",
      });
      endMarker.addListener("dragend", async (e) => {
        await updateEndFromLatLng(maps, e.latLng.lat(), e.latLng.lng());
      });
    }

    // Inputs visibles
    startAddress.value = route.startLocation?.formatted_address || (hasLatLng(route.startLocation) ? `${route.startLocation.latitude}, ${route.startLocation.longitude}` : "");
    endAddress.value = route.endLocation?.formatted_address || (hasLatLng(route.endLocation) ? `${route.endLocation.latitude}, ${route.endLocation.longitude}` : "");

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

    // Paradas (marcadores bonitos opcionales)
    (route.orders || []).forEach((o, idx) => {
      const lat = o?.order?.location?.latitude ?? o?.order?.delivery_location?.latitude;
      const lng = o?.order?.location?.longitude ?? o?.order?.delivery_location?.longitude;
      if (typeof lat === "number" && typeof lng === "number") {
        new maps.Marker({
          map,
          position: { lat, lng },
          title: `Parada ${idx + 1}`,
          label: `${idx + 1}`,
        });
      }
    });

    // Polyline actual
    drawRouteOnMap(maps, map, route);
  } catch (err) {
    console.error("💥 Error al dibujar mapa:", err);
    mapContainer.innerHTML = "❌ Error al cargar mapa.";
  }
};

// Reoptimizar ruta con nuevos anclajes
const reoptimizeActiveRoute = async () => {
  if (!activeRoute.value) return;
  const r = activeRoute.value;

  const stops = (r.orders || [])
    .map(s => {
      const lat = s?.order?.location?.latitude ?? s?.order?.delivery_location?.latitude;
      const lng = s?.order?.location?.longitude ?? s?.order?.delivery_location?.longitude;
      return { id: s._id, lat, lng };
    })
    .filter(s => typeof s.lat === "number" && typeof s.lng === "number");

  if (!hasLatLng(r.startLocation) || !hasLatLng(r.endLocation) || stops.length === 0) {
    alert("Faltan coordenadas de inicio/fin o paradas para reoptimizar.");
    return;
  }

  reoptLoading.value = true;
  try {
    const payload = {
      start: {
        latitude: r.startLocation.latitude,
        longitude: r.startLocation.longitude,
        formatted_address: startAddress.value || r.startLocation.formatted_address,
      },
      end: {
        latitude: r.endLocation.latitude,
        longitude: r.endLocation.longitude,
        formatted_address: endAddress.value || r.endLocation.formatted_address,
      },
      stops,
      mode: "driving",
      optimize: true,
    };

    const res = await apiService.routes.reoptimize(r._id, payload);
    console.log("📦 Resultado final reoptimize:", updated);
    const updated = res.data?.data || res.data?.route || res.data;
    if (!updated) throw new Error("Respuesta del servidor inesperada");

    // Actualiza listado y activa nueva ruta
    const idx = routes.value.findIndex(x => x._id === r._id);
    if (idx !== -1) routes.value[idx] = updated;
    activeRoute.value = updated;

    // Redibuja polyline
    const maps = await loadGoogleMaps();
    drawRouteOnMap(maps, mapInstance.value, updated);
  } catch (e) {
    console.error(e);
    alert("No se pudo reoptimizar la ruta.");
  } finally {
    reoptLoading.value = false;
  }
};

// Lifecycle
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
