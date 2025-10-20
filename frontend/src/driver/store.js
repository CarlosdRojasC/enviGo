// frontend/src/driver/store.js - CORREGIDO
import { reactive } from "vue";
import axios from "axios";

export const driverStore = reactive({
  driver: null, // ✅ Cambiar de 'user' a 'driver'
  route: null,
  isLoading: false,
  token: localStorage.getItem('driver_token'),

  // ✅ Inicializar driver si hay token
  init() {
    if (this.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
      // Cargar perfil del driver
      this.loadProfile();
    }
  },

  async login(email, password) {
    try {
      const res = await axios.post("/api/drivers/login", { email, password });
      
      // ✅ Validar la respuesta correcta del backend
      if (!res.data.success) {
        throw new Error(res.data.message || "Error de autenticación");
      }

      const driver = res.data.driver; // ✅ Usar 'driver' del backend
      const token = res.data.token;

      // ✅ Guardar token y configurar headers
      localStorage.setItem("driver_token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      // ✅ Guardar driver en el store
      this.driver = driver;
      this.token = token;

      return { success: true };
    } catch (error) {
      console.error("❌ Error en login driver:", error);
      throw new Error(error.response?.data?.message || error.message || "Error de autenticación");
    }
  },

  async loadProfile() {
    try {
      const res = await axios.get("/api/drivers/me");
      if (res.data.success) {
        this.driver = res.data.driver;
      }
    } catch (error) {
      console.error("❌ Error cargando perfil:", error);
      this.logout();
    }
  },

  async loadActiveRoute() {
    this.isLoading = true;
    try {
      const res = await axios.get("/api/routes/driver/active");
      this.route = res.data.data;
    } catch (e) {
      console.error("❌ Error al cargar ruta:", e.message);
      this.route = null;
    } finally {
      this.isLoading = false;
    }
  },

  logout() {
    localStorage.removeItem("driver_token");
    delete axios.defaults.headers.common["Authorization"];
    this.driver = null;
    this.route = null;
    this.token = null;
  },

  // ✅ Getter para verificar si está autenticado
  get isAuthenticated() {
    return !!this.token && !!this.driver;
  }
});

// ✅ Inicializar store al cargar
driverStore.init();