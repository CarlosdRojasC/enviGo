<template>
  <div class="quick-actions">
    <div class="section-header">
      <h3 class="section-title">Acciones Rápidas</h3>
      <div class="section-subtitle" v-if="subtitle">{{ subtitle }}</div>
    </div>
    
    <div class="actions-grid">
      <component
        :is="action.external ? 'a' : 'router-link'"
        v-for="action in filteredActions" 
        :key="action.id"
        :to="action.external ? undefined : action.route"
        :href="action.external ? action.route : undefined"
        :target="action.external ? '_blank' : undefined"
        class="action-card"
        @click="handleActionClick(action)"
      >
        <div class="action-icon">{{ action.icon }}</div>
        <div class="action-content">
          <h4>{{ action.title }}</h4>
          <p>{{ action.description }}</p>
        </div>
        <div class="action-badge" v-if="action.badge">
          {{ action.badge }}
        </div>
        <div class="action-arrow">→</div>
      </component>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../store/auth'

const props = defineProps({
  title: {
    type: String,
    default: 'Acciones Rápidas'
  },
  subtitle: {
    type: String,
    default: ''
  },
  actions: {
    type: Array,
    default: () => []
  },
  showDefaultActions: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['action-click'])

const auth = useAuthStore()

// Acciones por defecto según el rol
const defaultActions = [
  // Acciones para Company Owner/Employee
  {
    id: 'view-orders',
    title: 'Ver Mis Pedidos',
    description: 'Gestionar todos los pedidos',
    icon: '📦',
    route: '/orders',
    roles: ['company_owner', 'company_employee']
  },
  {
    id: 'manage-channels',
    title: 'Mis Canales',
    description: 'Sincronizar y configurar',
    icon: '📡',
    route: '/channels',
    roles: ['company_owner', 'company_employee']
  },
  {
    id: 'export-optiroute',
    title: 'Exportar OptiRoute',
    description: 'Descargar para rutas',
    icon: '🗺️',
    route: '/orders?export=optiroute',
    roles: ['company_owner', 'company_employee'],
    external: false
  },
  
  // Acciones para Admin
  {
    id: 'manage-companies',
    title: 'Gestionar Empresas',
    description: 'Ver y administrar empresas',
    icon: '🏢',
    route: '/admin/companies',
    roles: ['admin']
  },
  {
    id: 'global-orders',
    title: 'Pedidos Globales',
    description: 'Ver todos los pedidos',
    icon: '📊',
    route: '/admin/orders',
    roles: ['admin']
  },
  {
    id: 'system-reports',
    title: 'Reportes del Sistema',
    description: 'Estadísticas generales',
    icon: '📈',
    route: '/admin/reports',
    roles: ['admin']
  }
]

const allActions = computed(() => {
  const actions = props.showDefaultActions 
    ? [...defaultActions, ...props.actions]
    : props.actions
  
  return actions
})

const filteredActions = computed(() => {
  return allActions.value.filter(action => {
    if (!action.roles) return true
    return action.roles.includes(auth.user?.role)
  })
})

const handleActionClick = (action) => {
  emit('action-click', action)
  
  // Tracking o analytics si es necesario
  console.log(`Quick action clicked: ${action.id}`)
}
</script>

<style scoped>
.quick-actions {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  height: fit-content;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.section-subtitle {
  font-size: 14px;
  color: #6b7280;
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  position: relative;
  background: #fafafa;
}

.action-card:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  transform: translateX(4px);
}

.action-icon {
  font-size: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-content h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 2px 0;
  line-height: 1.3;
}

.action-content p {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
  line-height: 1.3;
}

.action-badge {
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 8px;
  margin-right: 8px;
  flex-shrink: 0;
}

.action-arrow {
  color: #9ca3af;
  font-size: 14px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.action-card:hover .action-arrow {
  color: #3b82f6;
  transform: translateX(2px);
}

/* Responsive */
@media (max-width: 768px) {
  .quick-actions {
    padding: 20px;
  }
  
  .action-card {
    padding: 14px;
  }
  
  .action-content h4 {
    font-size: 13px;
  }
  
  .action-content p {
    font-size: 11px;
  }
}
</style>