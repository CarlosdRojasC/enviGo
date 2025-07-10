<template>
  <div class="orders-page">
    <!-- Header con estadísticas -->
    <div class="page-header">
      <h1 class="page-title">Mis Pedidos</h1>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-number">{{ orders.length }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ getOrdersByStatus('shipped').length }}</span>
          <span class="stat-label">En Tránsito</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ getOrdersByStatus('delivered').length }}</span>
          <span class="stat-label">Entregados</span>
        </div>
      </div>
    </div>

    <!-- Filtros compactos -->
    <div class="filters-section">
      <div class="filters-row">
        <select v-model="filters.status" @change="fetchOrders" class="filter-select">
          <option value="">📋 Todos los estados</option>
          <option value="pending">⏳ Pendientes</option>
          <option value="processing">⚙️ Procesando</option>
          <option value="shipped">🚚 En Tránsito</option>
          <option value="delivered">✅ Entregados</option>
          <option value="cancelled">❌ Cancelados</option>
        </select>

        <select v-model="filters.channel_id" @change="fetchOrders" class="filter-select">
          <option value="">🏪 Todos los canales</option>
          <option v-for="channel in channels" :key="channel._id" :value="channel._id">
            {{ channel.channel_name }}
          </option>
        </select>

        <input type="date" v-model="filters.date_from" @change="fetchOrders" class="filter-input" />
        <input type="date" v-model="filters.date_to" @change="fetchOrders" class="filter-input" />

        <input type="text" v-model="filters.search" @input="debounceSearch" placeholder="🔍 Buscar pedidos..."
          class="search-input" />
      </div>
    </div>

    <!-- Sección de acciones masivas -->
    <div v-if="selectedOrders.length > 0" class="actions-header">
      <button 
        @click="generateManifest"
        :disabled="selectedOrders.length === 0"
        class="btn-manifest">
        Generar Manifiesto ({{ selectedOrders.length }})
      </button>
    </div>

    <!-- Tabla de pedidos -->
    <div class="orders-table-section">
      <div v-if="loadingOrders" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando pedidos...</p>
      </div>

      <div v-else-if="orders.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No hay pedidos</h3>
        <p>No se encontraron pedidos con los filtros actuales.</p>
      </div>

      <div v-else class="table-container">
        <table class="orders-table">
          <thead>
            <tr>
              <th class="col-checkbox">
                <input 
                  type="checkbox" 
                  @change="selectAllOrders"
                  :checked="selectedOrders.length === orders.length && orders.length > 0"
                />
              </th>
              <th class="col-order">#Pedido</th>
              <th class="col-customer">Cliente</th>
              <th class="col-address">Dirección</th>
              <th class="col-status">Estado</th>
              <th class="col-tracking">Tracking</th>
              <th class="col-amount">Total</th>
              <th class="col-date">Fecha</th>
              <th class="col-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order._id" class="order-row" :class="getRowClass(order)">
              <!-- Checkbox para seleccionar pedido -->
              <td class="col-checkbox">
                <input 
                  type="checkbox"
                  :value="order._id"
                  v-model="selectedOrders"
                  class="checkbox-input"
                />
              </td>

              <!-- Número de pedido -->
              <td class="col-order">
                <div class="order-number-cell">
                  <span class="order-number">#{{ order.order_number }}</span>
                  <span v-if="order.channel_id" class="channel-badge" :class="order.channel_id.channel_type">
                    {{ getChannelIcon(order.channel_id.channel_type) }}
                  </span>
                </div>
              </td>

              <!-- Cliente -->
              <td class="col-customer">
                <div class="customer-cell">
                  <div class="customer-name">{{ order.customer_name }}</div>
                  <div v-if="order.customer_phone" class="customer-contact">
                    📱 {{ order.customer_phone }}
                  </div>
                </div>
              </td>

              <!-- Dirección -->
              <td class="col-address">
                <div class="address-cell">
                  <div class="address-text">{{ truncateAddress(order.shipping_address) }}</div>
                  <div v-if="order.shipping_commune" class="commune-tag">
                    📍 {{ order.shipping_commune }}
                  </div>
                </div>
              </td>

              <!-- Estado -->
              <td class="col-status">
                <div class="status-cell">
                  <span class="status-badge" :class="order.status">
                    {{ getStatusIcon(order.status) }} {{ getStatusName(order.status) }}
                  </span>
                  <div v-if="order.driver_info?.name" class="driver-info">
                    👨‍💼 {{ order.driver_info.name }}
                  </div>
                </div>
              </td>

              <!-- Tracking -->
              <td class="col-tracking">
                <div class="tracking-cell">
                  <!-- PRIORIDAD 1: Pedido entregado - SIEMPRE mostrar prueba de entrega -->
                  <div v-if="order.status === 'delivered'" class="proof-delivery">
                    <span class="proof-indicator">📋 Prueba</span>
                    <button @click="showProofOfDelivery(order)" class="proof-btn">
                      📸 Ver Prueba
                    </button>
                  </div>
                  <!-- PRIORIDAD 2: Tracking en vivo (solo para pedidos NO entregados) -->
                  <div v-else-if="order.status === 'shipped'" class="tracking-live">
                    <span class="live-indicator">🔴 Live</span>
                    <button @click="openLiveTracking(order)" class="track-live-btn">
                      📍 Ver Mapa
                    </button>
                  </div>
                  <!-- PRIORIDAD 3: Tracking general (para pedidos sincronizados pero sin live tracking) -->
                  <div v-else-if="hasTrackingInfo(order)" class="tracking-available">
                    <span class="tracking-indicator">📦 Info</span>
                    <button @click="openTrackingModal(order)" class="tracking-btn">
                      🚚 Seguimiento
                    </button>
                  </div>
                  <!-- PRIORIDAD 4: Sin información de tracking -->
                  <div v-else class="no-tracking">
                    <span class="no-tracking-text">Sin tracking</span>
                  </div>
                </div>
              </td>

              <!-- Total -->
              <td class="col-amount">
                <div class="amount-cell">
                  <span class="amount">${{ formatCurrency(order.total_amount || order.shipping_cost) }}</span>
                </div>
              </td>

              <!-- Fecha -->
              <td class="col-date">
                <div class="date-cell">
                  <div class="order-date">{{ formatDate(order.order_date) }}</div>
                  <div v-if="order.delivery_date" class="delivery-date">
                    ✅ {{ formatDate(order.delivery_date) }}
                  </div>
                </div>
              </td>

              <!-- Acciones -->
              <td class="col-actions">
                <div class="actions-cell">
                  <button 
                    v-if="order.status === 'pending'" 
                    @click="markAsReady(order)" 
                    class="action-btn ready" 
                    title="Marcar como Listo para Retiro">
                    ✔️
                  </button>
                  <button @click="openOrderDetailsModal(order)" class="action-btn details" title="Ver detalles">
                    👁️
                  </button>

                  <button v-if="order.status === 'shipped'" @click="openLiveTracking(order)"
                    class="action-btn tracking live" title="Tracking en vivo">
                    🚚
                  </button>

                  <button v-else-if="hasTrackingInfo(order)" @click="openTrackingModal(order)"
                    class="action-btn tracking" title="Ver seguimiento">
                    📍
                  </button>

                  <button v-if="hasProofOfDelivery(order)" @click="showProofOfDelivery(order)" class="action-btn proof"
                    title="Ver prueba de entrega">
                    📸
                  </button>

                  <button v-if="canContactSupport(order)" @click="contactSupport(order)" class="action-btn support"
                    title="Contactar soporte">
                    💬
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div v-if="pagination.totalPages > 1" class="pagination">
        <button @click="goToPage(pagination.page - 1)" :disabled="pagination.page <= 1" class="page-btn">
          ← Anterior
        </button>
        <span class="page-info">
          Página {{ pagination.page }} de {{ pagination.totalPages }} ({{ pagination.total }} pedidos)
        </span>
        <button @click="goToPage(pagination.page + 1)" :disabled="pagination.page >= pagination.totalPages"
          class="page-btn">
          Siguiente →
        </button>
      </div>
    </div>

    <!-- Modales -->
    <Modal v-model="showOrderDetailsModal" :title="`Pedido #${selectedOrder?.order_number}`" width="800px">
      <OrderDetails v-if="selectedOrder" :order="selectedOrder" />
    </Modal>

    <Modal v-model="showTrackingModal" :title="`🚚 Tracking - Pedido #${selectedTrackingOrder?.order_number}`"
      width="700px">
      <OrderTracking 
        v-if="selectedTrackingOrder" 
        :order-id="selectedTrackingOrder._id" 
        @support-contact="handleTrackingSupport"
        @show-proof="handleShowProof"
      />
    </Modal>

    <Modal v-model="showProofModal" :title="`📋 Prueba de Entrega - #${selectedProofOrder?.order_number}`"
      width="700px">
      <div v-if="loadingOrderDetails" class="loading-state">
        <div class="loading-spinner"></div>
      </div>
      <ProofOfDelivery v-else-if="selectedProofOrder" :order="selectedProofOrder" />
    </Modal>

    <!-- Modal de soporte -->
    <Modal v-model="showSupportModal" title="💬 Contactar Soporte" width="500px">
      <div v-if="supportOrder" class="support-form">
        <div class="support-order-info">
          <h4>Pedido: #{{ supportOrder.order_number }}</h4>
          <p>Cliente: {{ supportOrder.customer_name }}</p>
          <p>Estado: {{ getStatusName(supportOrder.status) }}</p>
        </div>

        <div class="support-options">
          <button @click="emailSupport(supportOrder)" class="support-option">
            📧 Enviar Email
          </button>
          <button @click="whatsappSupport(supportOrder)" class="support-option">
            💬 WhatsApp
          </button>
          <button @click="callSupport(supportOrder)" class="support-option">
            📞 Llamar
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router'; // ✅ AGREGADO
import { useAuthStore } from '../store/auth';
import { apiService } from '../services/api';
import Modal from '../components/Modal.vue';
import OrderDetails from '../components/OrderDetails.vue';
import OrderTracking from '../components/OrderTracking.vue';
import ProofOfDelivery from '../components/ProofOfDelivery.vue';

