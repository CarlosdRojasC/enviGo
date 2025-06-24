<template>
  <div>
    <h1>Dashboard de Pedidos</h1>
    <table border="1" cellpadding="8" cellspacing="0" width="100%">
      <thead>
        <tr>
          <th>ID</th>
          <th>Cliente</th>
          <th>Estado</th>
          <th>Precio</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pedido in pedidos" :key="pedido.id">
          <td>{{ pedido.id }}</td>
          <td>{{ pedido.cliente }}</td>
          <td>{{ pedido.estado }}</td>
          <td>{{ pedido.precio | currency }}</td>
          <td>{{ pedido.fecha }}</td>
        </tr>
      </tbody>
    </table>
  </div>
   <button @click="logout">Cerrar sesión</button>
</template>


<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const pedidos = ref([
  { id: 'P001', cliente: 'Juan Perez', estado: 'Entregado', precio: 1500, fecha: '2025-06-22' },
  { id: 'P002', cliente: 'María López', estado: 'Pendiente', precio: 1200, fecha: '2025-06-23' },
  { id: 'P003', cliente: 'Carlos Rojas', estado: 'En ruta', precio: 1800, fecha: '2025-06-24' },
])

function logout() {
  auth.logout()
  router.push('/')
}
// Filtro para mostrar precio con formato moneda
const currency = (value) => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value)
}
</script>

<script>
export default {
  filters: {
    currency(value) {
      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value)
    }
  }
}
</script>
