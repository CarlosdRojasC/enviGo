<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Gestión de Empresas</h1>
      <button @click="openAddCompanyModal" class="btn-primary">+ Añadir Empresa</button>
    </div>

    <div v-if="loading" class="loading"><p>Cargando empresas...</p></div>
    <div v-else class="content-section">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre de la Empresa</th>
              <th>Usuarios</th>
              <th>Pedidos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="companies.length === 0">
              <td colspan="5" class="empty-row">No hay empresas registradas.</td>
            </tr>
            <tr v-else v-for="company in companies" :key="company._id">
              <td>{{ company.name }}</td>
              <td>{{ company.users_count }}</td>
              <td>{{ company.orders_count }}</td>
              <td>
                <span class="status-badge" :class="company.is_active ? 'active' : 'inactive'">
                  {{ company.is_active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td>
                <button @click="openUsersModal(company)" class="btn-secondary">Gestionar Usuarios</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-model="showUsersModal" :title="`Usuarios de ${selectedCompany?.name}`" width="800px">
      <div v-if="loadingUsers" class="loading-state">Cargando usuarios...</div>
      <div v-else>
        <div class="modal-actions-header">
            <button @click="openAddUserModal" class="btn-add-user">+ Añadir Usuario</button>
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
                <td>{{ user.role.replace('company_', '') }}</td>
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
                <label for="new-user-password">Contraseña Provisional</label>
                <input id="new-user-password" v-model="newUser.password" type="password" required>
            </div>
            <div class="form-group">
                <label for="new-user-role">Rol</label>
                <select id="new-user-role" v-model="newUser.role">
                    <option value="company_employee">Empleado</option>
                    <option value="company_owner">Dueño</option>
                </select>
            </div>
            <div class="modal-actions">
                <button type="button" @click="showAddUserForm = false" class="btn-cancel">Cancelar</button>
                <button type="submit" :disabled="isAddingUser" class="btn-save">
                    {{ isAddingUser ? 'Añadiendo...' : 'Añadir Usuario' }}
                </button>
            </div>
        </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiService } from '../services/api';
import Modal from '../components/Modal.vue';

const companies = ref([]);
const users = ref([]);
const loading = ref(true);
const loadingUsers = ref(false);

const showAddCompanyModal = ref(false);
const showUsersModal = ref(false);
const showAddUserForm = ref(false);
const isAdding = ref(false);
const isAddingUser = ref(false);

const selectedCompany = ref(null);

const newCompany = ref({ name: '', owner_name: '', owner_email: '', owner_password: '' });
const newUser = ref({ full_name: '', email: '', password: '', role: 'company_employee', company_id: null });

onMounted(fetchCompanies);

async function fetchCompanies() {
  loading.value = true;
  try {
    const { data } = await apiService.companies.getAll();
    companies.value = data;
  } catch (error) {
    console.error("Error fetching companies:", error);
    alert('No se pudieron cargar las empresas.');
  } finally {
    loading.value = false;
  }
}

function openAddCompanyModal() {
  newCompany.value = { name: '', owner_name: '', owner_email: '', owner_password: '' };
  showAddCompanyModal.value = true;
}

async function handleAddNewCompany() {
  isAdding.value = true;
  try {
    await apiService.companies.create(newCompany.value);
    alert('Empresa y usuario dueño creados con éxito.');
    showAddCompanyModal.value = false;
    await fetchCompanies();
  } catch (error) {
    alert(`Error al crear la empresa: ${error.message}`);
  } finally {
    isAdding.value = false;
  }
}

async function openUsersModal(company) {
  selectedCompany.value = company;
  showUsersModal.value = true;
  loadingUsers.value = true;
  try {
    const { data } = await apiService.users.getByCompany(company._id);
    users.value = data;
  } catch (error) {
    console.error("Error cargando usuarios:", error);
    alert('No se pudieron cargar los usuarios de la empresa.');
  } finally {
    loadingUsers.value = false;
  }
}

function openAddUserModal() {
  newUser.value = {
    full_name: '', email: '', password: '', 
    role: 'company_employee', company_id: selectedCompany.value?._id
  };
  showAddUserForm.value = true;
}

async function handleAddNewUser() {
    isAddingUser.value = true;
    try {
        await apiService.users.create(newUser.value);
        alert('Usuario creado con éxito.');
        showAddUserForm.value = false;
        await openUsersModal(selectedCompany.value); // Recargar la lista de usuarios
        await fetchCompanies(); // Recargar los contadores de las empresas
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
      alert(`Error al actualizar usuario: ${error.message}`);
    }
  }
}
</script>

<style scoped>
.page-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 28px; font-weight: 700; color: #1f2937; }
.btn-primary { background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; }
.content-section { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
.data-table th { background: #f9fafb; font-weight: 600; font-size: 12px; color: #374151; }
.data-table tr:last-child td { border-bottom: none; }
.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.status-badge.active { background-color: #d1fae5; color: #065f46; }
.status-badge.inactive { background-color: #fee2e2; color: #991b1b; }
.btn-secondary { font-size: 12px; padding: 6px 12px; border-radius: 6px; border: 1px solid #d1d5db; background: white; cursor: pointer; }
.form-section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; }
.form-section:last-child { border-bottom: none; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.btn-cancel, .modal-actions button[type="button"] { background-color: #e5e7eb; padding: 10px 20px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; }
.btn-save, .modal-actions button[type="submit"] { background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.loading, .empty-row, .loading-state, .empty-state-small { text-align: center; padding: 40px; color: #6b7280; font-style: italic; }
.modal-actions-header { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.btn-add-user { background-color: #10b981; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; }
.users-table-wrapper { overflow-x: auto; }
.users-table { width: 100%; border-collapse: collapse; text-align: left; }
.users-table th, .users-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
.users-table th { background-color: #f9fafb; font-weight: 600; font-size: 12px; }
.btn-toggle-status { font-size: 12px; padding: 4px 8px; border-radius: 4px; border: 1px solid #d1d5db; background-color: white; cursor: pointer; }
.btn-toggle-status:disabled { cursor: not-allowed; opacity: 0.5; }
</style>