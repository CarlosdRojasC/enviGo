<template>
  <div class="manifest-page">
    <!-- Header -->
    <div class="manifest-header">
      <div class="manifest-title-section">
        <h1 class="manifest-title">📋 Manifiesto de Retiro</h1>
        <div class="manifest-meta">
          <span class="manifest-date">{{ formatDate(new Date()) }}</span>
          <span class="manifest-count">{{ orders.length }} pedidos</span>
        </div>
      </div>
      
      <div class="manifest-actions">
        <button @click="printManifest" class="btn-print">
          🖨️ Imprimir
        </button>
        <button @click="downloadPDF" class="btn-download" :disabled="loading">
          📄 Descargar PDF
        </button>
        <button @click="goBack" class="btn-back">
          ← Volver
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando datos del manifiesto...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">❌</div>
      <h3>Error al cargar los datos del manifiesto</h3>
      <p>{{ error }}</p>
      <button @click="loadManifestData" class="btn-retry">
        🔄 Reintentar
      </button>
    </div>

    <!-- Manifest Content -->
    <div v-else-if="orders.length > 0" class="manifest-content">
      <!-- Company Info -->
      <div v-if="companyInfo" class="company-section">
        <h2>Información de la Empresa</h2>
        <div class="company-details">
          <div class="company-item">
            <strong>Empresa:</strong> {{ companyInfo.name }}
          </div>
          <div class="company-item" v-if="companyInfo.email">
            <strong>Email:</strong> {{ companyInfo.email }}
          </div>
          <div class="company-item" v-if="companyInfo.phone">
            <strong>Teléfono:</strong> {{ companyInfo.phone }}
          </div>
        </div>
      </div>

      <!-- Summary Section -->
      <div class="summary-section">
        <h2>Resumen del Manifiesto</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-number">{{ orders.length }}</div>
            <div class="summary-label">Total Pedidos</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">{{ totalValue }}</div>
            <div class="summary-label">Valor Total</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">{{ uniqueCommunes.length }}</div>
            <div class="summary-label">Comunas</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">{{ totalPackages }}</div>
            <div class="summary-label">Paquetes</div>
          </div>
        </div>
      </div>

      <!-- Orders Table -->
      <div class="orders-section">
        <h2>Detalle de Pedidos</h2>
        <div class="table-container">
          <table class="manifest-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Dirección</th>
                <th>Comuna</th>
                <th>Teléfono</th>
                <th>Valor</th>
                <th>Observaciones</th>
                <th>Firma</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(order, index) in orders" :key="order._id" class="order-row">
                <td class="row-number">{{ index + 1 }}</td>
                <td class="order-number">#{{ order.order_number }}</td>
                <td class="customer-name">{{ order.customer_name }}</td>
                <td class="address">{{ order.shipping_address }}</td>
                <td class="commune">{{ order.shipping_commune }}</td>
                <td class="phone">{{ order.customer_phone || 'N/A' }}</td>
                <td class="value">${{ formatCurrency(order.total_amount || order.shipping_cost) }}</td>
                <td class="notes">{{ order.delivery_notes || '-' }}</td>
                <td class="signature-cell">
                  <div class="signature-box"></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer with signatures -->
      <div class="manifest-footer">
        <div class="signature-section">
          <div class="signature-box-large">
            <div class="signature-label">Firma del Conductor</div>
            <div class="signature-line"></div>
            <div class="signature-details">
              <p>Nombre: _________________________</p>
              <p>RUT: ____________________________</p>
              <p>Fecha: {{ formatDate(new Date()) }}</p>
            </div>
          </div>

          <div class="signature-box-large">
            <div class="signature-label">Firma del Responsable</div>
            <div class="signature-line"></div>
            <div class="signature-details">
              <p>Nombre: _________________________</p>
              <p>Cargo: ___________________________</p>
              <p>Fecha: {{ formatDate(new Date()) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>No se encontraron pedidos</h3>
      <p>No hay pedidos para mostrar en este manifiesto.</p>
      <button @click="goBack" class="btn-back">
        ← Volver a pedidos
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiService } from '../services/api'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const route = useRoute()
const router = useRouter()

// Estado
const loading = ref(true)
const error = ref(null)
const orders = ref([])
const companyInfo = ref(null)

// Computed properties
const totalRawValue = computed(() => {
  return orders.value.reduce((sum, order) => {
    return sum + (order.total_amount || order.shipping_cost || 0)
  }, 0)
})

const totalValue = computed(() => {
  return `$${formatCurrency(totalRawValue.value)}`
})

const uniqueCommunes = computed(() => {
  const communes = new Set(orders.value.map(order => order.shipping_commune))
  return Array.from(communes).filter(Boolean)
})

const totalPackages = computed(() => {
  return orders.value.reduce((sum, order) => {
    return sum + (order.package_count || 1)
  }, 0)
})

// Lifecycle
onMounted(() => {
  loadManifestData()
})

// Functions
async function loadManifestData() {
  loading.value = true
  error.value = null

  try {
    const orderIds = route.query.ids
    if (!orderIds) throw new Error('No se proporcionaron IDs de pedidos')
    const idsArray = orderIds.split(',').filter(Boolean)
    if (idsArray.length === 0) throw new Error('Lista de IDs de pedidos vacía')

    const response = await apiService.orders.getManifest(idsArray)

    orders.value = response.data.orders || []
    companyInfo.value = response.data.company || null
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Error desconocido'
  } finally {
    loading.value = false
  }
}

function printManifest() {
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) return alert('Permite ventanas emergentes para imprimir.')

  const tableContainer = document.querySelector('.table-container')
  const tableHTML = tableContainer ? tableContainer.outerHTML : '<p>Error: No se encontró la tabla</p>'

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Manifiesto de Retiro - ${companyInfo.value?.name || 'Pedidos'}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; font-size: 12px; }
        .print-header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; }
        .manifest-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .manifest-table th, .manifest-table td { border: 1px solid #333; padding: 6px 4px; }
        .manifest-table th { background: #f0f0f0; font-weight: bold; }
        .manifest-table td { vertical-align: top; }
        .print-footer { text-align: center; font-size: 9px; color: #666; margin-top: 20px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>📋 MANIFIESTO DE RETIRO</h1>
        <div>${companyInfo.value?.name || 'Empresa'} • ${formatDate(new Date())} • ${orders.value.length} pedidos</div>
      </div>
      ${tableHTML}
      <div class="print-footer">Manifiesto generado el ${formatDate(new Date())} • enviGo - Sistema de Gestión Logística</div>
    </body>
    </html>
  `

  printWindow.document.write(printContent)
  printWindow.document.close()

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
      printWindow.onafterprint = () => printWindow.close()
    }, 250)
  }
}

function downloadPDF() {
  try {
    const doc = new jsPDF('p', 'mm', 'a4')
    const primaryColor = [59, 130, 246]
    const textColor = [31, 41, 55]
    let yPos = 20

    doc.setFontSize(20)
    doc.setTextColor(...primaryColor)
    doc.text('📋 MANIFIESTO DE RETIRO', 20, yPos)

    yPos += 10
    doc.setFontSize(12)
    doc.setTextColor(...textColor)
    doc.text(`Fecha: ${formatDate(new Date())}`, 20, yPos)
    doc.text(`Total pedidos: ${orders.value.length}`, 120, yPos)

    yPos += 15

    if (companyInfo.value) {
      doc.setFontSize(14)
      doc.setTextColor(...primaryColor)
      doc.text('INFORMACIÓN DE LA EMPRESA', 20, yPos)
      yPos += 8

      doc.setFontSize(10)
      doc.setTextColor(...textColor)
      doc.text(`Empresa: ${companyInfo.value.name}`, 20, yPos)
      if (companyInfo.value.email) { yPos += 5; doc.text(`Email: ${companyInfo.value.email}`, 20, yPos) }
      if (companyInfo.value.phone) { yPos += 5; doc.text(`Teléfono: ${companyInfo.value.phone}`, 20, yPos) }

      yPos += 10
    }

    doc.setFontSize(14)
    doc.setTextColor(...primaryColor)
    doc.text('RESUMEN', 20, yPos)

    yPos += 8
    doc.setFontSize(10)
    doc.setTextColor(...textColor)

    const summaryData = [
      ['Total Pedidos:', orders.value.length.toString()],
      ['Valor Total:', `$${formatCurrency(totalRawValue.value)}`],
      ['Comunas:', uniqueCommunes.value.length.toString()],
      ['Paquetes:', totalPackages.value.toString()]
    ]

    summaryData.forEach(([label, value]) => {
      doc.text(label, 20, yPos)
      doc.text(value, 80, yPos)
      yPos += 5
    })

    yPos += 10

    doc.setFontSize(14)
    doc.setTextColor(...primaryColor)
    doc.text('DETALLE DE PEDIDOS', 20, yPos)
    yPos += 8

    const tableHeaders = ['#', 'Pedido', 'Cliente', 'Dirección', 'Comuna', 'Teléfono', 'Valor', 'Observaciones']
    const tableData = orders.value.map((order, i) => [
      (i + 1).toString(),
      `#${order.order_number}`,
      order.customer_name || 'N/A',
      order.shipping_address || 'N/A',
      order.shipping_commune || 'N/A',
      order.customer_phone || 'N/A',
      `${formatCurrency(order.total_amount || order.shipping_cost)}`,
      order.delivery_notes || '-'
    ])

    doc.autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 3, textColor, lineColor: [200, 200, 200], lineWidth: 0.1 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 25 }
      },
      margin: { left: 20, right: 20 }
    })

    yPos = doc.lastAutoTable.finalY + 20
    if (yPos > 220) { doc.addPage(); yPos = 20 }

    doc.setFontSize(14)
    doc.setTextColor(...primaryColor)
    doc.text('FIRMAS', 20, yPos)

    yPos += 15

    doc.setFontSize(12)
    doc.setTextColor(...textColor)
    doc.text('Firma del Conductor', 20, yPos)
    doc.rect(20, yPos + 5, 70, 30)
    doc.setFontSize(10)
    doc.text('Nombre: _________________________', 20, yPos + 45)
    doc.text('RUT: ____________________________', 20, yPos + 50)
    doc.text(`Fecha: ${formatDate(new Date())}`, 20, yPos + 55)

    doc.setFontSize(12)
    doc.text('Firma del Responsable', 110, yPos)
    doc.rect(110, yPos + 5, 70, 30)
    doc.setFontSize(10)
    doc.text('Nombre: _________________________', 110, yPos + 45)
    doc.text('Cargo: ___________________________', 110, yPos + 50)
    doc.text(`Fecha: ${formatDate(new Date())}`, 110, yPos + 55)

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Manifiesto generado el ${formatDate(new Date())} - Página ${i} de ${pageCount}`, 20, 285)
      doc.text('enviGo - Sistema de Gestión Logística', 120, 285)
    }

    const fileName = `manifiesto_${companyInfo.value?.name || 'pedidos'}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error('❌ Error generando PDF:', error)
    alert('Error al generar el PDF. Inténtalo de nuevo.')
  }
}

