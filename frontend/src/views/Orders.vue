// ==================== ARCHIVO: frontend/src/views/Orders.vue ====================

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Mis Pedidos</h1>
      <div class="header-stats">
        <div class="stat-card">
          <span class="stat-number">{{ orders.length }}</span>
          <span class="stat-label">Pedidos</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ getOrdersByStatus('delivered').length }}</span>
          <span class="stat-label">Entregados</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ getOrdersByStatus('shipped').length }}</span>
          <span class="stat-label">En Tránsito</span>
        </div>
      </div>
    </div>
    
    <div class="filters-section">
      <div class="filters">
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
        
        <input 
          type="date" 
          v-model="filters.date_from" 
          @change="fetchOrders" 
          class="filter-input"
          placeholder="Fecha desde"
        />
        <input 
          type="date" 
          v-model="filters.date_to" 
          @change="fetchOrders" 
          class="filter-input"
          placeholder="Fecha hasta"
        />
        
        <input 
          type="text" 
          v-model="filters.search" 
          @input="debounceSearch"
          placeholder="🔍 Buscar por cliente, email o #pedido"
          class="search-input"
        />
      </div>
    </div>

    <div class="orders-section">
      <div v-if="loadingOrders" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando tus pedidos...</p>
      </div>
      
      <div v-else-if="orders.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No hay pedidos</h3>
        <p>No se encontraron pedidos con los filtros actuales.</p>
      </div>
      
      <div v-else class="orders-grid">
        <div v-for="order in orders" :key="order._id" class="order-card" :class="getOrderCardClass(order)">
          
          <!-- Header de la tarjeta -->
          <div class="order-header">
            <div class="order-number-section">
              <h3 class="order-number">#{{ order.order_number }}</h3>
              <span class="order-date">{{ formatDate(order.order_date) }}</span>
            </div>
            <div class="order-status-section">
              <span class="status-badge" :class="order.status">
                {{ getStatusIcon(order.status) }} {{ getStatusName(order.status) }}
              </span>
            </div>
          </div>

          <!-- Información del cliente -->
          <div class="order-customer">
            <div class="customer-avatar">{{ getCustomerInitials(order.customer_name) }}</div>
            <div class="customer-info">
              <div class="customer-name">{{ order.customer_name }}</div>
              <div class="customer-contact">
                <span v-if="order.customer_email" class="customer-email">
                  📧 {{ order.customer_email }}
                </span>
                <span v-if="order.customer_phone" class="customer-phone">
                  📱 {{ order.customer_phone }}
                </span>
              </div>
            </div>
          </div>

          <!-- Dirección de entrega con comuna destacada -->
          <div class="order-delivery">
            <div class="delivery-icon">🏠</div>
            <div class="delivery-details">
              <div class="delivery-address">{{ order.shipping_address }}</div>
              <div class="delivery-location">
                <span class="commune-tag">{{ order.shipping_commune || 'Sin comuna' }}</span>
                <span class="region">{{ order.shipping_state || 'RM' }}</span>
              </div>
            </div>
          </div>

          <!-- NUEVO: Sección de tracking si está disponible -->
          <div v-if="hasTrackingInfo(order)" class="order-tracking">
            <div class="tracking-header">
              <span class="tracking-icon">🚚</span>
              <span class="tracking-title">Estado de Entrega</span>
              <span v-if="order.shipday_tracking_url" class="live-indicator">
                📡 En Vivo
              </span>
            </div>
            
            <!-- Quick tracking info -->
            <div class="tracking-quick-info">
              <div v-if="order.shipday_driver_id" class="tracking-item">
                <span class="tracking-label">👨‍💼 Conductor:</span>
                <span class="tracking-value">{{ getDriverDisplayName(order) }}</span>
              </div>
              
              <div v-if="order.status === 'shipped'" class="tracking-item">
                <span class="tracking-label">🚚 Estado:</span>
                <span class="tracking-value in-transit">En camino a tu dirección</span>
              </div>
              
              <div v-if="order.delivery_date" class="tracking-item">
                <span class="tracking-label">✅ Entregado:</span>
                <span class="tracking-value delivered">{{ formatDeliveryTime(order.delivery_date) }}</span>
              </div>
              
              <div v-if="order.status === 'processing'" class="tracking-item">
                <span class="tracking-label">⚙️ Estado:</span>
                <span class="tracking-value processing">Preparando tu pedido</span>
              </div>
            </div>
            
            <!-- Call to action para tracking -->
            <div v-if="order.shipday_tracking_url" class="tracking-cta">
              <button @click="openTrackingModal(order)" class="quick-track-btn">
                📍 Ver en Mapa en Tiempo Real
              </button>
            </div>
          </div>

          <!-- Canal de venta y monto -->
          <div class="order-details">
            <div class="channel-info">
              <span v-if="order.channel_id" class="channel-badge" :class="order.channel_id.channel_type">
                {{ getChannelIcon(order.channel_id.channel_type) }} {{ order.channel_id.channel_name }}
              </span>
            </div>
            <div class="order-amount">
              <span class="amount-label">Total:</span>
              <span class="amount-value">${{ formatCurrency(order.total_amount || order.shipping_cost) }}</span>
            </div>
          </div>

          <!-- Notas si existen -->
          <div v-if="order.notes" class="order-notes">
            <div class="notes-icon">📝</div>
            <div class="notes-text">{{ order.notes }}</div>
          </div>

          <!-- Acciones -->
          <div class="order-actions">
            <button @click="openOrderDetailsModal(order)" class="action-btn primary">
              👁️ Ver Detalles
            </button>
            <button 
              v-if="hasTrackingInfo(order)" 
              @click="openTrackingModal(order)"
              class="action-btn tracking"
              :class="{ 'live-tracking': order.shipday_tracking_url }">
              🚚 {{ order.shipday_tracking_url ? 'Rastrear Live' : 'Seguimiento' }}
            </button>
            <button 
              v-if="canContactSupport(order)" 
              @click="contactSupport(order)"
              class="action-btn support">
              💬 Soporte
            </button>
          </div>
        </div>
      </div>
      
      <!-- Paginación mejorada -->
      <div v-if="pagination.totalPages > 1" class="pagination">
        <button 
          @click="goToPage(pagination.page - 1)" 
          :disabled="pagination.page <= 1" 
          class="page-btn">
          ← Anterior
        </button>
        
        <div class="page-numbers">
          <button 
            v-for="page in getVisiblePages()" 
            :key="page"
            @click="goToPage(page)"
            :class="['page-number', { active: page === pagination.page }]">
            {{ page }}
          </button>
        </div>
        
        <button 
          @click="goToPage(pagination.page + 1)" 
          :disabled="pagination.page >= pagination.totalPages" 
          class="page-btn">
          Siguiente →
        </button>
      </div>
    </div>

    <!-- Modal de detalles mejorado -->
    <Modal v-model="showOrderDetailsModal" :title="`Pedido #${selectedOrder?.order_number}`" width="800px">
      <OrderDetails v-if="selectedOrder" :order="selectedOrder" />
    </Modal>

    <!-- NUEVO: Modal de tracking -->
    <Modal v-model="showTrackingModal" :title="`🚚 Tracking - Pedido #${selectedTrackingOrder?.order_number}`" width="900px">
      <OrderTracking 
        v-if="selectedTrackingOrder" 
        :orderId="selectedTrackingOrder._id" 
        :orderNumber="selectedTrackingOrder.order_number"
        @support-contact="handleTrackingSupport" 
      />
    </Modal>

    <!-- Modal de soporte (existente) -->
    <Modal v-model="showSupportModal" title="Contactar Soporte" width="500px">
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
import { useAuthStore } from '../store/auth';
import { apiService } from '../services/api';
import Modal from '../components/Modal.vue';
import OrderDetails from '../components/OrderDetails.vue';
import OrderTracking from '../components/OrderTracking.vue'; // 🆕 NUEVO

