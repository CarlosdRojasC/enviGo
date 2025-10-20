// ✅ frontend/src/driver/store.js
import { reactive } from "vue";
import axios from "axios";

// ================================================
// 🔧 CONFIGURACIÓN GLOBAL DE AXIOS
// ================================================

// ✅ Base URL dinámica según entorno
axios.defaults.baseURL = import.meta.env.VITE_PROD_API_URL
  ? "https://www.envigo.cl" // 🔥 URL del backend en producción
  : "http://localhost:3001"; // 🧪 URL del backend local

// ✅ Configuración por defecto
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.withCredentials = true;

// ================================================
// 🚛 DRIVER STORE
// ================================================
export const driverStore = reactive({
  driver: null,
  route: null,
  isLoading: false,
  token: localStorage.getItem("driver_token"),

  // ✅ Inicializar store al cargar
  init() {
    if (this.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
      this.loadProfile();
    }
  },

  // ================================================
  // 🔑 LOGIN DE CONDUCTOR
  // ================================================
  async login(email, password) {
    try {
      const res = await axios.post("/login", { email, password });

      // Validación
      if (!res.data.success) {
        throw new Error(res.data.message || "Error de autenticación");
      }

      const driver = res.data.driver;
      const token = res.data.token;

      // Guardar token y configurar headers
      localStorage.setItem("driver_token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Guardar datos en store
      this.driver = driver;
      this.token = token;

      return { success: true };
    } catch (error) {
      console.error("❌ Error en login driver:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Error de autenticación"
      );
    }
  },

  // ================================================
  // 👤 Cargar perfil del conductor autenticado
  // ================================================
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

  // ================================================
  // 🚚 Cargar ruta activa del conductor
  // ================================================
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

  // ================================================
  // 🚪 Cerrar sesión
  // ================================================
  logout() {
    localStorage.removeItem("driver_token");
    delete axios.defaults.headers.common["Authorization"];
    this.driver = null;
    this.route = null;
    this.token = null;
  },

  // ================================================
  // ✅ Getter: Verificar si el conductor está autenticado
  // ================================================
  get isAuthenticated() {
    return !!this.token && !!this.driver;
  },
});

// ✅ Ejecutar init automáticamente al cargar
driverStore.init();