function goBack() {
  router.go(-1)
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL').format(amount || 0)
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>


<style scoped>
.manifest-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: white;
}

/* Header */
.manifest-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.manifest-title-section .manifest-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.manifest-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #6b7280;
}

.manifest-actions {
  display: flex;
  gap: 12px;
}

.btn-print,
.btn-download,
.btn-back,
.btn-retry {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-print {
  background: #059669;
  color: white;
}

.btn-download {
  background: #dc2626;
  color: white;
}

.btn-back {
  background: #6b7280;
  color: white;
}

.btn-retry {
  background: #3b82f6;
  color: white;
}

.btn-print:hover,
.btn-download:hover,
.btn-back:hover,
.btn-retry:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-download:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

/* Loading, Error, Empty States */
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Company Section */
.company-section {
  background: #f9fafb;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid #e5e7eb;
}

.company-section h2 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 18px;
}

.company-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.company-item {
  font-size: 14px;
  color: #374151;
}

/* Summary Section */
.summary-section {
  margin-bottom: 30px;
}

.summary-section h2 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 18px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.summary-item {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.summary-number {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.summary-label {
  font-size: 12px;
  opacity: 0.9;
}

/* Orders Section */
.orders-section h2 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 18px;
}

.table-container {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.manifest-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.manifest-table th {
  background: #f8fafc;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  font-size: 11px;
}

.manifest-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.order-row:nth-child(even) {
  background: #f9fafb;
}

.row-number {
  font-weight: 600;
  color: #6b7280;
  width: 40px;
}

.order-number {
  font-weight: 600;
  color: #1f2937;
  min-width: 80px;
}

.customer-name {
  min-width: 120px;
}

.address {
  min-width: 200px;
  line-height: 1.3;
}

.commune {
  min-width: 100px;
}

.phone {
  min-width: 100px;
}

.value {
  font-weight: 600;
  color: #059669;
  text-align: right;
  min-width: 80px;
}

.notes {
  min-width: 120px;
  font-style: italic;
  color: #6b7280;
}

.signature-cell {
  width: 80px;
}

.signature-box {
  width: 60px;
  height: 30px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

/* Footer */
.manifest-footer {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 2px solid #e5e7eb;
}

.signature-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.signature-box-large {
  text-align: center;
}

.signature-label {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.signature-line {
  height: 60px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  margin-bottom: 16px;
}

.signature-details p {
  margin: 8px 0;
  font-size: 14px;
  color: #374151;
}

/* Print Styles - Simplificados ya que usamos ventana separada */
@media print {
  /* Solo mantener estilos básicos para el PDF */
  .manifest-page {
    max-width: none;
    padding: 20px;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .manifest-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .signature-section {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>