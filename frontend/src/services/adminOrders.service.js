import { ref, computed } from 'vue';
import { apiService } from './api';
import { useToast } from 'vue-toastification';

export function useAdminOrders() {
  const toast = useToast();
  
  // --- STATE ---
  const orders = ref([]);
  const companies = ref([]);
  const availableCommunes = ref([]);
  const pagination = ref({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const filters = ref({ company_id: '', status: '', shipping_commune: '', date_from: '', date_to: '', search: '' });
  const loading = ref(true);
  const selectedOrders = ref([]);

  // --- COMPUTED ---
  const selectAllChecked = computed(() => {
    const selectable = orders.value.filter(o => !o.shipday_order_id);
    return selectable.length > 0 && selectedOrders.value.length === selectable.length;
  });

  const selectAllIndeterminate = computed(() => {
    const selectable = orders.value.filter(o => !o.shipday_order_id);
    const selectedCount = selectedOrders.value.filter(id => selectable.some(o => o._id === id)).length;
    return selectedCount > 0 && selectedCount < selectable.length;
  });

  // --- METHODS ---
  async function fetchOrders() {
    loading.value = true;
    try {
      const params = { ...filters.value, page: pagination.value.page, limit: pagination.value.limit };
      const { data } = await apiService.orders.getAll(params);
      orders.value = data.orders;
      pagination.value = data.pagination;
      selectedOrders.value = []; // Limpiar selección en cada carga
    } catch (err) {
      toast.error('No se pudieron cargar los pedidos.');
    } finally {
      loading.value = false;
    }
  }

  async function fetchInitialData() {
    try {
      const [companiesRes, communesRes] = await Promise.all([
        apiService.companies.getAll(),
        apiService.orders.getAvailableCommunes()
      ]);
      companies.value = companiesRes.data;
      availableCommunes.value = communesRes.data.communes;
    } catch (err) {
      toast.error('Error al cargar datos iniciales (empresas/comunas).');
    }
  }

  function goToPage(page) {
    if (page > 0 && page <= pagination.value.totalPages) {
      pagination.value.page = page;
      fetchOrders();
    }
  }

  function toggleSelectAll() {
    const selectableOrders = orders.value.filter(order => !order.shipday_order_id).map(o => o._id);
    if (selectAllChecked.value) {
      selectedOrders.value = [];
    } else {
      selectedOrders.value = [...new Set([...selectedOrders.value, ...selectableOrders])];
    }
  }
  
  return {
    // State
    orders,
    companies,
    availableCommunes,
    pagination,
    filters,
    loading,
    selectedOrders,
    // Computed
    selectAllChecked,
    selectAllIndeterminate,
    // Methods
    fetchOrders,
    fetchInitialData,
    goToPage,
    toggleSelectAll
  };
}