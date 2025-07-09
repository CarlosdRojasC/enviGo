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

  // Generar Excel para OptiRoute
  static async generateOptiRouteExport(orders) {
    try {
      // Preparar datos para OptiRoute
      const data = orders.map((order, index) => ({
          'Order ID': order.order_number,
        'Customer Name': order.customer_name,
        'Phone': order.customer_phone || '',
        'Email': order.customer_email || '',
        'Address': order.shipping_address,
        'City': order.shipping_city,
        'State': order.shipping_state || '',
        'Zip Code': order.shipping_zip || '',
        'Notes': order.notes || '',
        // --- USANDO LOS NUEVOS CAMPOS DEL MODELO ---
        'Priority': order.priority,
        'Service Time': order.serviceTime,
        'Time Window Start': order.timeWindowStart,
        'Time Window End': order.timeWindowEnd,
        'Skills Required': '', // Puedes añadir este campo al modelo si lo necesitas
        'Vehicle Type': 'Any', // Puedes añadir este campo al modelo si lo necesitas
        'Load 1 (Packages)': order.load1Packages,
        'Load 2 (Weight kg)': order.load2WeightKg,
        'Revenue': order.total_amount || 0, // El valor de la venta
        'Company': order.company_id.name || '',
        'Channel': order.channel_id.channel_name || ''
      }));
      
      // Crear libro de Excel
      const wb = XLSX.utils.book_new();
      
      // Crear hoja con los datos
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Ajustar anchos de columna
      const colWidths = [
        { wch: 15 }, // Order ID
        { wch: 25 }, // Customer Name
        { wch: 15 }, // Phone
        { wch: 25 }, // Email
        { wch: 40 }, // Address
        { wch: 20 }, // City
        { wch: 15 }, // State
        { wch: 10 }, // Zip Code
        { wch: 30 }, // Notes
        { wch: 10 }, // Priority
        { wch: 12 }, // Service Time
        { wch: 15 }, // Time Window Start
        { wch: 15 }, // Time Window End
        { wch: 15 }, // Skills Required
        { wch: 12 }, // Vehicle Type
        { wch: 15 }, // Load 1
        { wch: 15 }, // Load 2
        { wch: 12 }, // Revenue
        { wch: 20 }, // Company
        { wch: 20 }  // Channel
      ];
      ws['!cols'] = colWidths;
      
      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      
      // Crear hoja de resumen
      const summary = [
        ['Resumen de Exportación'],
        [''],
        ['Total de Pedidos:', orders.length],
        ['Fecha de Exportación:', new Date().toLocaleString()],
        [''],
        ['Pedidos por Ciudad:']
      ];
      
      // Contar pedidos por ciudad
      const cityCounts = {};
      orders.forEach(order => {
        const city = order.shipping_city || 'Sin Ciudad';
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      });
      
      Object.entries(cityCounts).forEach(([city, count]) => {
        summary.push([city + ':', count]);
      });
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
      
      // Generar buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      return buffer;
    } catch (error) {
      console.error('Error generando Excel:', error);
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
}

module.exports = ExcelService;