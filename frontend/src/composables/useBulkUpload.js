// composables/useBulkUpload.js
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import { apiService } from '../services/api'

export function useBulkUpload(fetchOrders) {
  const toast = useToast()

  // ==================== STATE ====================
  const bulkUploadCompanyId = ref('')
  const selectedFile = ref(null)
  const uploadFeedback = ref('')
  const uploadStatus = ref('') // 'processing', 'success', 'error'
  const isUploading = ref(false)

  // ==================== METHODS ====================
  
  /**
   * Handle file selection
   */
  function handleFileSelect(event) {
    const file = event.target.files[0]
    
    if (!file) {
      selectedFile.value = null
      return
    }
    
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv (if supported)
    ]
    
    if (!validTypes.includes(file.type)) {
      toast.error('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)')
      event.target.value = '' // Clear the input
      selectedFile.value = null
      return
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 10MB permitido.')
      event.target.value = ''
      selectedFile.value = null
      return
    }
    
    selectedFile.value = file
    uploadFeedback.value = ''
    uploadStatus.value = ''
    
    console.log('📄 File selected:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type
    })
  }

  /**
   * Handle bulk upload process
   */
  async function handleBulkUpload() {
    // Validation
    if (!bulkUploadCompanyId.value) {
      toast.warning('Por favor, selecciona una empresa para la subida masiva')
      return false
    }
    
    if (!selectedFile.value) {
      toast.warning('Por favor, selecciona un archivo')
      return false
    }
    
    isUploading.value = true
    uploadFeedback.value = 'Procesando archivo...'
    uploadStatus.value = 'processing'
    
    try {
      console.log('⬆️ Starting bulk upload:', {
        file: selectedFile.value.name,
        companyId: bulkUploadCompanyId.value
      })
      
      // Prepare form data
      const formData = new FormData()
      formData.append('file', selectedFile.value)
      formData.append('company_id', bulkUploadCompanyId.value)
      
      // Upload file
      const { data } = await apiService.orders.bulkUpload(formData)
      
      console.log('✅ Bulk upload response:', data)
      
      // Process response
      const successful = data.success || data.created || 0
      const failed = data.failed || data.errors?.length || 0
      const total = successful + failed
      
      // Update UI
      uploadFeedback.value = `Proceso completado: ${successful} pedidos creados`
      if (failed > 0) {
        uploadFeedback.value += `, ${failed} fallaron`
      }
      
      uploadStatus.value = failed > 0 ? 'error' : 'success'
      
      // Show detailed feedback
      if (data.errors && data.errors.length > 0) {
        console.warn('⚠️ Upload errors:', data.errors)
        
        // Show first few errors
        const errorSummary = data.errors.slice(0, 3).map(error => 
          `Fila ${error.row}: ${error.message}`
        ).join('\n')
        
        if (data.errors.length > 3) {
          uploadFeedback.value += `\n\nPrimeros errores:\n${errorSummary}\n... y ${data.errors.length - 3} más`
        } else {
          uploadFeedback.value += `\n\nErrores:\n${errorSummary}`
        }
      }
      
      // Show success message
      if (successful > 0) {
        toast.success(`✅ ${successful} pedidos creados exitosamente`)
        
        // Refresh orders list
        await fetchOrders()
      }
      
      if (failed > 0) {
        toast.warning(`⚠️ ${failed} pedidos fallaron. Revisa los detalles.`)
      }
      
      console.log('📊 Bulk upload summary:', {
        total,
        successful,
        failed,
        successRate: total > 0 ? Math.round((successful / total) * 100) : 0
      })
      
      return successful > 0
      
    } catch (error) {
      console.error('❌ Error in bulk upload:', error)
      
      let errorMessage = 'Error al procesar el archivo'
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      uploadFeedback.value = `Error: ${errorMessage}`
      uploadStatus.value = 'error'
      
      toast.error(`Error en subida masiva: ${errorMessage}`)
      return false
      
    } finally {
      isUploading.value = false
    }
  }

  /**
   * Download template file
   */
  async function downloadTemplate() {
    try {
      console.log('📥 Downloading template file...')
      
      // Try to get template from API
      try {
        const response = await apiService.orders.downloadImportTemplate()
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'plantilla_importacion_pedidos.xlsx')
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        
        toast.success('✅ Plantilla descargada exitosamente')
        console.log('✅ Template downloaded from API')
        
      } catch (apiError) {
        console.warn('⚠️ API template not available, generating client-side template')
        
        // Fallback: Generate simple CSV template
        generateClientSideTemplate()
      }
      
    } catch (error) {
      console.error('❌ Error downloading template:', error)
      toast.error('No se pudo descargar la plantilla. Inténtalo de nuevo.')
    }
  }

  /**
   * Generate client-side template as fallback
   */
  function generateClientSideTemplate() {
    const templateData = [
      [
        'order_number',
        'customer_name', 
        'customer_email',
        'customer_phone',
        'shipping_address',
        'shipping_commune',
        'shipping_state',
        'total_amount',
        'shipping_cost',
        'notes',
        'priority',
        'serviceTime',
        'timeWindowStart',
        'timeWindowEnd',
        'load1Packages',
        'load2WeightKg'
      ],
      [
        'ORD-001',
        'Juan Pérez',
        'juan@email.com',
        '+56912345678',
        'Av. Providencia 123, Depto 45',
        'Providencia',
        'Región Metropolitana',
        '25000',
        '3000',
        'Entregar en recepción',
        'Normal',
        '5',
        '09:00',
        '18:00',
        '1',
        '2.5'
      ],
      [
        'ORD-002',
        'María González',
        'maria@email.com',
        '+56987654321',
        'Las Condes 456',
        'Las Condes',
        'Región Metropolitana',
        '15000',
        '2500',
        'Llamar antes de llegar',
        'Alta',
        '3',
        '10:00',
        '16:00',
        '2',
        '1.8'
      ]
    ]
    
    const csvContent = templateData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'plantilla_pedidos.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('✅ Plantilla CSV generada y descargada')
      console.log('✅ Client-side CSV template generated')
    }
  }

  /**
   * Reset upload state
   */
  function resetUploadState() {
    selectedFile.value = null
    uploadFeedback.value = ''
    uploadStatus.value = ''
    isUploading.value = false
    bulkUploadCompanyId.value = ''
    
    console.log('🔄 Upload state reset')
  }

  /**
   * Validate upload readiness
   */
  function validateUploadReadiness() {
    const errors = []
    
    if (!bulkUploadCompanyId.value) {
      errors.push('Debe seleccionar una empresa')
    }
    
    if (!selectedFile.value) {
      errors.push('Debe seleccionar un archivo')
    }
    
    return {
      isReady: errors.length === 0,
      errors
    }
  }

  /**
   * Get upload progress info
   */
  function getUploadInfo() {
    return {
      hasFile: !!selectedFile.value,
      fileName: selectedFile.value?.name,
      fileSize: selectedFile.value ? `${(selectedFile.value.size / 1024 / 1024).toFixed(2)}MB` : null,
      companySelected: !!bulkUploadCompanyId.value,
      isUploading: isUploading.value,
      status: uploadStatus.value,
      feedback: uploadFeedback.value
    }
  }

  /**
   * Parse upload results for display
   */
  function parseUploadResults(data) {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [],
      successRate: 0
    }
    
    // Handle different response formats
    if (data.success !== undefined && data.failed !== undefined) {
      results.successful = data.success
      results.failed = data.failed
      results.total = results.successful + results.failed
    } else if (data.created !== undefined) {
      results.successful = data.created
      results.failed = data.errors?.length || 0
      results.total = results.successful + results.failed
    }
    
    // Parse errors
    if (data.errors && Array.isArray(data.errors)) {
      results.errors = data.errors.map(error => ({
        row: error.row || error.line || 'N/A',
        message: error.message || error.error || 'Error desconocido',
        field: error.field || null
      }))
    }
    
    // Calculate success rate
    if (results.total > 0) {
      results.successRate = Math.round((results.successful / results.total) * 100)
    }
    
    return results
  }

  // ==================== RETURN ====================
  return {
    // State
    bulkUploadCompanyId,
    selectedFile,
    uploadFeedback,
    uploadStatus,
    isUploading,
    
    // Methods
    handleFileSelect,
    handleBulkUpload,
    downloadTemplate,
    resetUploadState,
    validateUploadReadiness,
    getUploadInfo,
    parseUploadResults
  }
}