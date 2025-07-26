const XLSX = require('xlsx');

class ExcelService {

    // Generar plantilla para importar pedidos
  static async generateImportTemplate() {
    try {
      const templateData = [
        {
          'ID Externo*': 'EXT-001',
          'Número de Pedido*': 'ORD-001',
          'Nombre Cliente*': 'Juan Pérez',
          'Email Cliente': 'juan@email.com',
          'Teléfono Cliente': '+56912345678',
          'Documento Cliente': '12345678-9',
          'Dirección*': 'Av. Providencia 1234',
          'Ciudad*': 'Santiago',
          'Estado/Región': 'RM',
          'Código Postal': '7500000',
          'Monto Total*': 25000,
          'Costo de Envío': 2500,
          'Notas': 'Entregar en horario de tarde'
        }
      ];

      const wb = XLSX.utils.book_new();

      // Hoja de datos
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [
        { wch: 15 }, // ID Externo
        { wch: 20 }, // Número de Pedido
        // ... (otras columnas)
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

      // Hoja de instrucciones
      const instructions = [
        ['INSTRUCCIONES PARA IMPORTAR PEDIDOS'],
        [''],
        ['1. Los campos marcados con * son obligatorios'],
        ['2. ID Externo debe ser único para cada pedido en el canal'],
        // ... (otras instrucciones)
      ];

      const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      console.error('Error generando plantilla:', error);
      throw new Error('Error al generar plantilla de importación');
    }
  }

static async generateOrdersExport(orders) {
  try {
    console.log(`📊 Generando Excel con ${orders.length} pedidos`);

    // Preparar datos para Excel
    const data = orders.map((order, index) => ({
      // Información básica
      'N° Pedido': order.order_number,
      'ID Externo': order.external_id || '',
      'Empresa': order.company_id?.name || 'Sin empresa',
      'Canal': order.channel_id?.channel_name || 'Sin canal',
      
      // Fechas
      'Fecha Pedido': order.order_date ? new Date(order.order_date).toLocaleDateString('es-CL') : '',
      'Fecha Entrega': order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('es-CL') : '',
      
      // Cliente
      'Cliente': order.customer_name,
      'Email Cliente': order.customer_email || '',
      'Teléfono Cliente': order.customer_phone || '',
      'Documento Cliente': order.customer_document || '',
      
      // Dirección - ✅ INCLUIR COMUNA
      'Dirección': order.shipping_address,
      'Comuna': order.shipping_commune || 'Sin comuna', // ← CORREGIDO: estaba faltando
      'Ciudad': order.shipping_city || '',
      'Región': order.shipping_state || '',
      'Código Postal': order.shipping_zip || '',
      
      // Montos
      'Total': order.total_amount || 0,
      'Costo Envío': order.shipping_cost || 0,
      'Método Pago': order.payment_method || '',
      
      // Estado y tracking
      'Estado': order.status,
      'Estado Shipday': order.shipday_order_id ? 'En Shipday' : 'No enviado',
      'ID Shipday': order.shipday_order_id || '',
      'Conductor': order.driver_info?.name || '',
      'URL Tracking': order.shipday_tracking_url || '',
      
      // Notas
      'Notas': order.notes || '',
      'Instrucciones Entrega': order.delivery_instructions || ''
    }));

    const wb = XLSX.utils.book_new();

    // Crear hoja principal
    const ws = XLSX.utils.json_to_sheet(data);

    // Configurar ancho de columnas
    ws['!cols'] = [
      { wch: 15 }, // N° Pedido
      { wch: 15 }, // ID Externo
      { wch: 20 }, // Empresa
      { wch: 15 }, // Canal
      { wch: 12 }, // Fecha Pedido
      { wch: 12 }, // Fecha Entrega
      { wch: 25 }, // Cliente
      { wch: 25 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 15 }, // Documento
      { wch: 40 }, // Dirección
      { wch: 15 }, // Comuna ← NUEVA COLUMNA
      { wch: 15 }, // Ciudad
      { wch: 15 }, // Región
      { wch: 12 }, // Código Postal
      { wch: 12 }, // Total
      { wch: 12 }, // Costo Envío
      { wch: 15 }, // Método Pago
      { wch: 15 }, // Estado
      { wch: 15 }, // Estado Shipday
      { wch: 15 }, // ID Shipday
      { wch: 20 }, // Conductor
      { wch: 30 }, // URL Tracking
      { wch: 30 }, // Notas
      { wch: 30 }  // Instrucciones
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

    // Crear hoja de resumen
    const summaryData = [
      ['RESUMEN DE EXPORTACIÓN'],
      [''],
      ['Total de pedidos:', orders.length],
      ['Fecha de exportación:', new Date().toLocaleString('es-CL')],
      [''],
      ['ESTADOS:'],
      ...Object.entries(
        orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {})
      ).map(([status, count]) => [status, count]),
      [''],
      ['EMPRESAS:'],
      ...Object.entries(
        orders.reduce((acc, order) => {
          const company = order.company_id?.name || 'Sin empresa';
          acc[company] = (acc[company] || 0) + 1;
          return acc;
        }, {})
      ).map(([company, count]) => [company, count])
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
  } catch (error) {
    console.error('❌ Error generando Excel:', error);
    throw new Error('Error al generar archivo Excel');
  }
}

  
  // Generar reporte mensual de facturación
  static async generateMonthlyInvoiceReport(invoiceData) {
    try {
      const data = invoiceData.map(invoice => ({
        'Empresa': invoice.company_name,
        'Mes': `${invoice.month}/${invoice.year}`,
        'Total Pedidos': invoice.total_orders,
        'Pedidos Entregados': invoice.delivered_orders,
        'Precio por Pedido': invoice.price_per_order,
        'Total a Facturar': invoice.total_amount,
        'Estado': invoice.status === 'paid' ? 'Pagado' : 
                  invoice.status === 'sent' ? 'Enviado' : 'Pendiente',
        'Fecha de Pago': invoice.paid_date || '-'
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Ajustar anchos
      ws['!cols'] = [
        { wch: 30 }, // Empresa
        { wch: 12 }, // Mes
        { wch: 15 }, // Total Pedidos
        { wch: 18 }, // Pedidos Entregados
        { wch: 18 }, // Precio por Pedido
        { wch: 18 }, // Total a Facturar
        { wch: 12 }, // Estado
        { wch: 15 }  // Fecha de Pago
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
      
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      console.error('Error generando reporte de facturas:', error);
      throw new Error('Error al generar reporte de facturas');
    }
  }
  
  // Generar reporte de pedidos
  static async generateOrdersReport(orders) {
    try {
      const data = orders.map(order => ({
        'ID Pedido': order.order_number,
        'Fecha': new Date(order.order_date).toLocaleDateString(),
        'Cliente': order.customer_name,
        'Email': order.customer_email,
        'Teléfono': order.customer_phone,
        'Dirección': order.shipping_address,
        'Ciudad': order.shipping_city,
        'Total': order.total_amount,
        'Estado': this.translateStatus(order.status),
        'Canal': order.channel_name,
        'Empresa': order.company_name || '-',
        'Notas': order.notes || '-'
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Ajustar anchos de columna
      ws['!cols'] = [
        { wch: 15 }, // ID Pedido
        { wch: 12 }, // Fecha
        { wch: 25 }, // Cliente
        { wch: 25 }, // Email
        { wch: 15 }, // Teléfono
        { wch: 40 }, // Dirección
        { wch: 20 }, // Ciudad
        { wch: 12 }, // Total
        { wch: 12 }, // Estado
        { wch: 20 }, // Canal
        { wch: 20 }, // Empresa
        { wch: 30 }  // Notas
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
      
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      console.error('Error generando reporte de pedidos:', error);
      throw new Error('Error al generar reporte de pedidos');
    }
  }
  
  // Generar reporte de análisis por empresa
  static async generateCompanyAnalysisReport(companyData) {
    try {
      const wb = XLSX.utils.book_new();
      
      // Hoja 1: Resumen General
      const summaryData = companyData.map(company => ({
        'Empresa': company.name,
        'Total Pedidos': company.total_orders,
        'Pedidos Pendientes': company.pending_orders,
        'Pedidos En Tránsito': company.in_transit_orders,
        'Pedidos Entregados': company.delivered_orders,
        'Pedidos Cancelados': company.cancelled_orders,
        'Tasa de Entrega': `${((company.delivered_orders / company.total_orders) * 100).toFixed(2)}%`,
        'Ingresos Totales': company.total_revenue,
        'Precio por Pedido': company.price_per_order,
        'Total a Cobrar': company.delivered_orders * company.price_per_order
      }));
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary['!cols'] = [
        { wch: 30 }, // Empresa
        { wch: 15 }, // Total Pedidos
        { wch: 18 }, // Pedidos Pendientes
        { wch: 18 }, // Pedidos En Tránsito
        { wch: 18 }, // Pedidos Entregados
        { wch: 18 }, // Pedidos Cancelados
        { wch: 15 }, // Tasa de Entrega
        { wch: 18 }, // Ingresos Totales
        { wch: 18 }, // Precio por Pedido
        { wch: 18 }  // Total a Cobrar
      ];
      
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen General');
      
      // Hoja 2: Análisis por Canal
      const channelData = [];
      companyData.forEach(company => {
        if (company.channels) {
          company.channels.forEach(channel => {
            channelData.push({
              'Empresa': company.name,
              'Canal': channel.channel_name,
              'Tipo': channel.channel_type,
              'Total Pedidos': channel.total_orders,
              'Última Sincronización': channel.last_sync ? new Date(channel.last_sync).toLocaleString() : 'Nunca',
              'Estado': channel.is_active ? 'Activo' : 'Inactivo'
            });
          });
        }
      });
      
      if (channelData.length > 0) {
        const wsChannels = XLSX.utils.json_to_sheet(channelData);
        wsChannels['!cols'] = [
          { wch: 30 }, // Empresa
          { wch: 25 }, // Canal
          { wch: 15 }, // Tipo
          { wch: 15 }, // Total Pedidos
          { wch: 25 }, // Última Sincronización
          { wch: 12 }  // Estado
        ];
        XLSX.utils.book_append_sheet(wb, wsChannels, 'Análisis por Canal');
      }
      
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      console.error('Error generando reporte de análisis:', error);
      throw new Error('Error al generar reporte de análisis');
    }
  }
  
  // Generar plantilla para importar pedidos
  static async generateImportTemplate() {
    try {
      const templateData = [
        {
          'ID Externo*': 'EXT-001',
          'Número de Pedido*': 'ORD-001',
          'Nombre Cliente*': 'Juan Pérez',
          'Email Cliente': 'juan@email.com',
          'Teléfono Cliente': '+56912345678',
          'Documento Cliente': '12345678-9',
          'Dirección*': 'Av. Providencia 1234',
          'Ciudad*': 'Santiago',
          'Estado/Región': 'RM',
          'Código Postal': '7500000',
          'Monto Total*': 25000,
          'Costo de Envío': 2500,
          'Notas': 'Entregar en horario de tarde'
        }
      ];
      
      const wb = XLSX.utils.book_new();
      
      // Hoja de datos
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [
        { wch: 15 }, // ID Externo
        { wch: 20 }, // Número de Pedido
        { wch: 25 }, // Nombre Cliente
        { wch: 25 }, // Email Cliente
        { wch: 20 }, // Teléfono Cliente
        { wch: 20 }, // Documento Cliente
        { wch: 40 }, // Dirección
        { wch: 20 }, // Ciudad
        { wch: 15 }, // Estado/Región
        { wch: 15 }, // Código Postal
        { wch: 15 }, // Monto Total
        { wch: 15 }, // Costo de Envío
        { wch: 40 }  // Notas
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
      
      // Hoja de instrucciones
      const instructions = [
        ['INSTRUCCIONES PARA IMPORTAR PEDIDOS'],
        [''],
        ['1. Los campos marcados con * son obligatorios'],
        ['2. ID Externo debe ser único para cada pedido en el canal'],
        ['3. El formato de fecha debe ser DD/MM/AAAA'],
        ['4. Los montos deben ser números sin símbolos de moneda'],
        ['5. No elimine la fila de encabezados'],
        ['6. Puede agregar múltiples pedidos en filas consecutivas'],
        [''],
        ['CÓDIGOS DE CIUDAD VÁLIDOS:'],
        ['Santiago, Valparaíso, Concepción, La Serena, Antofagasta, Temuco, Rancagua, Talca, Arica, Iquique']
      ];
      
      const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
      
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      console.error('Error generando plantilla:', error);
      throw new Error('Error al generar plantilla de importación');
    }
  }
  
  // Traducir estado
  static translateStatus(status) {
    const translations = {
      'pending': 'Pendiente',
      'processing': 'Procesando',
      'shipped': 'Enviado',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado'
    };
    return translations[status] || status;
  }
  
  // Validar datos de importación
  static validateImportData(data) {
    const errors = [];
    const requiredFields = ['ID Externo*', 'Número de Pedido*', 'Nombre Cliente*', 'Dirección*', 'Ciudad*', 'Monto Total*'];
    
    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`Fila ${index + 2}: El campo "${field}" es obligatorio`);
        }
      });
      
      if (row['Monto Total*'] && isNaN(parseFloat(row['Monto Total*']))) {
        errors.push(`Fila ${index + 2}: El monto total debe ser un número`);
      }
      
      if (row['Costo de Envío'] && isNaN(parseFloat(row['Costo de Envío']))) {
        errors.push(`Fila ${index + 2}: El costo de envío debe ser un número`);
      }
    });
    
    return errors;
  }
  static async generateDashboardExport(orders) {
  try {
    // Preparar datos básicos para dashboard
    const data = orders.map((order, index) => ({
      // Información básica del pedido
      'Número de Pedido': order.order_number,
      'ID Externo': order.external_order_id || '',
      'Fecha de Pedido': order.order_date ? new Date(order.order_date).toLocaleDateString('es-CL') : '',
      'Fecha de Creación': new Date(order.created_at).toLocaleDateString('es-CL'),
      
      // Cliente
      'Cliente': order.customer_name,
      'Email': order.customer_email || '',
      'Teléfono': order.customer_phone || '',
      'Documento': order.customer_document || '',
      
      // Dirección
      'Dirección': order.shipping_address,
      'Ciudad': order.shipping_city || '',
      'Comuna': order.shipping_commune || '',
      'Región': order.shipping_state || '',
      'Código Postal': order.shipping_zip || '',
      
      // Estado y seguimiento
      'Estado': this.translateStatus(order.status),
      'Estado Original': order.status,
      'En Shipday': order.shipday_order_id ? 'Sí' : 'No',
      'ID Shipday': order.shipday_order_id || '',
      'Conductor Asignado': order.driver_id || '',
      
      // Costos y montos
      'Monto Total': order.total_amount || 0,
      'Costo de Envío': order.shipping_cost || 0,
      'Subtotal': (order.total_amount || 0) - (order.shipping_cost || 0),
      
      // Fechas importantes
      'Fecha de Entrega': order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('es-CL') : '',
      'Fecha de Recogida': order.pickup_time ? new Date(order.pickup_time).toLocaleDateString('es-CL') : '',
      'Última Actualización': new Date(order.updated_at).toLocaleDateString('es-CL'),
      
      // Empresa y canal
      'Empresa': order.company_id?.name || '',
      'Canal': order.channel_id?.channel_name || '',
      
      // Información adicional
      'Notas': order.notes || '',
      'Prioridad': order.priority || 'Normal',
      'Paquetes': order.load1Packages || 1,
      'Peso (kg)': order.load2WeightKg || 0,
      
      // URLs de seguimiento
      'URL de Tracking': order.shipday_tracking_url || '',
      'Tiene Prueba de Entrega': order.proof_of_delivery ? 'Sí' : 'No'
    }));
    
    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Crear hoja principal con los datos
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar anchos de columna para mejor visualización
    const colWidths = [
      { wch: 18 }, // Número de Pedido
      { wch: 15 }, // ID Externo
      { wch: 12 }, // Fecha de Pedido
      { wch: 12 }, // Fecha de Creación
      { wch: 25 }, // Cliente
      { wch: 25 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 15 }, // Documento
      { wch: 40 }, // Dirección
      { wch: 15 }, // Ciudad
      { wch: 15 }, // Comuna
      { wch: 20 }, // Región
      { wch: 10 }, // Código Postal
      { wch: 15 }, // Estado
      { wch: 15 }, // Estado Original
      { wch: 10 }, // En Shipday
      { wch: 15 }, // ID Shipday
      { wch: 20 }, // Conductor
      { wch: 12 }, // Monto Total
      { wch: 12 }, // Costo Envío
      { wch: 12 }, // Subtotal
      { wch: 12 }, // Fecha Entrega
      { wch: 12 }, // Fecha Recogida
      { wch: 12 }, // Última Actualización
      { wch: 20 }, // Empresa
      { wch: 20 }, // Canal
      { wch: 30 }, // Notas
      { wch: 10 }, // Prioridad
      { wch: 10 }, // Paquetes
      { wch: 10 }, // Peso
      { wch: 30 }, // URL Tracking
      { wch: 15 }  // Tiene Prueba
    ];
    ws['!cols'] = colWidths;
    
    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    
    // Crear hoja de estadísticas
    const stats = this.generateOrdersStats(orders);
    const statsSheet = [
      ['ESTADÍSTICAS DE PEDIDOS'],
      [''],
      ['Total de Pedidos:', orders.length],
      ['Fecha de Exportación:', new Date().toLocaleString('es-CL')],
      [''],
      ['RESUMEN POR ESTADO:'],
      ['Pendientes:', stats.pending],
      ['Listos para Retiro:', stats.ready_for_pickup],
      ['En Bodega:', stats.warehouse_received],
      ['Procesando:', stats.processing],
      ['Enviados:', stats.shipped],
      ['Entregados:', stats.delivered],
      ['Facturados:', stats.invoiced],
      ['Cancelados:', stats.cancelled],
      [''],
      ['RESUMEN FINANCIERO:'],
      ['Monto Total:', `$${stats.totalAmount.toLocaleString('es-CL')}`],
      ['Monto Promedio:', `$${stats.averageAmount.toLocaleString('es-CL')}`],
      ['Costos de Envío:', `$${stats.totalShippingCost.toLocaleString('es-CL')}`],
      [''],
      ['RESUMEN POR EMPRESA:']
    ];
    
    // Agregar estadísticas por empresa
    Object.entries(stats.byCompany).forEach(([company, count]) => {
      statsSheet.push([company + ':', count]);
    });
    
    statsSheet.push(['']);
    statsSheet.push(['RESUMEN POR CANAL:']);
    
    // Agregar estadísticas por canal
    Object.entries(stats.byChannel).forEach(([channel, count]) => {
      statsSheet.push([channel + ':', count]);
    });
    
    const wsStats = XLSX.utils.aoa_to_sheet(statsSheet);
    XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas');
    
    // Generar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return buffer;
  } catch (error) {
    console.error('Error generando Excel para dashboard:', error);
    throw new Error('Error al generar archivo Excel');
  }
}

// Método auxiliar para generar estadísticas
static generateOrdersStats(orders) {
  const stats = {
    pending: 0,
    ready_for_pickup: 0,
    warehouse_received: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalAmount: 0,
    totalShippingCost: 0,
    byCompany: {},
    byChannel: {}
  };
  
  orders.forEach(order => {
    // Contar por estado
    if (stats.hasOwnProperty(order.status)) {
      stats[order.status]++;
    }
    
    // Sumar montos
    stats.totalAmount += order.total_amount || 0;
    stats.totalShippingCost += order.shipping_cost || 0;
    
    // Contar por empresa
    const company = order.company_id?.name || 'Sin Empresa';
    stats.byCompany[company] = (stats.byCompany[company] || 0) + 1;
    
    // Contar por canal
    const channel = order.channel_id?.channel_name || 'Sin Canal';
    stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
  });
  
  stats.averageAmount = orders.length > 0 ? stats.totalAmount / orders.length : 0;
  
  return stats;
}

async generateDriverPaymentReport(ordersData, summary) {
  const workbook = new ExcelJS.Workbook();
  
  // Hoja 1: Resumen
  const summarySheet = workbook.addWorksheet('Resumen');
  
  summarySheet.addRow(['REPORTE DE PAGOS A CONDUCTORES']);
  summarySheet.addRow([`Período: ${summary.period.date_from} al ${summary.period.date_to}`]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Total Conductores:', summary.total_drivers]);
  summarySheet.addRow(['Total Entregas:', summary.total_deliveries]);
  summarySheet.addRow(['Pago por Entrega:', `$${summary.payment_per_delivery}`]);
  summarySheet.addRow(['TOTAL A PAGAR:', `$${summary.total_amount_to_pay.toLocaleString('es-CL')}`]);
  
  // Hoja 2: Detalle por pedido
  const detailSheet = workbook.addWorksheet('Detalle por Pedido');
  
  // Headers
  const headers = ['Conductor', 'N° Pedido', 'Cliente', 'Comuna', 'Fecha Entrega', 'Monto'];
  detailSheet.addRow(headers);
  
  // Estilo para headers
  const headerRow = detailSheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
  
  // Datos
  ordersData.forEach(order => {
    detailSheet.addRow([
      order.Conductor,
      order['N° Pedido'],
      order.Cliente,
      order.Comuna,
      order['Fecha Entrega'],
      `${order.Monto.toLocaleString('es-CL')}`
    ]);
  });
  
  // Ajustar ancho de columnas
  detailSheet.columns = [
    { width: 20 }, // Conductor
    { width: 15 }, // N° Pedido
    { width: 25 }, // Cliente
    { width: 15 }, // Comuna
    { width: 12 }, // Fecha
    { width: 10 }  // Monto
  ];
  
  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
}

module.exports = ExcelService;