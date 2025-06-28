<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Pedidos Globales</h1>
      <button @click="exportOrders" class="btn-primary" :disabled="isExporting">
        {{ isExporting ? 'Exportando...' : 'Exportar para OptiRoute' }}
      </button>
    </div>
    
    <div class="filters-section">
      <div class="filters">
        <select v-model="filters.company_id" @change="fetchOrders">
          <option value="">Todas las Empresas</option>
          <option v-for="company in companies" :key="company._id" :value="company._id">
            {{ company.name }}
          </option>
        </select>
        <select v-model="filters.status" @change="fetchOrders">
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="processing">Procesando</option>
          <option value="shipped">Enviados</option>
          <option value="delivered">Entregados</option>
          <option value="cancelled">Cancelados</option>
        </select>
        <input type="date" v-model="filters.date_from" @change="fetchOrders" />
        <input type="date" v-model="filters.date_to" @change="fetchOrders" />
        <input 
          type="text" 
          v-model="filters.search" 
          @input="debounceSearch"
          placeholder="Buscar pedido..."
          class="search-input"
        />
      </div>
    </div>

    <div class="content-section">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Empresa</th>
              <th>Cliente</th>
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
              <td colspan="7" class="empty-row">No se encontraron pedidos.</td>
            </tr>
            <tr v-else v-for="order in orders" :key="order._id">
              <td class="order-number">{{ order.order_number }}</td>
              <td>{{ order.company_id.name }}</td>
              <td>{{ order.customer_name }}</td>
              <td>
                <span class="status-badge" :class="order.status">
                  {{ getStatusName(order.status) }}
                </span>
              </td>
              <td>${{ formatCurrency(order.total_amount) }}</td>
              <td>{{ formatDate(order.order_date) }}</td>
              <td>
                <button @click="openUpdateStatusModal(order)" class="btn-secondary">Cambiar Estado</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="pagination.totalPages > 1" class="pagination">
        <button @click="goToPage(pagination.page - 1)" :disabled="pagination.page <= 1" class="page-btn">Anterior</button>
        <span>Página {{ pagination.page }} de {{ pagination.totalPages }}</span>
        <button @click="goToPage(pagination.page + 1)" :disabled="pagination.page >= pagination.totalPages" class="page-btn">Siguiente</button>
      </div>
    </div>

    <Modal v-model="showUpdateStatusModal" title="Actualizar Estado del Pedido" width="500px">
      <UpdateOrderStatus v-if="selectedOrder" :order="selectedOrder" @close="showUpdateStatusModal = false" @status-updated="handleStatusUpdate" />
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiService } from '../services/api';
import Modal from '../components/Modal.vue';
import UpdateOrderStatus from '../components/UpdateOrderStatus.vue';

const orders = ref([]);
const companies = ref([]);
const pagination = ref({ page: 1, limit: 15, total: 0, totalPages: 1 });
const filters = ref({ company_id: '', status: '', date_from: '', date_to: '', search: '' });
const loadingOrders = ref(true);
const isExporting = ref(false);

const selectedOrder = ref(null);
const showUpdateStatusModal = ref(false);

onMounted(() => {
  fetchCompanies();
  fetchOrders();
});

async function fetchCompanies() {
  try {
    const { data } = await apiService.companies.getAll();
    companies.value = data;
  } catch (error) {
    console.error("Error fetching companies:", error);
  }
}

async function fetchOrders() {
  loadingOrders.value = true;
  try {
    const params = { page: pagination.value.page, limit: pagination.value.limit, ...filters.value };
    const { data } = await apiService.orders.getAll(params);
    orders.value = data.orders;
    pagination.value = data.pagination;
  } catch (error) {
    console.error('Error fetching orders:', error);
  } finally {
    loadingOrders.value = false;
  }
}

async function exportOrders() {
    isExporting.value = true;
    try {
        const response = await apiService.orders.export(filters.value);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `pedidos_optiroute_${Date.now()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting orders:', error);
        alert('No se encontraron pedidos para exportar con los filtros seleccionados.');
    } finally {
        isExporting.value = false;
    }
}

function openUpdateStatusModal(order) {
  selectedOrder.value = order;
  showUpdateStatusModal.value = true;
}

async function handleStatusUpdate({ orderId, newStatus }) {
  try {
    await apiService.orders.updateStatus(orderId, newStatus);
    const index = orders.value.findIndex(o => o._id === orderId);
    if (index !== -1) {
      orders.value[index].status = newStatus;
    }
    showUpdateStatusModal.value = false;
    alert('Estado actualizado con éxito.');
  } catch (error) {
    alert(`Error al actualizar estado: ${error.message}`);
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
  return new Date(dateStr).toLocaleDateString('es-CL');
}

function getStatusName(status) {
    const names = { pending: 'Pendiente', processing: 'Procesando', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' };
    return names[status] || status;
}
</script>

<style scoped>
.page-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 28px; font-weight: 700; color: #1f2937; }
.btn-primary { background-color: #10b981; color: white; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; }
.btn-primary:disabled { background-color: #6ee7b7; cursor: not-allowed; }
.filters-section { background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e5e7eb; }
.filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.filters select, .filters input { padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.search-input { grid-column: span 2; }
.content-section { background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
.data-table th { background: #f9fafb; font-weight: 600; font-size: 12px; color: #374151; }
.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.processing { background: #dbeafe; color: #1e40af; }
.status-badge.shipped { background: #e9d5ff; color: #6b21a8; }
.status-badge.delivered { background: #d1fae5; color: #065f46; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }
.btn-secondary { font-size: 12px; padding: 6px 12px; border-radius: 6px; border: 1px solid #d1d5db; background: white; cursor: pointer; }
.pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid #e5e7eb; }
.page-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.page-btn:disabled { background: #d1d5db; cursor: not-allowed; }
.loading-row, .empty-row { text-align: center; padding: 40px; color: #6b7280; font-style: italic; }
</style>