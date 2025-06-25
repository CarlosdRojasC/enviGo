<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1 class="text-2xl font-bold text-gray-800">Panel del Administrador</h1>
      <button @click="logout" class="logout-btn">Cerrar Sesión</button>
    </div>

    <div class="dashboard-content">
      <section class="content-section">
        <h2 class="section-title">Tiendas conectadas</h2>
        <div v-if="companies.length" class="cards-grid">
          <div v-for="company in companies" :key="company.id" class="company-card">
            <h3 class="company-name">{{ company.name }}</h3>
            <p class="company-email">{{ company.email }}</p>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>No hay tiendas registradas.</p>
        </div>
      </section>

      <section class="content-section export-section">
        <div class="export-header">
          <h2 class="section-title">Exportar Pedidos</h2>
          <button
            @click="handleExport"
            class="export-btn"
          >
            Exportar a Excel
          </button>
        </div>
      </section>

      <section class="content-section">
        <h2 class="section-title">Pedidos globales</h2>
        <div v-if="orders.length" class="orders-table-wrapper">
          <table class="orders-table">
            <thead>
              <tr>
                <th># Pedido</th>
                <th>Tienda</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id" class="order-row">
                <td class="order-number">#{{ order.id }}</td>
                <td>{{ order.company_name }}</td>
                <td>
                  <span class="status-badge" :class="`status-${order.status}`">
                    {{ order.status }}
                  </span>
                </td>
                <td>{{ formatDate(order.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <p>No hay pedidos disponibles.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../store/auth'
import api from '../services/api'
import { useRouter } from 'vue-router'

const router = useRouter()
const companies = ref([])
const orders = ref([])
const auth = useAuthStore()

onMounted(async () => {
  try {
    // Simulando datos para el diseño, ya que no tenemos un backend real.
    // En un caso real, las llamadas a axios permanecerían.
    // const resCompanies = await axios.get('/companies')
    companies.value = [
      { id: 1, name: 'Tienda Ejemplo 1', email: 'contacto@tienda1.com' },
      { id: 2, name: 'Zapatos Veloz', email: 'ventas@zapatosveloz.cl' },
      { id: 3, name: 'TecnoMundo', email: 'info@tecnomundo.dev' },
    ]

    // const resOrders = await axios.get('/orders')
    orders.value = [
      { id: 101, company_name: 'Tienda Ejemplo 1', status: 'pending', created_at: new Date() },
      { id: 102, company_name: 'Zapatos Veloz', status: 'delivered', created_at: new Date() },
      { id: 103, company_name: 'TecnoMundo', status: 'shipped', created_at: new Date() },
      { id: 104, company_name: 'Tienda Ejemplo 1', status: 'cancelled', created_at: new Date() },
    ]
  } catch (err) {
    console.error('Error al cargar datos:', err)
  }
})

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function handleExport() {
  alert('Exportar aún no implementado. Aquí irá la lógica para generar el Excel.')
}
function logout() {
  auth.logout()
  router.push('/')
}
</script>

<style scoped>
/* Estilos generales adaptados de dashboard.vue */
.admin-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: #f3f4f6; /* Fondo gris claro */
}

.dashboard-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* Estilos para las secciones/tarjetas */
.content-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
}

/* Cuadrícula para las tiendas */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.company-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.company-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.company-name {
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 5px 0;
}

.company-email {
  font-size: 14px;
  color: #6b7280;
}

/* Sección de exportación */
.export-section {
  padding: 20px 24px;
}

.export-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.export-header .section-title {
  margin-bottom: 0;
}

.export-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.export-btn:hover {
  background: #059669;
}

/* Estilos de la tabla de pedidos */
.orders-table-wrapper {
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.orders-table th {
  background: #f9fafb;
  padding: 16px;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.orders-table td {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
}

.order-row:hover {
  background: #f9fafb;
}

.order-number {
  font-weight: 500;
  color: #1f2937;
}

/* Estado vacío */
.empty-state {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-style: italic;
  background-color: #f9fafb;
  border-radius: 8px;
}

/* Insignias de estado (status badges) */
.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.status-pending { background: #fef3c7; color: #92400e; }
.status-badge.status-shipped { background: #e9d5ff; color: #6b21a8; }
.status-badge.status-delivered { background: #d1fae5; color: #065f46; }
.status-badge.status-cancelled { background: #fee2e2; color: #991b1b; }
</style>