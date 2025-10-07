<template>
  <div class="max-w-3xl mx-auto p-5 font-sans">
    
    <!-- Header del tracking -->
    <div v-if="tracking" class="flex justify-between items-center mb-8 p-5 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl">
      <div>
        <h2 class="m-0 mb-1 text-2xl">📍 Seguimiento de Pedido</h2>
        <span class="text-base opacity-90 font-medium">#{{ tracking.order_number }}</span>
      </div>
      
      <div>
        <span :class="[
          'px-4 py-2 rounded-full text-sm font-semibold',
          'bg-white/20 backdrop-blur-md'
        ]">
          {{ getStatusIcon(tracking.current_status) }} {{ getStatusName(tracking.current_status) }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loadingTracking" class="text-center py-15 px-5 text-gray-500">
      <div class="w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p class="m-0">Cargando información de seguimiento...</p>
    </div>
    
    <!-- Error State -->
    <div v-else-if="!tracking" class="text-center py-15 px-5 text-gray-500">
      <div class="text-5xl mb-4">⚠️</div>
      <h3 class="m-0 mb-3 text-gray-700 text-xl font-semibold">No se pudo cargar el seguimiento</h3>
      <p class="m-0 mb-4">Inténtalo nuevamente en unos momentos.</p>
      <button @click="fetchTracking" class="bg-indigo-600 text-white border-none px-5 py-2.5 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
        🔄 Reintentar
      </button>
    </div>
    
    <!-- Tracking Content -->
    <div v-else class="space-y-8">
      
      <!-- TRACKING EN VIVO -->
      <div v-if="hasTrackingUrl">
        <div class="relative bg-gradient-to-br from-sky-50 to-blue-100 border-2 border-sky-500 rounded-2xl p-6 text-center overflow-hidden">
          <!-- Shimmer effect -->
          <div class="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-transparent via-sky-500/10 to-transparent animate-[shimmer_3s_infinite]"></div>
          
          <div class="relative z-10">
            <div class="flex items-center justify-center gap-2 mb-3">
              <span class="text-base animate-pulse">🔴</span>
              <h3 class="m-0 text-sky-900 text-xl font-semibold">Seguimiento en Vivo</h3>
            </div>
            <p class="text-sky-700 my-3">Rastrea tu pedido en tiempo real con nuestra tecnología GPS</p>
            
            <a 
              :href="getTrackingUrl" 
              target="_blank" 
              @click="trackLiveClick"
              class="inline-block bg-gradient-to-br from-sky-500 to-sky-600 text-white no-underline px-7 py-3.5 rounded-xl font-semibold text-base transition-all shadow-lg shadow-sky-500/30 hover:from-sky-600 hover:to-sky-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-500/40 active:translate-y-0"
            >
              📍 Ver Ubicación en Tiempo Real
            </a>
          </div>
        </div>
      </div>

      <!-- PRUEBA DE ENTREGA -->
      <div v-if="(tracking.current_status === 'delivered' || tracking.current_status === 'invoiced') && hasProofOfDelivery">
        <div class="mb-4">
          <h3 class="m-0 text-gray-800 text-lg font-semibold">📸 Prueba de Entrega</h3>
        </div>
        <div class="bg-gradient-to-br from-emerald-50 to-green-100 border-2 border-emerald-500 rounded-2xl p-5 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <div class="text-[32px] flex items-center justify-center w-15 h-15 bg-emerald-500/10 rounded-full">✅</div>
            <div>
              <div class="text-lg font-semibold text-emerald-900 mb-1">Entrega Confirmada</div>
              <div class="text-emerald-700 text-sm">
                Tu pedido fue entregado exitosamente {{ formatDate(tracking.delivery_date) }}
              </div>
            </div>
          </div>
          <button 
            @click="showFullProofModal" 
            class="bg-emerald-600 text-white border-none px-5 py-3 rounded-xl cursor-pointer font-semibold text-sm transition-all hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-600/30"
          >
            📋 Ver Prueba Completa
          </button>
        </div>
      </div>

      <!-- INFORMACIÓN DEL CONDUCTOR -->
      <div v-if="hasDriverInfo">
        <div class="mb-4">
          <h3 class="m-0 text-gray-800 text-lg font-semibold">👨‍💼 Tu Conductor</h3>
        </div>
        <div class="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div class="w-15 h-15 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
            {{ getDriverInitials(driverStatus.name) }}
          </div>
          <div class="flex-1">
            <div class="text-lg font-semibold text-gray-800 mb-1">{{ driverStatus.name }}</div>
            <div v-if="driverStatus.phone" class="text-sm text-gray-600 mb-2">📞 {{ driverStatus.phone }}</div>
            <div :class="['flex items-center gap-2 text-sm mb-2', getDriverStatusClass(driverStatus.status)]">
              <div :class="['w-2 h-2 rounded-full flex-shrink-0', getDriverStatusClass(driverStatus.status)]"></div>
              <span>{{ getDriverStatusText(driverStatus.status) }}</span>
              <div v-if="loadingDriverStatus" class="flex items-center ml-2">
                <div class="w-3 h-3 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            </div>
            <div v-if="driverStatus.status === 'offline' && driverStatus.lastSeen" class="text-xs text-gray-400 mb-2">
              Visto por última vez: {{ formatLastSeen(driverStatus.lastSeen) }}
            </div>
            <div class="flex gap-2">
              <button 
                v-if="driverStatus.phone" 
                @click="callDriver" 
                title="Llamar al conductor"
                class="w-8 h-8 border-none rounded-md cursor-pointer flex items-center justify-center text-sm bg-emerald-600 text-white transition-all hover:bg-emerald-700 hover:scale-110"
              >
                📞
              </button>
              <button 
                @click="refreshDriverStatus" 
                :disabled="loadingDriverStatus"
                title="Actualizar estado"
                class="w-8 h-8 border-none rounded-md cursor-pointer flex items-center justify-center text-sm bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔄
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline de eventos -->
      <div>
        <div class="mb-4">
          <h3 class="m-0 text-gray-800 text-lg font-semibold">📋 Historial del Pedido</h3>
        </div>
        <div class="relative pl-8">
          <!-- Línea vertical -->
          <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          <div 
            v-for="(event, index) in tracking.timeline" 
            :key="index"
            class="relative mb-6 last:mb-0"
          >
            <div :class="[
              'absolute -left-5.5 w-8 h-8 rounded-full flex items-center justify-center text-sm',
              event.status === 'completed' ? 'bg-emerald-600 text-white' :
              event.status === 'current' ? 'bg-indigo-600 text-white animate-pulse' :
              event.status === 'cancelled' ? 'bg-red-500 text-white' :
              'bg-gray-100 border-2 border-gray-300 text-gray-600'
            ]">
              <span>{{ event.icon }}</span>
            </div>
            
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div class="font-semibold text-gray-800 mb-1">{{ event.title }}</div>
              <div class="text-gray-600 mb-2 text-sm">{{ event.description }}</div>
              <div v-if="event.timestamp" class="text-xs text-gray-400">
                {{ formatEventTime(event.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Información de entrega -->
      <div>
        <div class="mb-4">
          <h3 class="m-0 text-gray-800 text-lg font-semibold">🏠 Información de Entrega</h3>
        </div>
        
        <div class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-base">📍</span>
              <h4 class="m-0 text-gray-800 text-sm font-semibold">Dirección de Entrega</h4>
            </div>
            <div>
              <div class="text-gray-700 mb-1">{{ tracking.delivery_address }}</div>
              <div v-if="tracking.delivery_location" class="text-xs text-gray-600">
                📍 {{ tracking.delivery_location.formatted_address }}
              </div>
            </div>
          </div>
          
          <div v-if="tracking.pickup_address" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-base">🏪</span>
              <h4 class="m-0 text-gray-800 text-sm font-semibold">Punto de Recogida</h4>
            </div>
            <div>
              <div class="text-gray-700 mb-1">{{ tracking.pickup_address }}</div>
              <div v-if="tracking.company && tracking.company.name" class="text-xs text-gray-600">
                {{ tracking.company.name }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detalles del pedido -->
      <div>
        <div class="mb-4">
          <h3 class="m-0 text-gray-800 text-lg font-semibold">📦 Detalles del Pedido</h3>
        </div>
        
        <div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mb-5">
          <div class="flex justify-between items-center p-3 px-4 bg-white border border-gray-200 rounded-lg">
            <span class="font-medium text-gray-600">Cliente:</span>
            <span class="font-semibold text-gray-800">{{ tracking.customer_name }}</span>
          </div>
          
          <div class="flex justify-between items-center p-3 px-4 bg-white border border-gray-200 rounded-lg">
            <span class="font-medium text-gray-600">Fecha del Pedido:</span>
            <span class="font-semibold text-gray-800">{{ formatDate(tracking.order_date) }}</span>
          </div>
          
          <div v-if="tracking.delivery_date" class="flex justify-between items-center p-3 px-4 bg-white border border-gray-200 rounded-lg">
            <span class="font-medium text-gray-600">Fecha de Entrega:</span>
            <span class="font-semibold text-gray-800">{{ formatDate(tracking.delivery_date) }}</span>
          </div>
          
          <div v-if="tracking.estimated_delivery" class="flex justify-between items-center p-3 px-4 bg-white border border-gray-200 rounded-lg">
            <span class="font-medium text-gray-600">Entrega Estimada:</span>
            <span class="font-semibold text-gray-800">{{ formatDate(tracking.estimated_delivery) }}</span>
          </div>
          
          <div class="flex justify-between items-center p-3 px-4 bg-white border border-gray-200 rounded-lg">
            <span class="font-medium text-gray-600">Total:</span>
            <span class="font-semibold text-emerald-700 text-base">${{ formatCurrency(tracking.total_amount) }}</span>
          </div>
          
          <div class="flex justify-between items-center p-3 px-4 bg-white border border-gray-200 rounded-lg">
            <span class="font-medium text-gray-600">Costo de Envío:</span>
            <span class="font-semibold text-gray-800">${{ formatCurrency(tracking.shipping_cost) }}</span>
          </div>
        </div>
        
        <div v-if="tracking.notes" class="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <span>📝</span>
            <span class="font-semibold text-amber-900">Notas del Pedido</span>
          </div>
          <div class="text-amber-900 leading-relaxed">{{ tracking.notes }}</div>
        </div>
      </div>

      <!-- Soporte -->
      <div>
        <div class="mb-4">
          <h3 class="m-0 text-gray-800 text-lg font-semibold">💬 ¿Necesitas Ayuda?</h3>
        </div>
        
        <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <button 
            @click="contactSupport" 
            class="bg-white border-2 border-gray-200 text-gray-700 px-4 py-3 rounded-lg cursor-pointer font-medium transition-all hover:border-indigo-600 hover:bg-slate-50 hover:-translate-y-px"
          >
            📧 Contactar Soporte
          </button>
          
          <button 
            v-if="tracking.company && tracking.company.phone" 
            @click="callCompany" 
            class="bg-white border-2 border-gray-200 text-gray-700 px-4 py-3 rounded-lg cursor-pointer font-medium transition-all hover:border-indigo-600 hover:bg-slate-50 hover:-translate-y-px"
          >
            📞 Llamar a {{ tracking.company.name }}
          </button>
          
          <button 
            @click="reportIssue" 
            class="bg-white border-2 border-gray-200 text-gray-700 px-4 py-3 rounded-lg cursor-pointer font-medium transition-all hover:border-indigo-600 hover:bg-slate-50 hover:-translate-y-px"
          >
            ⚠️ Reportar Problema
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div class="text-xs text-gray-600">
          Última actualización: {{ formatDate(lastUpdated, true) }}
        </div>
        <button 
          @click="refreshTracking" 
          :disabled="refreshing"
          class="bg-indigo-600 text-white border-none px-4 py-2 rounded-md cursor-pointer text-xs transition-colors hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {{ refreshing ? '🔄' : '🔄' }} {{ refreshing ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { apiService } from '../services/api';

const props = defineProps({
  orderId: { type: String, required: true },
  orderNumber: { type: String, default: '' }
});

const emit = defineEmits(['close', 'support-contact', 'show-proof']);

// Estado del tracking
const tracking = ref(null);
const loadingTracking = ref(true);
const refreshing = ref(false);
const lastUpdated = ref(new Date());

// Estado del conductor - CORREGIDO Y SIMPLIFICADO
const driverStatus = ref({
  name: 'Conductor',
  phone: '',
  status: 'unknown', // online, offline, busy, driving, unknown
  lastSeen: null,
  isConnected: false
});
const loadingDriverStatus = ref(false);

let refreshInterval = null;

/**
 * Extraer ID de Shipday de la URL de tracking y construir URL personalizada
 * ⚡ IDÉNTICA a extractShipdayIdAndBuildUrl del notification.service.js
 */
function extractShipdayIdAndBuildUrl(order) {
  let shipdayTrackingId = null;
  
  // Intentar extraer de shipday_tracking_url (equivalente a webhookData.trackingUrl)
  if (order.shipday_tracking_url) {
    // trackingUrl: "https://dispatch.shipday.com/trackingPage/bHBueG54cHk=&lang=es"
    const match = order.shipday_tracking_url.match(/trackingPage\/([^&?]+)/);
    if (match) {
      shipdayTrackingId = match[1];
      console.log(`🔗 ID extraído de shipday_tracking_url: ${shipdayTrackingId}`);
    }
  }
  
  // Si no se encontró, intentar desde el shipday_order_id (equivalente a webhookData.order?.id)
  if (!shipdayTrackingId && order.shipday_order_id) {
    shipdayTrackingId = order.shipday_order_id;
    console.log(`🔗 Usando shipday_order_id como ID: ${shipdayTrackingId}`);
  }
  
  // Construir URL personalizada CON IDIOMA ESPAÑOL
  if (shipdayTrackingId) {
    return `https://www.ordertracking.io/enviGo/delivery/${shipdayTrackingId}&lang=es`;
  }
  
  // Fallback a tu frontend
  console.warn('⚠️ No se pudo extraer ID de Shipday, usando fallback');
  const frontendUrl = window.location.origin;
  return `${frontendUrl}/tracking/${order.order_number}`;
}

// COMPUTED PROPERTIES PARA TRACKING
const hasTrackingUrl = computed(() => {
  if (!tracking.value) return false;
  
  // Verificar si tenemos datos suficientes para construir la URL
  return !!(
    tracking.value.shipday_tracking_url || 
    tracking.value.shipday_order_id ||
    tracking.value.custom_tracking_url
  );
});

const getTrackingUrl = computed(() => {
  if (!tracking.value) return '';
  
  // Si ya tenemos custom_tracking_url guardada, usarla
  if (tracking.value.shipday_tracking_url) {
    return tracking.value.shipday_tracking_url;
  }
  
  // 🎯 USAR LA MISMA LÓGICA QUE notification.service.js
  return extractShipdayIdAndBuildUrl(tracking.value);
});

const hasProofOfDelivery = computed(() => {
  if (!tracking.value) return false;
  return !!(
    tracking.value.proof_of_delivery?.photo_url || 
    tracking.value.proof_of_delivery?.signature_url ||
    tracking.value.podUrls?.length > 0 ||
    tracking.value.signatureUrl
  );
});

// COMPUTED PROPERTIES PARA EL CONDUCTOR
const hasDriverInfo = computed(() => {
  return !!(driverStatus.value.name && driverStatus.value.name !== 'Conductor');
});
const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutos


onMounted(() => {
  fetchTracking();
  
  // Auto-refresh cada 30 segundos si el pedido está en tránsito
  refreshInterval = setInterval(() => {
  if (tracking.value && ['processing', 'shipped'].includes(tracking.value.current_status)) {
    refreshTracking();
  }
  }, REFRESH_INTERVAL);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

async function fetchTracking() {
  loadingTracking.value = true;
  try {
    console.log('📍 Obteniendo tracking para orden:', props.orderId);
    
    const { data } = await apiService.orders.getTracking(props.orderId);
    
    tracking.value = data.tracking;
    lastUpdated.value = new Date(data.last_updated);
    
    console.log('✅ Tracking cargado:', {
      order_number: tracking.value?.order_number,
      has_tracking_url: hasTrackingUrl.value,
      current_status: tracking.value?.current_status
    });
    
    // CARGAR INFORMACIÓN DEL CONDUCTOR DESPUÉS DEL TRACKING
    if (tracking.value) {
      loadDriverInfo();
    }
  } catch (error) {
    console.error('❌ Error cargando tracking:', error);
    tracking.value = null;
  } finally {
    loadingTracking.value = false;
  }
}

async function refreshTracking() {
  if (refreshing.value) return;
  
  refreshing.value = true;
  try {
    await fetchTracking();
  } finally {
    refreshing.value = false;
  }
}

// FUNCIÓN CORREGIDA PARA CARGAR INFO DEL CONDUCTOR
function loadDriverInfo() {
  // PRIORIDAD DE FUENTES DE DATOS DEL CONDUCTOR
  const driverName = (
    tracking.value?.driver?.name || 
    tracking.value?.driver_info?.name ||
    tracking.value?.carrierName ||
    'Conductor'
  );

  const driverPhone = (
    tracking.value?.driver?.phone || 
    tracking.value?.driver_info?.phone ||
    tracking.value?.carrierPhone ||
    ''
  );

  // DETERMINAR ESTADO BASADO EN LA INFORMACIÓN DISPONIBLE
  let status = 'unknown';
  let isConnected = false;

  // Si hay información específica del estado
  if (tracking.value?.driver?.status) {
    status = tracking.value.driver.status.toLowerCase();
  } else if (tracking.value?.driver_info?.status) {
    status = tracking.value.driver_info.status.toLowerCase();
  } else if (tracking.value?.current_status === 'shipped') {
    // Si el pedido está en tránsito, asumir que el conductor está activo
    status = 'driving';
    isConnected = true;
  } else if (tracking.value?.current_status === 'delivered') {
    status = 'offline';
  }

  // ASIGNAR DATOS AL ESTADO
  driverStatus.value = {
    name: driverName,
    phone: driverPhone,
    status: status,
    lastSeen: tracking.value?.driver?.lastSeen ? new Date(tracking.value.driver.lastSeen) : null,
    isConnected: isConnected || status === 'online' || status === 'driving'
  };

  console.log('👨‍💼 Información del conductor cargada:', driverStatus.value);

  // INTENTAR OBTENER ESTADO EN TIEMPO REAL SI HAY ID
  const driverId = (
    tracking.value?.driver?.id ||
    tracking.value?.driver_info?.id ||
    tracking.value?.shipday_driver_id ||
    tracking.value?.carrierId
  );

  if (driverId) {
    fetchDriverRealTimeStatus(driverId);
  }
}

// FUNCIÓN PARA OBTENER ESTADO EN TIEMPO REAL DEL CONDUCTOR
async function fetchDriverRealTimeStatus(driverId) {
  if (!driverId || loadingDriverStatus.value) return;

  try {
    loadingDriverStatus.value = true;
    console.log('📡 Obteniendo estado en tiempo real del conductor:', driverId);
    
    // VERIFICAR SI EL ENDPOINT EXISTE
    if (!apiService.drivers || typeof apiService.drivers.getStatus !== 'function') {
      console.log('⚠️ Endpoint de estado del conductor no disponible');
      return;
    }
    
    const { data: realTimeData } = await apiService.drivers.getStatus(driverId);
    
    // ACTUALIZAR SOLO SI HAY DATOS VÁLIDOS
    if (realTimeData) {
      driverStatus.value = {
        ...driverStatus.value,
        status: realTimeData.status || driverStatus.value.status,
        phone: realTimeData.phone || driverStatus.value.phone,
        lastSeen: realTimeData.lastSeen ? new Date(realTimeData.lastSeen) : driverStatus.value.lastSeen,
        isConnected: realTimeData.status === 'online' || realTimeData.status === 'driving'
      };
      
      console.log('✅ Estado del conductor actualizado en tiempo real:', driverStatus.value);
    }
    
  } catch (error) {
    console.log('⚠️ No se pudo obtener estado en tiempo real del conductor:', error.message);
    // No mostrar error al usuario, mantener datos existentes
  } finally {
    loadingDriverStatus.value = false;
  }
}

// FUNCIÓN PARA REFRESCAR ESTADO DEL CONDUCTOR
async function refreshDriverStatus() {
  const driverId = (
    tracking.value?.driver?.id ||
    tracking.value?.driver_info?.id ||
    tracking.value?.shipday_driver_id ||
    tracking.value?.carrierId
  );

  if (driverId) {
    await fetchDriverRealTimeStatus(driverId);
  } else {
    // Si no hay ID, recargar desde los datos del tracking
    loadDriverInfo();
  }
}

// FUNCIÓN PARA MOSTRAR MODAL DE PRUEBA COMPLETA
function showFullProofModal() {
  emit('show-proof', {
    orderId: props.orderId,
    orderNumber: tracking.value?.order_number,
    order: tracking.value
  });
}

// FUNCIONES DE UI
function getStatusIcon(status) {
  const icons = {
    pending: '⏳',
    processing: '⚙️',
    shipped: '🚚',
    delivered: '✅',
    out_for_delivery: '📦',
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
    out_for_delivery: 'En Entrega',
    invoiced: 'Facturado',
    cancelled: 'Cancelado'
  };
  return names[status] || status;
}

function getDriverInitials(name) {
  if (!name || name === 'Conductor') return '👤';
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function getDriverStatusText(status) {
  const statusTexts = {
    'online': 'En Línea',
    'offline': 'Desconectado', 
    'busy': 'Ocupado',
    'driving': 'Conduciendo',
    'unknown': 'Estado Desconocido'
  };
  return statusTexts[status] || 'Desconocido';
}

function getDriverStatusClass(status) {
  const statusClasses = {
    'online': 'status-online',
    'offline': 'status-offline',
    'busy': 'status-busy', 
    'driving': 'status-driving',
    'unknown': 'status-unknown'
  };
  return statusClasses[status] || 'status-unknown';
}

function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'Hace tiempo';
  
  const now = new Date();
  const diff = now - lastSeen;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} minutos`;
  if (minutes < 1440) return `hace ${Math.floor(minutes / 60)} horas`;
  return lastSeen.toLocaleDateString();
}

function formatEventTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = Math.abs(now - date) / (1000 * 60 * 60);
  
  if (diffHours < 1) {
    const diffMinutes = Math.round(diffHours * 60);
    return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    const hours = Math.round(diffHours);
    return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function formatDate(dateStr, withTime = false) {
  if (!dateStr) return 'N/A';
  const options = { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  };
  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return new Date(dateStr).toLocaleDateString('es-CL', options);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

// FUNCIONES DE ACCIÓN
function trackLiveClick() {
  console.log('📍 Usuario abriendo tracking en vivo:', getTrackingUrl.value);
}

function callDriver() {
  const phone = driverStatus.value.phone;
  if (phone) {
    window.location.href = `tel:${phone}`;
  }
}

function callCompany() {
  if (tracking.value?.company?.phone) {
    window.location.href = `tel:${tracking.value.company.phone}`;
  }
}

function contactSupport() {
  emit('support-contact', {
    orderId: props.orderId,
    orderNumber: tracking.value?.order_number,
    customerName: tracking.value?.customer_name
  });
}

function reportIssue() {
  const subject = `Problema con Pedido #${tracking.value?.order_number}`;
  const body = `Hola,\n\nTengo un problema con mi pedido #${tracking.value?.order_number}.\n\nDetalles:\n- Estado actual: ${getStatusName(tracking.value?.current_status)}\n- Cliente: ${tracking.value?.customer_name}\n\nDescripción del problema:\n[Describe el problema aquí]\n\nGracias.`;
  
  window.location.href = `mailto:soporte@tuempresa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// FUNCIONES EXPUESTAS PARA USO EXTERNO
function hasTrackingInfo(order) {
  if (order.status === 'delivered') return false;
  return !!(
    order.shipday_tracking_url ||
    order.shipday_driver_id || 
    order.shipday_order_id ||
    ['processing', 'shipped'].includes(order.status)
  );
}

function orderHasProofOfDelivery(order) {
  if (order.status !== 'delivered') return false;
  return !!(
    order.proof_of_delivery?.photo_url || 
    order.proof_of_delivery?.signature_url ||
    order.podUrls?.length > 0 ||
    order.signatureUrl
  );
}

async function openLiveTrackingFromExternal(order, updateCallback) {
  console.log('📍 Abriendo tracking externo para orden:', order.order_number);
  
  // 🎯 USAR LA MISMA LÓGICA QUE notification.service.js
  const trackingUrl = extractShipdayIdAndBuildUrl(order);
  
  if (trackingUrl) {
    console.log('✅ Abriendo tracking URL:', trackingUrl);
    window.open(trackingUrl, '_blank');
    return;
  }
  
  // Si no se pudo construir URL, intentar refrescar datos
  if (order._id) {
    console.log('⚠️ No se pudo construir URL, intentando refrescar datos...');
    try {
      const { data } = await apiService.orders.getById(order._id);
      
      const refreshedUrl = extractShipdayIdAndBuildUrl(data);
      
      if (refreshedUrl) {
        console.log('✅ URL construida después de refresh:', refreshedUrl);
        if (updateCallback) {
          updateCallback(data);
        }
        window.open(refreshedUrl, '_blank');
      } else {
        console.log('⚠️ No se encontró información de tracking después del refresh');
      }
    } catch (error) {
      console.error('❌ Error al refrescar datos de la orden:', error);
    }
  } else {
    console.log('⚠️ No hay información suficiente para construir URL de tracking');
  }
}

function getActionButton(order) {
  if (order.status === 'delivered') {
    return {
      type: 'proof',
      label: 'Ver Prueba de Entrega',
      icon: '📸',
      class: 'btn-success',
      available: orderHasProofOfDelivery(order)
    };
  }
  
  if (['processing', 'shipped'].includes(order.status)) {
    return {
      type: 'tracking',
      label: 'Tracking en Vivo',
      icon: '📍',
      class: 'btn-primary',
      available: hasTrackingInfo(order)
    };
  }
  
  return { type: 'none', available: false };
}

// Exponer funciones al template parent
defineExpose({
  hasTrackingInfo,
  orderHasProofOfDelivery,
  openLiveTrackingFromExternal,
  getActionButton,
  refreshDriverStatus,
  refreshTracking,
  extractShipdayIdAndBuildUrl
});
</script>

<style scoped>
/* Animación shimmer para tracking en vivo */
@keyframes shimmer {
  0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
  100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
}

/* Estados del conductor - solo colores de indicador */
.status-online .w-2 { background: #10b981; }
.status-offline .w-2 { background: #ef4444; }
.status-busy .w-2 { background: #f59e0b; }
.status-driving .w-2 { background: #3b82f6; }
.status-unknown .w-2 { background: #6b7280; }

.status-online { color: #059669; }
.status-offline { color: #dc2626; }
.status-busy { color: #d97706; }
.status-driving { color: #2563eb; }
.status-unknown { color: #6b7280; }

/* Responsive */
@media (max-width: 768px) {
  .max-w-3xl {
    padding: 1rem;
  }
  
  .flex.justify-between.items-center.mb-8 {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .bg-gradient-to-br.from-emerald-50 {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .flex.items-center.gap-4.p-5 {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .grid {
    grid-template-columns: 1fr;
  }
  
  .flex.justify-between.items-center.p-4 {
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }
}
</style>