const router = useRouter(); // ✅ AGREGADO
const auth = useAuthStore();
const user = computed(() => auth.user);

// Estado de la página
const orders = ref([]);
const channels = ref([]);
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 1 });
const filters = ref({ status: '', channel_id: '', date_from: '', date_to: '', search: '' });
const loadingOrders = ref(true);
const loadingOrderDetails = ref(false); // ✅ AGREGADO

// ✅ AGREGADO: Estado para selección de pedidos
const selectedOrders = ref([]);

// Estados de modales
const selectedOrder = ref(null);
const showOrderDetailsModal = ref(false);
const selectedTrackingOrder = ref(null);
const showTrackingModal = ref(false);
const selectedProofOrder = ref(null);
const showProofModal = ref(false);
const supportOrder = ref(null);
const showSupportModal = ref(false);

onMounted(() => {
  fetchOrders();
  fetchChannels();
});

// Funciones principales
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

async function markAsReady(orderToUpdate) {
  try {
    await apiService.orders.markAsReady(orderToUpdate._id);
    
    const index = orders.value.findIndex(o => o._id === orderToUpdate._id);
    if (index !== -1) {
      orders.value[index].status = 'Listo para retiro';
    }
    
    alert(`Pedido #${orderToUpdate.order_number} marcado como listo para retiro.`);
    
  } catch (error) {
    console.error("Error al marcar el pedido:", error);
    alert("No se pudo actualizar el estado del pedido.");
  }
}

