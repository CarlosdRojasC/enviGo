<template>
  <div class="update-status-container">
    <div v-if="order">
      <p class="current-status-info">
        Cambiando estado para el pedido <strong>#{{ order.order_number }}</strong>.
      </p>
      <div class="form-group">
        <label for="status-select">Nuevo Estado:</label>
        <select id="status-select" v-model="newStatus" class="status-select">
          <option disabled value="">Seleccione un estado...</option>
          <option value="pending">Pendiente</option>
          <option value="processing">Procesando</option>
          <option value="shipped">Enviado</option>
          <option value="delivered">Entregado</option>
          <option value="cancelled">Cancelado</option>
          <option value="ready_for_pickup">Listo para recoger</option>
          <option value="picked_up">Retirado</option>
          <option value="warehouse_received">Recibido en Bodega</option>
        </select>
      </div>
      <div class="actions">
        <button @click="$emit('close')" class="btn-cancel">Cancelar</button>
        <button @click="submitUpdate" class="btn-save" :disabled="!newStatus || newStatus === order.status">
          Guardar Cambios
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  order: { type: Object, required: true }
});

const emit = defineEmits(['close', 'status-updated']);

const newStatus = ref('');

// Setea el estado inicial cuando el pedido cambia
watch(() => props.order, (newOrder) => {
  if (newOrder) {
    newStatus.value = newOrder.status;
  }
}, { immediate: true });

function submitUpdate() {
  if (newStatus.value && newStatus.value !== props.order.status) {
    emit('status-updated', { orderId: props.order._id, newStatus: newStatus.value });
  }
}
</script>

<style scoped>
.update-status-container {
  padding: 10px;
}
.current-status-info {
  margin-bottom: 20px;
  font-size: 14px;
  color: #374151;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
}
.status-select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  font-size: 16px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
.actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}
.btn-cancel {
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
}
.btn-save {
  background-color: #3b82f6;
  color: white;
}
.btn-save:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
</style>