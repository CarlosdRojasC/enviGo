<template>
  <div class="export-dropdown">
    <button 
      @click="toggleDropdown"
      :disabled="exporting"
      class="export-btn"
      :class="{ 'loading': exporting }"
    >
      <span class="btn-icon">{{ exporting ? '⏳' : '📊' }}</span>
      <span class="btn-text">Exportar</span>
      <span class="dropdown-arrow">▼</span>
    </button>
    
    <div v-if="showDropdown" class="export-menu">
      <button 
        @click="handleExport('dashboard')"
        :disabled="exporting"
        class="export-option"
      >
        <span class="option-icon">📋</span>
        <div class="option-content">
          <div class="option-title">Exportar para Dashboard</div>
          <div class="option-description">
            Excel completo con estado, costos y detalles
          </div>
        </div>
      </button>
      
      <button 
  @click="handleExport('complete')"
  :disabled="exporting"
  class="export-option"
>
  <span class="option-icon">📊</span>
  <div class="option-content">
    <div class="option-title">Exportar Completo</div>
    <div class="option-description">
      Excel detallado con comuna, tracking y toda la información
    </div>
  </div>
</button>
      
      <div class="export-divider"></div>
      
      <div class="export-info">
        <span class="info-icon">ℹ️</span>
        <span class="info-text">
          Se exportarán {{ orderCount }} pedidos con los filtros actuales
        </span>
      </div>
    </div>
    
    <!-- Overlay para cerrar dropdown -->
    <div 
      v-if="showDropdown" 
      @click="closeDropdown"
      class="dropdown-overlay"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../../store/auth'

const props = defineProps({
  exporting: {
    type: Boolean,
    default: false
  },
  orderCount: {
    type: Number,
    default: 0
  },
  filters: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['export'])

const auth = useAuthStore()
const showDropdown = ref(false)

const isAdmin = computed(() => auth.isAdmin)

function toggleDropdown() {
  if (!props.exporting) {
    showDropdown.value = !showDropdown.value
  }
}

function closeDropdown() {
  showDropdown.value = false
}

function handleExport(type) {
  emit('export', { type, filters: props.filters })
  closeDropdown()
}
</script>

<style scoped>
.export-dropdown {
  position: relative;
  display: inline-block;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.3s ease;
  min-width: 120px;
}

.export-btn:hover:not(.loading):not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1e40af);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.export-btn.loading {
  background: linear-gradient(135deg, #6b7280, #4b5563);
}

.dropdown-arrow {
  margin-left: auto;
  font-size: 10px;
  transition: transform 0.2s ease;
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 320px;
  overflow: hidden;
}

.export-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-align: left;
}

.export-option:hover:not(:disabled) {
  background: #f8fafc;
}

.export-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.option-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.option-content {
  flex: 1;
}

.option-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
  font-size: 14px;
}

.option-description {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.3;
}

.export-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 8px 16px;
}

.export-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  color: #6b7280;
  font-size: 12px;
}

.info-icon {
  flex-shrink: 0;
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 999;
}

/* Responsive */
@media (max-width: 768px) {
  .export-menu {
    right: auto;
    left: 0;
    min-width: 280px;
  }
  
  .option-title {
    font-size: 13px;
  }
  
  .option-description {
    font-size: 11px;
  }
}
</style>