// ✅ AGREGADO: Función para seleccionar todos los pedidos
function selectAllOrders(event) {
  if (event.target.checked) {
    selectedOrders.value = orders.value.map(order => order._id);
  } else {
    selectedOrders.value = [];
  }
}

// ✅ AGREGADO: Función para generar manifiesto
function generateManifest() {
  if (selectedOrders.value.length === 0) {
    alert('Por favor, selecciona al menos un pedido.');
    return;
  }
  
  try {
    // Convertir el array de IDs a un string separado por comas
    const ids = selectedOrders.value.join(',');
    
    console.log('📋 Generando manifiesto para pedidos:', selectedOrders.value);
    
    // Crear la URL de la ruta
    const routeData = router.resolve({ 
      name: 'PickupManifest', 
      query: { ids } 
    });
    
    console.log('🔗 URL del manifiesto:', routeData.href);
    
    // Abrir en una nueva pestaña
    const newWindow = window.open(routeData.href, '_blank');
    
    // Verificar si la ventana se abrió correctamente
    if (!newWindow) {
      alert('No se pudo abrir el manifiesto. Por favor, permite las ventanas emergentes.');
      return;
    }
    
    console.log('✅ Manifiesto abierto en nueva pestaña');
    
    // Limpiar selección después de generar el manifiesto
    selectedOrders.value = [];
    
  } catch (error) {
    console.error('❌ Error generando manifiesto:', error);
    alert('Error al generar el manifiesto. Por favor, inténtalo de nuevo.');
  }
}

