<template>
  <div class="p-4">
    <h2 class="text-lg font-bold mb-2">📡 Sincronización Offline</h2>
    <p class="text-sm text-gray-600 mb-4">Aquí se mostrarán las actualizaciones pendientes.</p>
    <button @click="syncNow" class="bg-blue-600 text-white px-4 py-2 rounded">Sincronizar Ahora</button>
  </div>
</template>

<script setup>
import axios from "axios";

const syncNow = async () => {
  const updates = JSON.parse(localStorage.getItem("driver_offline_updates") || "[]");
  if (!updates.length) {
    alert("No hay actualizaciones pendientes.");
    return;
  }
  await axios.post(`/api/routes/${updates[0].routeId}/sync-offline`, { updates });
  localStorage.removeItem("driver_offline_updates");
  alert("✅ Actualizaciones sincronizadas.");
};
</script>
