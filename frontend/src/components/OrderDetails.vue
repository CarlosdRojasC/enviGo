<template>
  <div v-if="order" class="order-details">
    <div class="detail-grid">
      <div class="detail-item full-width section-header">
        <h4>Información del Cliente</h4>
      </div>
      <div class="detail-item">
        <span class="label">Cliente:</span>
        <span class="value">{{ order.customer_name }}</span>
      </div>
      <div class="detail-item">
        <span class="label">Email:</span>
        <span class="value">{{ order.customer_email || 'No disponible' }}</span>
      </div>
       <div class="detail-item">
        <span class="label">Teléfono:</span>
        <span class="value">{{ order.customer_phone || 'No disponible' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">Documento:</span>
        <span class="value">{{ order.customer_document || 'No disponible' }}</span>
      </div>
      <div class="detail-item full-width">
        <span class="label">Dirección de Envío:</span>
        <span class="value">{{ order.shipping_address }}, {{ order.shipping_city }}</span>
      </div>
      
      <div class="detail-item full-width section-header">
        <h4>Detalles del Pedido</h4>
      </div>
       <div class="detail-item">
        <span class="label">Canal de Venta:</span>
        <span class="value">{{ order.channel_id?.channel_name }} ({{ order.channel_id?.channel_type }})</span>
      </div>
       <div class="detail-item">
        <span class="label">ID Externo:</span>
        <span class="value">{{ order.external_order_id }}</span>
      </div>
       <div class="detail-item">
        <span class="label">Costo de Envío:</span>
        <span class="value">${{ formatCurrency(order.shipping_cost) }}</span>
      </div>
      <div class="detail-item">
        <span class="label">Fecha de Creación:</span>
        <span class="value">{{ formatDate(order.order_date) }}</span>
      </div>
      <div v-if="order.delivery_date" class="detail-item">
        <span class="label">Fecha de Entrega:</span>
        <span class="value">{{ formatDate(order.delivery_date) }}</span>
      </div>

      <div class="detail-item full-width">
        <span class="label">Notas:</span>
        <span class="value">{{ order.notes || 'Sin notas.' }}</span>
      </div>
    </div>
  </div>
  <div v-else class="loading-details">
    Cargando detalles del pedido...
  </div>
</template>

<script setup>
defineProps({
  order: { type: Object, default: null }
});

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

// Función para formatear fechas de manera más completa
function formatDate(dateStr) {
  if (!dateStr) return 'No disponible';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<style scoped>
.order-details {
  font-size: 14px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  background-color: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}
.detail-item.full-width {
  grid-column: 1 / -1;
}
.detail-item.section-header {
    background-color: #eef2ff;
    border-color: #c7d2fe;
    padding: 8px 12px;
}
.section-header h4 {
    margin: 0;
    color: #4338ca;
    font-size: 14px;
}
.label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
  font-size: 12px;
}
.value {
  color: #6b7280;
}
.loading-details {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}
</style>