// Funciones de tracking y pruebas de entrega
function hasTrackingInfo(order) {
  // ✅ EXCLUIR EXPLÍCITAMENTE PEDIDOS ENTREGADOS
  if (order.status === 'delivered') {
    return false; // Los pedidos entregados NO deben mostrar tracking general
  }
  
  // Solo mostrar tracking general para pedidos NO entregados
  return order.shipday_driver_id || 
         order.shipday_order_id ||
         ['processing', 'shipped'].includes(order.status);
}

function hasProofOfDelivery(order) {
  // Solo verificar pruebas si el pedido está entregado
  if (order.status !== 'delivered') {
    return false;
  }
  
  return order.proof_of_delivery?.photo_url || 
         order.proof_of_delivery?.signature_url ||
         order.podUrls?.length > 0 ||
         order.signatureUrl ||
         order.shipday_order_id; // Si está en Shipday y entregado, asumimos que puede tener pruebas
}

function openLiveTracking(order) {
  if (order.shipday_tracking_url) {
    window.open(order.shipday_tracking_url, '_blank');
    console.log('📍 Abriendo tracking en vivo:', order.order_number);
  }
}

function openTrackingModal(order) {
  selectedTrackingOrder.value = order;
  showTrackingModal.value = true;
  console.log('🚚 Abriendo modal de tracking:', order.order_number);
}

function showProofOfDelivery(order) {
  selectedProofOrder.value = order;
  showProofModal.value = true;
  console.log('📸 Mostrando prueba de entrega:', order.order_number);
}

