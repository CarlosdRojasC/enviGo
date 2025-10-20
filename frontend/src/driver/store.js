import { reactive } from "vue";
import axios from "axios";

export const driverStore = reactive({
  user: null,
  route: null,
  isLoading: false,

  async login(email, password) {
    const res = await axios.post("/api/drivers/login", { email, password });
    const user = res.data.user;

    if (user.role !== "driver") {
      throw new Error("Solo conductores pueden acceder");
    }

    localStorage.setItem("driver_token", res.data.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
    this.user = user;
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
});
