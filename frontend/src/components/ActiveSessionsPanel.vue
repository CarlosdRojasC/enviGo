<template>
  <div class="sessions-panel">
    <!-- Header con estadísticas -->
    <div class="sessions-header">
      <div class="header-content">
        <h2 class="section-title">🔒 Sesiones Activas</h2>
        <p class="section-subtitle">Monitorea y gestiona las sesiones de usuarios conectados</p>
      </div>
      
      <div class="header-actions">
        <button 
          @click="refreshSessions" 
          :disabled="loading"
          class="action-btn refresh"
        >
          <span class="icon">🔄</span>
          Actualizar
        </button>
        
        <button 
          @click="showTerminateAllModal = true" 
          :disabled="loading || sessions.length === 0"
          class="action-btn danger"
        >
          <span class="icon">🚨</span>
          Cerrar Todas
        </button>
      </div>
    </div>

    <!-- Estadísticas -->
    <div class="stats-grid" v-if="stats">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.active_last_hour }}</div>
          <div class="stat-label">Última Hora</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.active_last_day }}</div>
          <div class="stat-label">Último Día</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">👨‍💼</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.admins }}</div>
          <div class="stat-label">Administradores</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🏢</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.company_owners + stats.employees }}</div>
          <div class="stat-label">Usuarios Empresa</div>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nombre, email o empresa..."
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
      
      <select v-model="roleFilter" class="filter-select">
        <option value="">Todos los roles</option>
        <option value="admin">Administradores</option>
        <option value="company_owner">Dueños de Empresa</option>
        <option value="company_employee">Empleados</option>
      </select>
    </div>

    <!-- Lista de sesiones -->
    <div class="sessions-list">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <p>Cargando sesiones activas...</p>
      </div>

      <div v-else-if="filteredSessions.length === 0" class="empty-state">
        <div class="empty-icon">👤</div>
        <h3>No hay sesiones activas</h3>
        <p>No se encontraron sesiones que coincidan con los filtros</p>
      </div>

      <div v-else class="sessions-grid">
        <div 
          v-for="session in filteredSessions" 
          :key="session.id"
          class="session-card"
          :class="{ 'current-session': session.is_current }"
        >
          <!-- Header de la sesión -->
          <div class="session-header">
            <div class="user-info">
              <div class="user-avatar">
                {{ session.user_name?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              <div class="user-details">
                <h3 class="user-name">{{ session.user_name }}</h3>
                <p class="user-email">{{ session.user_email }}</p>
                <span class="role-badge" :class="session.role">
                  {{ formatRole(session.role) }}
                </span>
              </div>
            </div>
            
            <div class="session-status">
              <span class="status-indicator online"></span>
              <span class="status-text">En línea</span>
            </div>
          </div>

          <!-- Información de la sesión -->
          <div class="session-info">
            <div class="info-row">
              <span class="info-icon">🏢</span>
              <span class="info-text">{{ session.company_name }}</span>
            </div>
            
            <div class="info-row">
              <span class="info-icon">{{ session.device }}</span>
              <span class="info-text">{{ formatDevice(session.device) }}</span>
            </div>
            
            <div class="info-row">
              <span class="info-icon">📍</span>
              <span class="info-text">{{ session.location }}</span>
            </div>
            
            <div class="info-row">
              <span class="info-icon">🌐</span>
              <span class="info-text">{{ session.ip_address }}</span>
            </div>
            
            <div class="info-row">
              <span class="info-icon">⏰</span>
              <span class="info-text">
                Activo: {{ session.session_duration }}
              </span>
            </div>
            
            <div class="info-row">
              <span class="info-icon">🕐</span>
              <span class="info-text">
                Último acceso: {{ formatTime(session.last_activity) }}
              </span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="session-actions">
            <button
              v-if="!session.is_current"
              @click="terminateSession(session)"
              :disabled="terminating.includes(session.id)"
              class="terminate-btn"
            >
              <span v-if="terminating.includes(session.id)">⏳</span>
              <span v-else>🚪</span>
              {{ terminating.includes(session.id) ? 'Cerrando...' : 'Cerrar Sesión' }}
            </button>
            
            <span v-else class="current-session-label">
              📱 Tu sesión actual
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para cerrar todas las sesiones -->
    <div v-if="showTerminateAllModal" class="modal-overlay" @click="showTerminateAllModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>🚨 Cerrar Todas las Sesiones</h3>
        </div>
        
        <div class="modal-body">
          <p>
            <strong>¿Estás seguro de que quieres cerrar TODAS las sesiones activas?</strong>
          </p>
          <p>
            Esto desconectará a {{ sessions.filter(s => !s.is_current).length }} usuarios 
            y tendrán que iniciar sesión nuevamente.
          </p>
          <div class="warning-box">
            ⚠️ Esta acción no se puede deshacer y solo debe usarse en emergencias
          </div>
        </div>
        
        <div class="modal-actions">
          <button 
            @click="showTerminateAllModal = false"
            class="modal-btn cancel"
          >
            Cancelar
          </button>
          <button 
            @click="terminateAllSessions"
            :disabled="terminatingAll"
            class="modal-btn confirm"
          >
            {{ terminatingAll ? 'Cerrando...' : 'Sí, Cerrar Todas' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import apiService from '../services/api'

// Para el toast, usa tu sistema existente o crea uno simple
const showToast = (message, type = 'success') => {
  console.log(`${type.toUpperCase()}: ${message}`)
  // Aquí puedes integrar con tu sistema de toast existente
}

// Estado reactivo
const sessions = ref([])
const stats = ref(null)
const loading = ref(false)
const terminating = ref([])
const terminatingAll = ref(false)
const showTerminateAllModal = ref(false)
const searchQuery = ref('')
const roleFilter = ref('')

// Auto-refresh
let refreshInterval = null

// Computed
const filteredSessions = computed(() => {
  let filtered = sessions.value

  // Filtrar por búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(session =>
      session.user_name?.toLowerCase().includes(query) ||
      session.user_email?.toLowerCase().includes(query) ||
      session.company_name?.toLowerCase().includes(query)
    )
  }

  // Filtrar por rol
  if (roleFilter.value) {
    filtered = filtered.filter(session => session.role === roleFilter.value)
  }

  return filtered
})

// Métodos
const loadSessions = async () => {
  try {
    loading.value = true
    const [sessionsResponse, statsResponse] = await Promise.all([
      apiService.auth.getActiveSessions(),
      apiService.auth.getSessionStats()
    ])
    
    sessions.value = sessionsResponse.data.sessions
    stats.value = statsResponse.data
  } catch (error) {
    console.error('Error cargando sesiones:', error)
    showToast('Error al cargar las sesiones activas', 'error')
  } finally {
    loading.value = false
  }
}

const refreshSessions = async () => {
  await loadSessions()
  showToast('Sesiones actualizadas')
}

const terminateSession = async (session) => {
  if (!confirm(`¿Cerrar la sesión de ${session.user_name}?`)) return

  try {
    terminating.value.push(session.id)
    
    await apiService.auth.terminateSession(session.id)
    
    // Remover de la lista
    sessions.value = sessions.value.filter(s => s.id !== session.id)
    
    showToast(`Sesión de ${session.user_name} cerrada exitosamente`)
    
  } catch (error) {
    console.error('Error terminando sesión:', error)
    showToast('Error al cerrar la sesión', 'error')
  } finally {
    terminating.value = terminating.value.filter(id => id !== session.id)
  }
}

const terminateAllSessions = async () => {
  try {
    terminatingAll.value = true
    
    const response = await apiService.auth.terminateAllSessions()
    
    // Mantener solo la sesión actual
    sessions.value = sessions.value.filter(s => s.is_current)
    
    showTerminateAllModal.value = false
    showToast(`${response.data.affected_count} sesiones cerradas exitosamente`)
    
  } catch (error) {
    console.error('Error terminando todas las sesiones:', error)
    showToast('Error al cerrar todas las sesiones', 'error')
  } finally {
    terminatingAll.value = false
  }
}

// Utilidades de formato
const formatRole = (role) => {
  const roles = {
    admin: 'Administrador',
    company_owner: 'Dueño Empresa',
    company_employee: 'Empleado'
  }
  return roles[role] || role
}

const formatDevice = (device) => {
  return device.replace(/🖥️|📱/, '').trim()
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'Desconocido'
  
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return 'Ahora mismo'
  if (diffMins < 60) return `Hace ${diffMins} minutos`
  if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} horas`
  
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadSessions()
  
  // Auto-refresh cada 30 segundos
  refreshInterval = setInterval(loadSessions, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
/* Todos los estilos del panel aquí */
.sessions-panel {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: #f8fafc;
  min-height: 100vh;
}

.sessions-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
}

.header-content h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
}

.header-content p {
  margin: 0;
  opacity: 0.9;
  font-size: 1rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.refresh {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.action-btn.refresh:hover {
  background: rgba(255, 255, 255, 0.3);
}

.action-btn.danger {
  background: #ef4444;
  color: white;
}

.action-btn.danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 197, 63, 0.1);
}

.stat-icon {
  font-size: 2rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
  border-radius: 12px;
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Continúa con el resto de estilos... */
.filters-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #8BC53F;
  box-shadow: 0 0 0 3px rgba(139, 197, 63, 0.1);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 0.875rem;
  min-width: 180px;
}

.filter-select:focus {
  outline: none;
  border-color: #8BC53F;
}

.sessions-list {
  margin-top: 1rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.loading-spinner {
  font-size: 2rem;
  margin-bottom: 1rem;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state .empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.session-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.session-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.session-card.current-session {
  border-color: #8BC53F;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.user-info {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
}

.user-details {
  flex: 1;
}

.user-name {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.user-email {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-badge.admin {
  background: #ef4444;
  color: white;
}

.role-badge.company_owner {
  background: #8BC53F;
  color: white;
}

.role-badge.company_employee {
  background: #3b82f6;
  color: white;
}

.session-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.online {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
}

.status-text {
  font-size: 0.75rem;
  color: #10b981;
  font-weight: 600;
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.info-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.info-text {
  color: #4b5563;
  flex: 1;
}

.session-actions {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.terminate-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.terminate-btn:hover {
  background: #dc2626;
}

.terminate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-session-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f0f9ff;
  color: #0369a1;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 0;
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  padding: 1.5rem 1.5rem 0 1.5rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0 0 1rem 0;
  color: #4b5563;
}

.warning-box {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 1rem;
  color: #92400e;
  font-size: 0.875rem;
  margin-top: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  padding: 0 1.5rem 1.5rem 1.5rem;
  justify-content: flex-end;
}

.modal-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-btn.cancel {
  background: #f3f4f6;
  color: #374151;
}

.modal-btn.cancel:hover {
  background: #e5e7eb;
}

.modal-btn.confirm {
  background: #ef4444;
  color: white;
}

.modal-btn.confirm:hover {
  background: #dc2626;
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .sessions-panel {
    padding: 1rem;
  }
  
  .sessions-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-actions {
    align-self: stretch;
  }
  
  .action-btn {
    flex: 1;
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .sessions-grid {
    grid-template-columns: 1fr;
  }
  
  .session-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .session-status {
    align-self: flex-start;
  }
}
</style>