async function openOrderDetailsModal(order) {
  selectedOrder.value = null;
  showOrderDetailsModal.value = true;
  loadingOrderDetails.value = true;
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

function contactSupport(order) {
  supportOrder.value = order;
  showSupportModal.value = true;
}

function handleTrackingSupport(supportData) {
  showTrackingModal.value = false;
  supportOrder.value = {
    _id: supportData.orderId,
    order_number: supportData.orderNumber,
    customer_name: supportData.customerName,
    status: selectedTrackingOrder.value?.status || 'unknown'
  };
  showSupportModal.value = true;
}

function handleShowProof(proofData) {
  // Cerrar el modal de tracking
  showTrackingModal.value = false;
  
  // Abrir el modal de prueba de entrega
  selectedProofOrder.value = proofData.order;
  showProofModal.value = true;
}

// Funciones de soporte
function emailSupport(order) {
  const subject = `Consulta sobre Pedido #${order.order_number}`;
  const body = `Hola,\n\nTengo una consulta sobre mi pedido #${order.order_number}.\n\nDetalles:\n- Cliente: ${order.customer_name}\n- Estado: ${getStatusName(order.status)}\n\nMi consulta es:\n\n[Describe tu consulta aquí]\n\nGracias.`;
  window.location.href = `mailto:soporte@tuempresa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  showSupportModal.value = false;
}

function whatsappSupport(order) {
  const message = `Hola, tengo una consulta sobre mi pedido #${order.order_number}. Estado: ${getStatusName(order.status)}`;
  const whatsappNumber = '56912345678';
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  showSupportModal.value = false;
}

function callSupport(order) {
  const phoneNumber = '+56912345678';
  window.location.href = `tel:${phoneNumber}`;
  showSupportModal.value = false;
}

// Funciones utilitarias
function getOrdersByStatus(status) {
  return orders.value.filter(order => order.status === status);
}

function getRowClass(order) {
  const classes = [];
  if (order.status === 'delivered') classes.push('delivered-row');
  if (order.status === 'shipped') classes.push('shipped-row');
  if (order.shipday_tracking_url) classes.push('live-tracking-row');
  return classes.join(' ');
}

function truncateAddress(address) {
  if (!address) return 'Sin dirección';
  return address.length > 30 ? address.substring(0, 30) + '...' : address;
}

function getChannelIcon(channelType) {
  const icons = {
    shopify: '🛍️',
    woocommerce: '🏪',
    mercadolibre: '🛒',
    manual: '📝'
  };
  return icons[channelType] || '🏬';
}

function getStatusIcon(status) {
  const icons = {
    pending: '⏳',
    processing: '⚙️',
    shipped: '🚚',
    delivered: '✅',
    cancelled: '❌'
  };
  return icons[status] || '📦';
}

function getStatusName(status) {
  const names = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'En Tránsito',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  };
  return names[status] || status;
}

function canContactSupport(order) {
  if (order.status === 'delivered') {
    const deliveryDate = new Date(order.delivery_date);
    const now = new Date();
    const daysDiff = (now - deliveryDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }
  return ['pending', 'processing', 'shipped'].includes(order.status);
}

// Funciones de navegación
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
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: '2-digit'
  });
}
</script>

<style scoped>
.actions-header {
  margin-bottom: 1rem;
}
.btn-manifest {
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-manifest:hover {
  background-color: #2563eb;
}
.btn-manifest:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
.col-checkbox {
  width: 3%;
}

.action-btn.ready {
  background-color: #dcfce7; /* Verde claro */
  color: #166534; /* Verde oscuro */
}
.action-btn.ready:hover {
  background-color: #bbf7d0;
}

.orders-page {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 12px 20px;
  border-radius: 12px;
  text-align: center;
  min-width: 80px;
}

.stat-number {
  display: block;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 11px;
  opacity: 0.9;
}

/* Filtros */
.filters-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  align-items: center;
}

.filter-select,
.filter-input,
.search-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.search-input {
  grid-column: span 2;
}

