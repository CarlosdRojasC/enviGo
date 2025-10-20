// frontend/src/driver/store.js
import { reactive } from "vue";
import axios from "axios";

export const driverStore = reactive({
  driver: null,
  token: localStorage.getItem("driver_token"),
  isLoading: false,

  init() {
    if (this.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
      this.loadProfile();
    }
  },

  async login(email, password) {
    try {
      this.isLoading = true;
      const res = await axios.post("/api/auth/login", { email, password });

      if (!res.data.success && !res.data.token) {
        throw new Error(res.data.error || "Error de autenticación");
      }

      const user = res.data.user;
      if (user.role !== "driver") {
        throw new Error("Solo los conductores pueden acceder a este portal");
      }

      localStorage.setItem("driver_token", res.data.token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      this.driver = user;
      this.token = res.data.token;
      return { success: true };
    } catch (err) {
      console.error("❌ Error login driver:", err);
      throw new Error(err.response?.data?.error || err.message);
    } finally {
      this.isLoading = false;
    }
  },

  async loadProfile() {
    try {
      const res = await axios.get("/api/auth/profile");
      if (res.data && res.data.role === "driver") {
        this.driver = res.data;
      } else {
        this.logout();
      }
    } catch (err) {
      console.error("❌ Error cargando perfil driver:", err);
      this.logout();
    }
  },

  logout() {
    localStorage.removeItem("driver_token");
    delete axios.defaults.headers.common["Authorization"];
    this.driver = null;
    this.token = null;
  },

  get isAuthenticated() {
    return !!this.token && !!this.driver;
  },
});

driverStore.init();
