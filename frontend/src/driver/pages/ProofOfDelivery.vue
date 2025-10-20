<template>
  <div class="p-4">
    <h2 class="text-lg font-bold mb-3">Prueba de Entrega</h2>
    <input type="file" @change="selectPhoto" accept="image/*" class="mb-3" />
    <textarea v-model="notes" placeholder="Notas..." class="w-full border rounded-md p-2 mb-3"></textarea>
    <button @click="submitProof" class="bg-green-600 text-white px-4 py-2 rounded">Guardar</button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { driverStore as store } from "../store";

const route = useRoute();
const router = useRouter();
const notes = ref("");
const photo = ref(null);

const selectPhoto = (e) => {
  photo.value = e.target.files[0];
};

const submitProof = async () => {
  const proof = {
    notes: notes.value,
    photo_urls: ["/uploads/mock.jpg"], // reemplazar con Cloudinary más adelante
  };

  await axios.patch(`/api/routes/${store.route._id}/orders/${route.params.orderId}/status`, {
    status: "delivered",
    deliveryProof: proof,
  });

  router.push("/driver/route");
};
</script>
