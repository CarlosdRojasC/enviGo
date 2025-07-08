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
      
      <!-- Dirección separada en campos específicos -->
      <div class="detail-item full-width section-header">
        <h4>Dirección de Envío</h4>
      </div>
      <div class="detail-item full-width">
        <span class="label">Dirección:</span>
        <span class="value">{{ order.shipping_address || 'No especificada' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">Comuna:</span>
        <span class="value commune-highlight">{{ order.shipping_commune || 'No especificada' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">Región:</span>
        <span class="value">{{ order.shipping_state || 'Región Metropolitana' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">Código Postal:</span>
        <span class="value">{{ order.shipping_zip || 'No especificado' }}</span>
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
        <span class="label">Monto Total:</span>
        <span class="value">${{ formatCurrency(order.total_amount) }}</span>
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

      <!-- NUEVO: Información de logística si está disponible -->
      <div v-if="hasLogisticsInfo" class="detail-item full-width section-header">
        <h4>Información de Logística</h4>
      </div>
      <div v-if="order.priority" class="detail-item">
        <span class="label">Prioridad:</span>
        <span class="value" :class="getPriorityClass(order.priority)">{{ order.priority }}</span>
      </div>
      <div v-if="order.serviceTime" class="detail-item">
        <span class="label">Tiempo de Servicio:</span>
        <span class="value">{{ order.serviceTime }} minutos</span>
      </div>
      <div v-if="order.timeWindowStart || order.timeWindowEnd" class="detail-item">
        <span class="label">Ventana Horaria:</span>
        <span class="value">{{ formatTimeWindow(order.timeWindowStart, order.timeWindowEnd) }}</span>
      </div>
      <div v-if="order.load1Packages" class="detail-item">
        <span class="label">N° Paquetes:</span>
        <span class="value">{{ order.load1Packages }}</span>
      </div>
      <div v-if="order.load2WeightKg" class="detail-item">
        <span class="label">Peso Total:</span>
        <span class="value">{{ order.load2WeightKg }} kg</span>
      </div>

      <!-- NUEVO: Información de Shipday si está disponible -->
      <div v-if="hasShipdayInfo" class="detail-item full-width section-header">
        <h4>Estado en Shipday</h4>
      </div>
      <div v-if="order.shipday_order_id" class="detail-item">
        <span class="label">ID en Shipday:</span>
        <span class="value shipday-id">{{ order.shipday_order_id }}</span>
      </div>
      <div v-if="order.shipday_driver_id" class="detail-item">
        <span class="label">Conductor Asignado:</span>
        <span class="value driver-assigned">ID: {{ order.shipday_driver_id }}</span>
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
import { computed } from 'vue';

const props = defineProps({
  order: { type: Object, default: null }
});

// Computed para verificar si hay información adicional
const hasLogisticsInfo = computed(() => {
  return props.order && (
    props.order.priority || 
    props.order.serviceTime || 
    props.order.timeWindowStart || 
    props.order.timeWindowEnd || 
    props.order.load1Packages || 
    props.order.load2WeightKg
  );
});

const hasShipdayInfo = computed(() => {
  return props.order && (
    props.order.shipday_order_id || 
    props.order.shipday_driver_id
  );
});

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

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

function getPriorityClass(priority) {
  switch(priority?.toLowerCase()) {
    case 'alta': return 'priority-high';
    case 'baja': return 'priority-low';
    default: return 'priority-normal';
  }
}

function formatTimeWindow(start, end) {
  if (!start && !end) return 'No especificada';
  if (start && end) return `${start} - ${end}`;
  if (start) return `Desde ${start}`;
  if (end) return `Hasta ${end}`;
  return 'No especificada';
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

/* NUEVO: Estilos específicos para campos importantes */
.commune-highlight {
  background-color: #dbeafe;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  color: #1e40af;
}

.shipday-id {
  font-family: 'Courier New', monospace;
  background-color: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.driver-assigned {
  background-color: #d1fae5;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  color: #065f46;
}

.priority-high {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.priority-low {
  background-color: #f3f4f6;
  color: #6b7280;
  padding: 2px 6px;
  border-radius: 4px;
}

.priority-normal {
  background-color: #dbeafe;
  color: #1e40af;
  padding: 2px 6px;
  border-radius: 4px;
}

.loading-details {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}
</style>