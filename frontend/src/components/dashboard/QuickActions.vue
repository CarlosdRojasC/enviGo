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
/* Variables CSS para colores enviGo */
:root {
  --envigo-primary: #8BC53F;
  --envigo-primary-dark: #7AB32E;
  --envigo-secondary: #A4D65E;
  --envigo-accent: #6BA428;
  --envigo-dark: #2C2C2C;
  --envigo-dark-lighter: #3A3A3A;
  --envigo-gradient: linear-gradient(135deg, #8BC53F 0%, #A4D65E 100%);
  --envigo-shadow-green: 0 10px 25px rgba(139, 197, 63, 0.15);
}

.quick-actions {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(139, 197, 63, 0.1);
  height: fit-content;
  position: relative;
  overflow: hidden;
}

.quick-actions::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--envigo-gradient);
}

.section-header {
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--envigo-dark);
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '⚡';
  font-size: 16px;
  opacity: 0.8;
}

.section-subtitle {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-card {
  display: flex;
  align-items: center;
  padding: 18px;
  border: 1px solid rgba(139, 197, 63, 0.15);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  position: relative;
  background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
  overflow: hidden;
}

.action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--envigo-gradient);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.action-card:hover::before {
  transform: scaleY(1);
}

.action-card:hover {
  border-color: var(--envigo-primary);
  background: linear-gradient(135deg, rgba(139, 197, 63, 0.03) 0%, rgba(164, 214, 94, 0.05) 100%);
  box-shadow: var(--envigo-shadow-green);
  transform: translateX(6px) translateY(-2px);
}

.action-icon {
  font-size: 22px;
  margin-right: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, rgba(139, 197, 63, 0.1) 0%, rgba(164, 214, 94, 0.15) 100%);
  border-radius: 10px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.action-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--envigo-gradient);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.action-card:hover .action-icon {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(139, 197, 63, 0.25);
}

.action-card:hover .action-icon::before {
  opacity: 0.1;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-content h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--envigo-dark);
  margin: 0 0 4px 0;
  line-height: 1.3;
  transition: color 0.3s ease;
}

.action-card:hover .action-content h4 {
  color: var(--envigo-primary-dark);
}

.action-content p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
  font-weight: 500;
}

.action-badge {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 10px;
  margin-right: 12px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
  animation: pulse-badge 2s infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.action-arrow {
  color: #9ca3af;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(156, 163, 175, 0.1);
}

.action-card:hover .action-arrow {
  color: var(--envigo-primary);
  background: rgba(139, 197, 63, 0.15);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(139, 197, 63, 0.2);
}

/* Estados activos para router-link */
.action-card.router-link-active {
  border-color: var(--envigo-primary);
  background: linear-gradient(135deg, rgba(139, 197, 63, 0.05) 0%, rgba(164, 214, 94, 0.08) 100%);
}

.action-card.router-link-active::before {
  transform: scaleY(1);
}

.action-card.router-link-active .action-content h4 {
  color: var(--envigo-primary-dark);
}

.action-card.router-link-active .action-arrow {
  color: var(--envigo-primary);
  background: rgba(139, 197, 63, 0.15);
}

/* Animación de entrada */
.action-card {
  animation: slideInLeft 0.4s ease-out;
}

.action-card:nth-child(2) { animation-delay: 0.1s; }
.action-card:nth-child(3) { animation-delay: 0.2s; }
.action-card:nth-child(4) { animation-delay: 0.3s; }
.action-card:nth-child(5) { animation-delay: 0.4s; }

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Focus states para accesibilidad */
.action-card:focus {
  outline: 2px solid var(--envigo-primary);
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .quick-actions {
    padding: 20px;
    border-radius: 12px;
  }
  
  .action-card {
    padding: 16px;
  }
  
  .action-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
    margin-right: 14px;
  }
  
  .action-content h4 {
    font-size: 14px;
  }
  
  .action-content p {
    font-size: 12px;
  }
  
  .action-arrow {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .quick-actions {
    padding: 16px;
  }
  
  .action-card {
    padding: 14px;
  }
  
  .section-title {
    font-size: 16px;
  }
  
  .action-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
    margin-right: 12px;
  }
}

/* Mejoras para modo oscuro si es necesario */
@media (prefers-color-scheme: dark) {
  .quick-actions {
    background: var(--envigo-dark-lighter);
    border-color: rgba(139, 197, 63, 0.2);
  }
  
  .section-title {
    color: white;
  }
  
  .action-card {
    background: linear-gradient(135deg, var(--envigo-dark) 0%, var(--envigo-dark-lighter) 100%);
    border-color: rgba(139, 197, 63, 0.2);
  }
  
  .action-content h4 {
    color: white;
  }
  
  .action-content p {
    color: #9ca3af;
  }
}
</style>