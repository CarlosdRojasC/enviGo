<template>
  <div v-if="order" class="order-details">
    <div class="detail-grid">
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
      <div class="detail-item full-width">
        <span class="label">Dirección de Envío:</span>
        <span class="value">{{ order.shipping_address }}, {{ order.shipping_city }}</span>
      </div>
      <div class="detail-item">
        <span class="label">Monto Total:</span>
        <span class="value">${{ formatCurrency(order.total_amount) }}</span>
      </div>
       <div class="detail-item">
        <span class="label">Costo de Envío:</span>
        <span class="value">${{ formatCurrency(order.shipping_cost) }}</span>
      </div>
      <div class="detail-item">
        <span class="label">Canal de Venta:</span>
        <span class="value">{{ order.channel_id?.channel_name }} ({{ order.channel_id?.channel_type }})</span>
      </div>
       <div class="detail-item">
        <span class="label">ID Externo:</span>
        <span class="value">{{ order.external_order_id }}</span>
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
}
.detail-item.full-width {
  grid-column: 1 / -1;
}
.label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
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