const auth = useAuthStore();
const user = computed(() => auth.user);

// Estado existente
const orders = ref([]);
const channels = ref([]);
const pagination = ref({ page: 1, limit: 12, total: 0, totalPages: 1 });
const filters = ref({ status: '', channel_id: '', date_from: '', date_to: '', search: '' });
const loadingOrders = ref(true);
const selectedOrder = ref(null);
const showOrderDetailsModal = ref(false);

// NUEVO: Estado para tracking
const showTrackingModal = ref(false);
const selectedTrackingOrder = ref(null);

// Estado para soporte (existente)
const showSupportModal = ref(false);
const supportOrder = ref(null);

onMounted(() => {
  fetchOrders();
  fetchChannels();
});

// Funciones existentes mejoradas
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
    // TODO: Mostrar notificación de error más elegante
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
  showOrderDetailsModal.value = true;
  try {
    const { data } = await apiService.orders.getById(order._id);
    selectedOrder.value = data;
  } catch (error) {
    console.error("Error al obtener detalles del pedido:", error);
    showOrderDetailsModal.value = false;
  }
}

// NUEVAS funciones para tracking y UI mejorada
function hasTrackingInfo(order) {
  return order.shipday_tracking_url || order.shipday_driver_id || order.delivery_date || 
         ['processing', 'shipped', 'delivered'].includes(order.status);
}