/* Estados de carga */
.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Tabla */
.orders-table-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-container {
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.orders-table th {
  background: #f8fafc;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  white-space: nowrap;
}

.orders-table td {
  padding: 12px 8px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.order-row:hover {
  background-color: #f9fafb;
}

.order-row.delivered-row {
  background-color: #f0fdf4;
}

.order-row.shipped-row {
  background-color: #eff6ff;
}

.order-row.live-tracking-row {
  border-left: 3px solid #f59e0b;
}

/* Columnas específicas */
.col-order { width: 120px; }
.col-customer { width: 180px; }
.col-address { width: 200px; }
.col-status { width: 140px; }
.col-tracking { width: 140px; }
.col-amount { width: 100px; }
.col-date { width: 100px; }
.col-actions { width: 120px; }

/* Celdas */
.order-number-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.order-number {
  font-weight: 600;
  color: #1f2937;
}

.channel-badge {
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  background: #f3f4f6;
}

.customer-cell .customer-name {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}

.customer-contact {
  font-size: 11px;
  color: #6b7280;
}

.address-cell .address-text {
  color: #374151;
  margin-bottom: 4px;
  line-height: 1.3;
}

.commune-tag {
  font-size: 11px;
  color: #0369a1;
  background: #e0f2fe;
  padding: 2px 6px;
  border-radius: 10px;
  display: inline-block;
}

.status-cell {
  text-align: center;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  display: inline-block;
  margin-bottom: 4px;
}

.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.processing { background: #dbeafe; color: #1e40af; }
.status-badge.shipped { background: #e9d5ff; color: #6b21a8; }
.status-badge.delivered { background: #d1fae5; color: #065f46; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }

.driver-info {
  font-size: 10px;
  color: #6b7280;
}

/* Tracking cell */
.tracking-cell {
  text-align: center;
}

.tracking-live {
  margin-bottom: 4px;
}

.live-indicator {
  display: block;
  font-size: 10px;
  color: #dc2626;
  font-weight: 600;
  margin-bottom: 4px;
  animation: pulse 2s infinite;
}

.track-live-btn,
.proof-btn,
.tracking-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 500;
}

.track-live-btn {
  background: #f59e0b;
  color: white;
}

.proof-btn {
  background: #10b981;
  color: white;
}

.tracking-btn {
  background: #6366f1;
  color: white;
}

.proof-indicator,
.tracking-indicator {
  display: block;
  font-size: 10px;
  color: #6b7280;
  margin-bottom: 4px;
}

.no-tracking-text {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
}

.amount-cell {
  text-align: right;
}

.amount {
  font-weight: 600;
  color: #059669;
}

.date-cell {
  font-size: 12px;
}

.order-date {
  color: #374151;
  margin-bottom: 2px;
}

.delivery-date {
  color: #059669;
  font-size: 10px;
}

/* Acciones */
.actions-cell {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn.details {
  background: #f3f4f6;
  color: #374151;
}

.action-btn.tracking {
  background: #dbeafe;
  color: #1e40af;
}

.action-btn.tracking.live {
  background: #fed7aa;
  color: #9a3412;
  animation: pulse 2s infinite;
}

.action-btn.proof {
  background: #d1fae5;
  color: #065f46;
}

.action-btn.support {
  background: #fef3c7;
  color: #92400e;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Paginación */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
}

.page-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: #5b21b6;
}

.page-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  color: #9ca3af;
}

.page-info {
  color: #6b7280;
  font-size: 14px;
}

/* Modal de soporte */
.support-form {
  padding: 20px;
}

.support-order-info {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
}

.support-order-info h4 {
  margin: 0 0 8px 0;
  color: #1f2937;
}

.support-order-info p {
  margin: 4px 0;
  color: #6b7280;
  font-size: 14px;
}

.support-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.support-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.support-option:hover {
  border-color: #6366f1;
  background: #f8fafc;
  transform: translateY(-1px);
}

/* Responsive */
@media (max-width: 1200px) {
  .col-address { width: 150px; }
  .col-customer { width: 150px; }
}

@media (max-width: 768px) {
  .orders-page {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-stats {
    width: 100%;
    justify-content: space-between;
  }
  
  .filters-row {
    grid-template-columns: 1fr;
  }
  
  .search-input {
    grid-column: span 1;
  }
  
  .orders-table {
    font-size: 12px;
  }
  
  .orders-table th,
  .orders-table td {
    padding: 8px 4px;
  }
  
  .col-address,
  .col-customer {
    display: none;
  }
  
  .actions-cell {
    flex-direction: column;
    gap: 2px;
  }
  
  .action-btn {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 22px;
  }
  
  .stat-item {
    padding: 8px 12px;
  }
  
  .stat-number {
    font-size: 16px;
  }
  
  .col-tracking,
  .col-date {
    display: none;
  }
}
</style>