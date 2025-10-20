<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <h1 class="text-xl font-bold mb-3">Mi Ruta Activa</h1>

    <div v-if="store.isLoading">
      <p class="text-gray-600">Cargando ruta...</p>
    </div>

    <div v-else-if="!store.route">
      <p class="text-gray-600">No tienes rutas asignadas.</p>
    </div>

    <div v-else>
      <div id="driverMap" class="w-full h-72 rounded-lg shadow mb-4"></div>

      <div v-for="order in store.route.orders" :key="order._id" class="bg-white p-4 rounded-lg shadow mb-3">
        <h3 class="font-semibold">{{ order.order?.customer_name }}</h3>
        <p class="text-sm text-gray-500">{{ order.order?.shipping_address || 'Sin dirección' }}</p>
        <div class="flex gap-2 mt-2">
          <button @click="markDelivered(order)" class="bg-green-600 text-white px-3 py-1 rounded">Entregar</button>
          <button @click="viewProof(order.order._id)" class="bg-blue-600 text-white px-3 py-1 rounded">Prueba</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { driverStore as store } from "../store";
import axios from "axios";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useRouter } from "vue-router";

const router = useRouter();

const drawMap = async () => {
  if (!store.route) return;
  setOptions({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    version: "weekly",
    libraries: ["maps", "geometry", "marker"],
  });

  const { Map } = await importLibrary("maps");
  const { encoding } = await importLibrary("geometry");

  const map = new Map(document.getElementById("driverMap"), {
    center: {
      lat: store.route.startLocation.latitude,
      lng: store.route.startLocation.longitude,
    },
    zoom: 12,
  });

  if (store.route.optimization?.overview_polyline) {
    const path = encoding.decodePath(store.route.optimization.overview_polyline);
    new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#2563eb",
      strokeOpacity: 0.8,
      strokeWeight: 5,
      map,
    });
  }
};

onMounted(async () => {
  await store.loadActiveRoute();
  await drawMap();
});

const markDelivered = async (order) => {
  await axios.patch(`/api/routes/${store.route._id}/orders/${order.order._id}/status`, {
    status: "delivered",
  });
  await store.loadActiveRoute();
};

const viewProof = (id) => router.push(`/driver/proof/${id}`);
</script>
