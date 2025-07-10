<template>
  <div class="manifest-container">
    <!-- HEADER solo visible en pantalla -->
    <div class="manifest-header no-print">
      <h1>Manifiesto de Retiro</h1>
      <button @click="printManifest" class="print-button">Imprimir</button>
    </div>

    <!-- ÁREA A IMPRIMIR (visible también en frontend) -->
    <div id="print-area">
      <div v-if="isLoading" class="loading">Cargando manifiesto...</div>
      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="manifestData" class="manifest-content">
        <div class="manifest-info">
          <div class="company-details">
            <h2>{{ manifestData.company.name }}</h2>
            <p>{{ manifestData.company.address }}</p>
          </div>
          <div class="manifest-meta">
            <p><strong>Fecha de Emisión:</strong> {{ formatDate(manifestData.generationDate) }}</p>
            <p><strong>Total de Pedidos:</strong> {{ manifestData.orders.length }}</p>
          </div>
        </div>

        <table class="manifest-table">
          <thead>
            <tr>
              <th>N° Pedido</th>
              <th>Cliente</th>
              <th>Comuna</th>
              <th>Bultos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in manifestData.orders" :key="order._id">
              <td>{{ order.order_number }}</td>
              <td>{{ order.customer_name }}</td>
              <td>{{ order.shipping_commune || 'N/A' }}</td>
              <td>{{ order.load1Packages || 1 }}</td>
            </tr>
          </tbody>
        </table>

        <div class="signature-section">
          <div class="signature-box">
            <p><strong>Nombre de quien retira:</strong></p>
            <div class="line"></div>
          </div>
          <div class="signature-box">
            <p><strong>RUT:</strong></p>
            <div class="line"></div>
          </div>
          <div class="signature-box">
            <p><strong>Firma:</strong></p>
            <div class="line"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { apiService } from '../services/api';

const route = useRoute();
const manifestData = ref(null);
const isLoading = ref(true);
const error = ref(null);

onMounted(async () => {
  const ids = route.query.ids;
  if (!ids) {
    error.value = "No se proporcionaron IDs de pedidos.";
    isLoading.value = false;
    return;
  }

  try {
    const response = await apiService.orders.getManifestData(ids.split(','));
    manifestData.value = response.data;
  } catch (err) {
    error.value = "Error al cargar los datos del manifiesto.";
    console.error(err);
  } finally {
    isLoading.value = false;
  }
});

function printManifest() {
  const printContents = document.getElementById('print-area').innerHTML;
  const printWindow = window.open('', '', 'width=800,height=600');

  printWindow.document.write(`
    <html>
      <head>
        <title>Manifiesto de Retiro</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 14px;
          }
          h1, h2 {
            text-align: center;
          }
          .manifest-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2rem;
            border-bottom: 2px solid #ccc;
            padding-bottom: 1rem;
          }
          .manifest-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 3rem;
          }
          .manifest-table th, .manifest-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .manifest-table th {
            background-color: #f2f2f2;
          }
          .signature-section {
            display: flex;
            justify-content: space-around;
            margin-top: 4rem;
          }
          .signature-box {
            width: 30%;
            text-align: center;
          }
          .line {
            border-bottom: 1px solid #000;
            margin-top: 2.5rem;
          }
        </style>
      </head>
      <body>
        ${printContents}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('es-CL', options);
}
</script>

<style scoped>
.manifest-container {
  font-family: Arial, sans-serif;
  padding: 2rem;
  max-width: 800px;
  margin: auto;
}
.manifest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.print-button {
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.loading, .error {
  text-align: center;
  margin-top: 2rem;
}
.manifest-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  border-bottom: 2px solid #ccc;
  padding-bottom: 1rem;
}
.manifest-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 3rem;
}
.manifest-table th, .manifest-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
.manifest-table th {
  background-color: #f2f2f2;
}
.signature-section {
  display: flex;
  justify-content: space-around;
  margin-top: 4rem;
}
.signature-box {
  width: 30%;
  text-align: center;
}
.line {
  border-bottom: 1px solid #000;
  margin-top: 2.5rem;
}
</style>