// 🆕 NUEVA: Abrir modal de tracking
function openTrackingModal(order) {
  selectedTrackingOrder.value = order;
  showTrackingModal.value = true;
  console.log('🚚 Abriendo tracking para pedido:', order.order_number);
}

// 🆕 NUEVA: Manejar soporte desde tracking
function handleTrackingSupport(supportData) {
  console.log('💬 Solicitud de soporte desde tracking:', supportData);
  
  // Cerrar modal de tracking
  showTrackingModal.value = false;
  
  // Abrir modal de soporte con los datos
  supportOrder.value = {
    _id: supportData.orderId,
    order_number: supportData.orderNumber,
    customer_name: supportData.customerName,
    status: selectedTrackingOrder.value?.status || 'unknown'
  };
  showSupportModal.value = true;
}

function trackOrderClick(order) {
  console.log(`🔍 Usuario rastreando pedido: #${order.order_number}`);
  // Aquí puedes agregar analytics si necesitas
}

function openTrackingInNewTab(order) {
  if (order.shipday_tracking_url) {
    window.open(order.shipday_tracking_url, '_blank');
    console.log(`📍 Abriendo tracking para pedido: #${order.order_number}`);
  }
}

function getDriverDisplayName(order) {
  // Si tienes información del conductor, muéstrala; sino, solo el ID
  return order.driver_name || `ID: ${order.shipday_driver_id}`;
}

