<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1>Panel del Administrador</h1>
      <div class="user-info">
        <span>{{ auth.user?.full_name }}</span>
        <button @click="logout" class="logout-btn">Cerrar Sesión</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Cargando datos del panel...</p>
    </div>

    <div v-else class="dashboard-content">
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total de Empresas</h3>
          <div class="stat-value">{{ stats.companies || 0 }}</div>
          <div class="stat-change">📈 Activas en el sistema</div>
        </div>
        <div class="stat-card">
          <h3>Total de Pedidos</h3>
          <div class="stat-value">{{ stats.orders?.total_orders || 0 }}</div>
          <div class="stat-change">📦 Histórico</div>
        </div>
        <div class="stat-card">
          <h3>Pedidos Entregados</h3>
          <div class="stat-value">{{ stats.orders?.delivered || 0 }}</div>
          <div class="stat-change">✅ Completados</div>
        </div>
        <div class="stat-card">
          <h3>Ingresos del Mes</h3>
          <div class="stat-value">${{ formatCurrency(stats.monthly_revenue || 0) }}</div>
          <div class="stat-change">💰 Estimado de facturación</div>
        </div>
      </div>
      
      <section class="content-section">
        <h2 class="section-title">Gestión de Tiendas y Usuarios</h2>
        <div v-if="companies.length > 0" class="company-list">
          <div v-for="company in companies" :key="company._id" class="company-list-item">
            <div class="company-list-info">
              <h3 class="company-name">{{ company.name }}</h3>
              <span class="company-details">{{ company.users_count || 0 }} usuarios • {{ company.orders_count || 0 }} pedidos</span>
            </div>
            <button @click="openUsersModal(company)" class="btn-manage">Gestionar Usuarios</button>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>No hay tiendas registradas.</p>
        </div>
      </section>

      <section class="content-section">
        </section>
    </div>

    <Modal v-model="showUsersModal" :title="`Usuarios de ${selectedCompany?.name}`" width="800px">
      <div v-if="loadingUsers" class="loading-state">Cargando usuarios...</div>
      <div v-else>
        <div class="modal-actions-header">
            <button @click="openAddUserModal()" class="btn-add-user">+ Añadir Usuario</button>
        </div>
        <div class="users-table-wrapper">
          <table class="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="users.length === 0">
                  <td colspan="5" class="empty-state-small">No hay usuarios en esta empresa.</td>
              </tr>
              <tr v-else v-for="user in users" :key="user._id">
                <td>{{ user.full_name }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.role }}</td>
                <td>
                  <span class="status-badge" :class="user.is_active ? 'active' : 'inactive'">
                    {{ user.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <button @click="toggleUserStatus(user)" class="btn-toggle-status" :disabled="user.role === 'admin'">
                    {{ user.is_active ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
    
    <Modal v-model="showAddUserForm" :title="`Añadir Usuario a ${selectedCompany?.name}`" width="500px">
        <form @submit.prevent="handleAddNewUser">
            <div class="form-group">
                <label for="new-user-name">Nombre Completo</label>
                <input id="new-user-name" v-model="newUser.full_name" type="text" required>
            </div>
            <div class="form-group">
                <label for="new-user-email">Email</label>
                <input id="new-user-email" v-model="newUser.email" type="email" required>
            </div>
            <div class="form-group">
                <label for="new-user-password">Contraseña</label>
                <input id="new-user-password" v-model="newUser.password" type="password" required>
            </div>
            <div class="form-group">
                <label for="new-user-role">Rol</label>
                <select id="new-user-role" v-model="newUser.role">
                    <option value="company_employee">Empleado</option>
                    <option value="company_owner">Dueño</option>
                </select>
            </div>
            <div class="modal-actions-footer">
                <button type="button" @click="showAddUserForm = false">Cancelar</button>
                <button type="submit" :disabled="isAddingUser">
                    {{ isAddingUser ? 'Añadiendo...' : 'Añadir Usuario' }}
                </button>
            </div>
        </form>
    </Modal>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../store/auth';
import { apiService } from '../services/api';
import { useRouter } from 'vue-router';
import Modal from '../components/Modal.vue'; // Asegúrate de que este componente exista

const router = useRouter();
const auth = useAuthStore();

const companies = ref([]);
const orders = ref([]);
const stats = ref({});
const users = ref([]);
const loading = ref(true);
const loadingUsers = ref(false);

const showUsersModal = ref(false);
const showAddUserForm = ref(false);
const selectedCompany = ref(null);
const isAddingUser = ref(false);

const newUser = ref({
  full_name: '',
  email: '',
  password: '',
  role: 'company_employee',
  company_id: null
});

onMounted(async () => {
  try {
    loading.value = true;
    const [statsRes, companiesRes, ordersRes] = await Promise.all([
      apiService.dashboard.getStats(),
      apiService.companies.getAll(),
      apiService.orders.getAll({ limit: 10, page: 1 })
    ]);
    stats.value = statsRes.data;
    companies.value = companiesRes.data;
    orders.value = ordersRes.data.orders;
  } catch (err) {
    console.error('Error al cargar datos del dashboard:', err);
  } finally {
    loading.value = false;
  }
});

async function openUsersModal(company) {
  selectedCompany.value = company;
  showUsersModal.value = true;
  loadingUsers.value = true;
  try {
    const res = await apiService.users.getByCompany(company._id);
    users.value = res.data;
  } catch (error) {
    console.error("Error cargando usuarios:", error);
  } finally {
    loadingUsers.value = false;
  }
}

function openAddUserModal() {
  newUser.value = {
    full_name: '',
    email: '',
    password: '',
    role: 'company_employee',
    company_id: selectedCompany.value?._id
  };
  showAddUserForm.value = true;
}

async function handleAddNewUser() {
    isAddingUser.value = true;
    try {
        await apiService.users.create(newUser.value);
        alert('Usuario creado con éxito.');
        showAddUserForm.value = false;
        // Refrescar la lista de usuarios
        await openUsersModal(selectedCompany.value); 
    } catch (error) {
        alert(`Error al crear usuario: ${error.message}`);
    } finally {
        isAddingUser.value = false;
    }
}

async function toggleUserStatus(user) {
  const newStatus = !user.is_active;
  const confirmation = confirm(`¿Estás seguro de que quieres ${newStatus ? 'activar' : 'desactivar'} a ${user.full_name}?`);
  
  if (confirmation) {
    try {
      await apiService.users.update(user._id, { is_active: newStatus });
      user.is_active = newStatus;
      alert('Usuario actualizado con éxito.');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getStatusName(status) {
  const names = {
    pending: 'Pendiente', processing: 'Procesando', shipped: 'Enviado',
    delivered: 'Entregado', cancelled: 'Cancelado'
  };
  return names[status] || status;
}

function logout() {
  auth.logout();
  router.push('/');
}
</script>


<style scoped>
/* Estilos adaptados de dashboard.vue para consistencia */
.admin-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: #f3f4f6;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.dashboard-header h1 {
  color: #1f2937;
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logout-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logout-btn:hover {
  background: #dc2626;
}

.loading-state {
  text-align: center;
  padding: 60px;
  font-size: 18px;
  color: #6b7280;
  background-color: white;
  border-radius: 12px;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.stat-card h3 {
  margin: 0 0 10px 0;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 5px;
}

.stat-change {
  font-size: 12px;
  color: #6b7280;
}

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
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

.company-name {
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 10px 0;
}

.company-info {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

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
  padding: 12px 16px;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  text-transform: uppercase;
}

.orders-table td {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
  font-size: 14px;
}

.order-row:last-child td {
  border-bottom: none;
}

.order-row:hover {
  background: #f9fafb;
}

.order-number {
  font-weight: 500;
  color: #1f2937;
}

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
  display: inline-block;
}

.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.processing { background: #dbeafe; color: #1e40af; }
.status-badge.shipped { background: #e9d5ff; color: #6b21a8; }
.status-badge.delivered { background: #d1fae5; color: #065f46; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }
.company-list { display: flex; flex-direction: column; }
.company-list-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #e5e7eb; }
.company-list-item:last-child { border-bottom: none; }
.company-list-info { display: flex; flex-direction: column; }
.company-details { font-size: 14px; color: #6b7280; }
.btn-manage { background-color: #4f46e5; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; transition: background-color 0.2s; }
.btn-manage:hover { background-color: #4338ca; }
.modal-actions-header { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.btn-add-user { background-color: #10b981; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; }
.users-table-wrapper { overflow-x: auto; }
.users-table { width: 100%; border-collapse: collapse; text-align: left; }
.users-table th, .users-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
.users-table th { background-color: #f9fafb; font-weight: 600; font-size: 12px; }
.empty-state-small { text-align: center; padding: 20px; font-style: italic; color: #6b7280; }
.status-badge.active { background-color: #d1fae5; color: #065f46; }
.status-badge.inactive { background-color: #fee2e2; color: #991b1b; }
.btn-toggle-status { font-size: 12px; padding: 4px 8px; border-radius: 4px; border: 1px solid #d1d5db; background-color: white; cursor: pointer; }
.btn-toggle-status:disabled { cursor: not-allowed; opacity: 0.5; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.modal-actions-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.modal-actions-footer button { padding: 10px 20px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; }
.modal-actions-footer button[type="button"] { background-color: #e5e7eb; }
.modal-actions-footer button[type="submit"] { background-color: #4f46e5; color: white; }
.modal-actions-footer button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>