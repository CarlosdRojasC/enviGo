<template>
  <div class="page-container">
    <h1 class="page-title">Mis Pedidos</h1>
    
    <div class="filters-section">
      <div class="filters">
        <select v-model="filters.status" @change="fetchOrders">
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="processing">Procesando</option>
          <option value="shipped">Enviados</option>
          <option value="delivered">Entregados</option>
          <option value="cancelled">Cancelados</option>
        </select>
        
        <select v-model="filters.channel_id" @change="fetchOrders">
          <option value="">Todos los canales</option>
          <option v-for="channel in channels" :key="channel._id" :value="channel._id">
            {{ channel.channel_name }}
          </option>
        </select>
        
        <input type="date" v-model="filters.date_from" @change="fetchOrders" />
        <input type="date" v-model="filters.date_to" @change="fetchOrders" />
        
        <input 
          type="text" 
          v-model="filters.search" 
          @input="debounceSearch"
          placeholder="Buscar por cliente, email o #pedido"
          class="search-input"
        />

      </div>
    </div>

    <div class="orders-section">
      <div class="orders-table-wrapper">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Canal</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingOrders">
              <td colspan="7" class="loading-row">Cargando pedidos...</td>
            </tr>
            <tr v-else-if="orders.length === 0">
              <td colspan="7" class="empty-row">No se encontraron pedidos con los filtros actuales.</td>
            </tr>
            <tr v-else v-for="order in orders" :key="order._id" class="order-row">
              <td class="order-number">{{ order.order_number }}</td>
              <td class="customer-info">
                <div class="customer-name">{{ order.customer_name }}</div>
                <div class="customer-email">{{ order.customer_email }}</div>
              </td>
              <td class="channel-info">
                <span v-if="order.channel_id" class="channel-badge" :class="order.channel_id.channel_type">
                  {{ order.channel_id.channel_name }}
                </span>
              </td>
              <td class="order-status">
                <span class="status-badge" :class="order.status">
                  {{ getStatusName(order.status) }}
                </span>
              </td>
              <td class="order-total">${{ formatCurrency(order.total_amount) }}</td>
              <td class="order-date">{{ formatDate(order.order_date) }}</td>
              <td class="order-actions">
                <button @click="openOrderDetailsModal(order)" class="action-btn view">👁️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="pagination.totalPages > 1" class="pagination">
        <button @click="goToPage(pagination.page - 1)" :disabled="pagination.page <= 1" class="page-btn">
          ← Anterior
        </button>
        <span class="page-info">
          Página {{ pagination.page }} de {{ pagination.totalPages }}
        </span>
        <button @click="goToPage(pagination.page + 1)" :disabled="pagination.page >= pagination.totalPages" class="page-btn">
          Siguiente →
        </button>
      </div>
    </div>

    <Modal v-model="showOrderDetailsModal" title="Detalles del Pedido" width="700px">
      <OrderDetails v-if="selectedOrder" :order="selectedOrder" />
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../store/auth';
import { apiService } from '../services/api';
import Modal from '../components/Modal.vue';
import OrderDetails from '../components/OrderDetails.vue';

const auth = useAuthStore();
const user = computed(() => auth.user);

// Estado de la página de pedidos
const orders = ref([]);
const channels = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });
const filters = ref({ status: '', channel_id: '', date_from: '', date_to: '', search: '' });
const loadingOrders = ref(true);


// Estado para el modal
const selectedOrder = ref(null);
const showOrderDetailsModal = ref(false);
const loadingOrderDetails = ref(false);

onMounted(() => {
    fetchOrders();
    fetchChannels(); // Para popular el filtro de canales
});

async function fetchOrders() {
    loadingOrders.value = true;
    try {
        const params = {
            page: pagination.value.page,
            limit: pagination.value.limit,
            ...filters.value
        };
        const { data } = await apiService.orders.getAll(params);
        orders.value = data.orders;
        pagination.value = data.pagination;
    } catch (error) {
        console.error('Error fetching orders:', error);
        alert('No se pudieron cargar los pedidos.');
    } finally {
        loadingOrders.value = false;
    }
}

async function fetchChannels() {
    try {
        const companyId = user.value?.company_id || user.value?.company?._id;
        if (!companyId) return;
        const { data } = await apiService.channels.getByCompany(companyId);
        channels.value = data;
    } catch (error) {
        console.error('Error fetching channels:', error);
    }
}



async function openOrderDetailsModal(order) {
    selectedOrder.value = null;
    loadingOrderDetails.value = true;
    showOrderDetailsModal.value = true;
    try {
        const { data } = await apiService.orders.getById(order._id);
        selectedOrder.value = data;
    } catch (error) {
        console.error("Error al obtener detalles del pedido:", error);
        showOrderDetailsModal.value = false;
    } finally {
        loadingOrderDetails.value = false;
    }
}

let searchTimeout;
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        pagination.value.page = 1;
        fetchOrders();
    }, 500);
}

function goToPage(page) {
    if (page >= 1 && page <= pagination.value.totalPages) {
        pagination.value.page = page;
        fetchOrders();
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CL').format(amount || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getStatusName(status) {
    const names = {
        pending: 'Pendiente', processing: 'Procesando', shipped: 'Enviado',
        delivered: 'Entregado', cancelled: 'Cancelado'
    };
    return names[status] || status;
}
</script>

<style scoped>
/* Estilos extraídos y adaptados del dashboard para mantener la consistencia */
.page-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 24px;
}
.filters-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  margin-bottom: 30px;
}
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
  align-items: center;
}
.filters select,
.filters input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}
.search-input {
  grid-column: span 2;
}
.export-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}
.export-btn:hover {
  background: #059669;
}
.export-btn:disabled {
  background: #6ee7b7;
  cursor: not-allowed;
}
.orders-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}
.orders-table-wrapper {
  overflow-x: auto;
}
.orders-table {
  width: 100%;
  border-collapse: collapse;
}
.orders-table th {
  background: #f9fafb;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
}
.orders-table td {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
}
.order-row:last-child td {
  border-bottom: none;
}
.customer-name { font-weight: 500; color: #1f2937; }
.customer-email { font-size: 12px; color: #6b7280; }
.channel-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.channel-badge.shopify { background: #95f3d9; color: #065f46; }
.channel-badge.woocommerce { background: #c7d2fe; color: #312e81; }
.channel-badge.mercadolibre { background: #fed7aa; color: #9a3412; }
.status-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.processing { background: #dbeafe; color: #1e40af; }
.status-badge.shipped { background: #e9d5ff; color: #6b21a8; }
.status-badge.delivered { background: #d1fae5; color: #065f46; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }
.order-actions { display: flex; gap: 8px; }
.action-btn { background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
.pagination { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
.page-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.page-btn:disabled { background: #d1d5db; cursor: not-allowed; }
.page-info { color: #6b7280; font-size: 14px; }
.loading-row, .empty-row { text-align: center; padding: 40px; color: #6b7280; font-style: italic; }
</style>