function getOrderCardClass(order) {
  const classes = ['order-card'];
  if (order.status === 'delivered') classes.push('delivered');
  if (order.status === 'shipped') classes.push('in-transit');
  if (order.status === 'cancelled') classes.push('cancelled');
  if (order.shipday_tracking_url) classes.push('trackable');
  return classes.join(' ');
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

function getChannelIcon(channelType) {
  const icons = {
    shopify: '🛍️',
    woocommerce: '🏪',
    mercadolibre: '🛒',
    manual: '📝'
  };
  return icons[channelType] || '🏬';
}

function getCustomerInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function formatDeliveryTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.abs(now - date) / (1000 * 60 * 60);
  
  if (diffHours < 24) {
    return date.toLocaleString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' (hoy)';
  } else {
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function getOrdersByStatus(status) {
  return orders.value.filter(order => order.status === status);
}

function getVisiblePages() {
  const current = pagination.value.page;
  const total = pagination.value.totalPages;
  const pages = [];
  
  // Mostrar máximo 5 páginas
  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + 4);
  
  if (end - start < 4) {
    start = Math.max(1, end - 4);
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return pages;
}

// NUEVAS funciones de soporte
function canContactSupport(order) {
  // Mostrar soporte para pedidos que no sean entregados hace más de 7 días
  if (order.status === 'delivered') {
    const deliveryDate = new Date(order.delivery_date);
    const now = new Date();
    const daysDiff = (now - deliveryDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }
  return ['pending', 'processing', 'shipped'].includes(order.status);
}

function contactSupport(order) {
  supportOrder.value = order;
  showSupportModal.value = true;
}

function emailSupport(order) {
  const subject = `Consulta sobre Pedido #${order.order_number}`;
  const body = `Hola,\n\nTengo una consulta sobre mi pedido #${order.order_number}.\n\nDetalles del pedido:\n- Cliente: ${order.customer_name}\n- Estado: ${getStatusName(order.status)}\n- Fecha: ${formatDate(order.order_date)}\n\nMi consulta es:\n\n[Describe tu consulta aquí]\n\nGracias.`;
  
  window.location.href = `mailto:soporte@tuempresa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  showSupportModal.value = false;
}

function whatsappSupport(order) {
  const message = `Hola, tengo una consulta sobre mi pedido #${order.order_number}. Estado: ${getStatusName(order.status)}`;
  const whatsappNumber = '56912345678'; // Tu número de WhatsApp
  
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  showSupportModal.value = false;
}

function callSupport(order) {
  const phoneNumber = '+56912345678'; // Tu número de teléfono
  window.location.href = `tel:${phoneNumber}`;
  showSupportModal.value = false;
}

// Funciones utilitarias existentes
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
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
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
</script>

<style scoped>
/* Estilos base mejorados */
.page-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  text-align: center;
  min-width: 100px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
}

/* Filtros mejorados */
.filters-section {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 30px;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: center;
}

.filter-select,
.filter-input {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  background: white;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.search-input {
  grid-column: span 2;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

/* Estados de carga y vacío */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 16px 0 8px;
  color: #374151;
}

/* Grid de pedidos */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

.order-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
}

.order-card.delivered {
  border-left: 4px solid #10b981;
}

.order-card.in-transit {
  border-left: 4px solid #6366f1;
}

.order-card.trackable::before {
  content: '📍';
  position: absolute;
  top: 12px;
  right: 12px;
  background: #f0f9ff;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
}

/* Header de la tarjeta */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.order-number {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.order-date {
  font-size: 12px;
  color: #6b7280;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.processing { background: #dbeafe; color: #1e40af; }
.status-badge.shipped { background: #e9d5ff; color: #6b21a8; }
.status-badge.delivered { background: #d1fae5; color: #065f46; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }

/* Información del cliente */
.order-customer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
}

.customer-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.customer-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.customer-contact {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-email,
.customer-phone {
  font-size: 12px;
  color: #6b7280;
}

/* Dirección de entrega */
.order-delivery {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 12px;
}

.delivery-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.delivery-address {
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.delivery-location {
  display: flex;
  align-items: center;
  gap: 8px;
}

.commune-tag {
  background: #3b82f6;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.region {
  font-size: 12px;
  color: #6b7280;
}

/* NUEVO: Sección de tracking mejorada */
.order-tracking {
  background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
}

.tracking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  justify-content: space-between;
}

.tracking-icon {
  font-size: 16px;
}

.tracking-title {
  font-weight: 600;
  color: #92400e;
  flex: 1;
}

.live-indicator {
  background: #dc2626;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  animation: pulse 2s infinite;
}

.tracking-quick-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.tracking-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.tracking-label {
  font-weight: 500;
  color: #92400e;
  min-width: 80px;
}

.tracking-value {
  color: #451a03;
  font-weight: 500;
}

.tracking-value.in-transit {
  color: #7c3aed;
  font-weight: 600;
}

.tracking-value.delivered {
  color: #059669;
  font-weight: 600;
}

.tracking-value.processing {
  color: #0ea5e9;
  font-weight: 600;
}

.tracking-cta {
  text-align: center;
}

.quick-track-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
}

.quick-track-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.4);
}

/* Detalles del pedido */
.order-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.channel-badge {
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
}

.channel-badge.shopify { background: #95f3d9; color: #065f46; }
.channel-badge.woocommerce { background: #c7d2fe; color: #312e81; }
.channel-badge.mercadolibre { background: #fed7aa; color: #9a3412; }
.channel-badge.manual { background: #f3f4f6; color: #374151; }

.amount-label {
  font-size: 12px;
  color: #6b7280;
}

.amount-value {
  font-size: 18px;
  font-weight: 700;
  color: #059669;
}

/* Notas del pedido */
.order-notes {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #fffbeb;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.notes-icon {
  font-size: 14px;
  color: #d97706;
  flex-shrink: 0;
}

.notes-text {
  font-size: 13px;
  color: #92400e;
  line-height: 1.4;
}

/* Acciones */
.order-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 100px;
}

.action-btn.primary {
  background: #6366f1;
  color: white;
}

.action-btn.primary:hover {
  background: #5b21b6;
}

.action-btn.tracking {
  background: #f59e0b;
  color: white;
  position: relative;
  overflow: hidden;
}

.action-btn.tracking:hover {
  background: #d97706;
}

.action-btn.tracking.live-tracking {
  background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%);
  animation: trackingPulse 2s infinite;
}

.action-btn.tracking.live-tracking::before {
  content: '📡';
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 8px;
  animation: pulse 1.5s infinite;
}

@keyframes trackingPulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  }
  50% { 
    box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.action-btn.support {
  background: #10b981;
  color: white;
}

.action-btn.support:hover {
  background: #059669;
}

/* Paginación mejorada */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.page-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
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

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-number {
  width: 40px;
  height: 40px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #374151;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-number:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.page-number.active {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
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

.support-option:active {
  transform: translateY(0);
}

/* Responsive */
@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-stats {
    width: 100%;
    justify-content: space-between;
  }
  
  .orders-grid {
    grid-template-columns: 1fr;
  }
  
  .filters {
    grid-template-columns: 1fr;
  }
  
  .search-input {
    grid-column: span 1;
  }
  
  .order-actions {
    flex-direction: column;
  }
  
  .action-btn {
    min-width: auto;
  }
  
  .pagination {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .page-numbers {
    order: 3;
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 24px;
  }
  
  .stat-card {
    padding: 12px 16px;
  }
  
  .stat-number {
    font-size: 20px;
  }
  
  .order-card {
    padding: 16px;
  }
  
  .order-number {
    font-size: 18px;
  }
}
</style>