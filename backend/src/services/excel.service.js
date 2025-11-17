const XLSX = require('xlsx');
const ExcelJS = require('exceljs'); // Necesario para generateDriverPaymentReport

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

  // ✅ MÉTODO MODIFICADO CON EL FORMATO SOLICITADO
  static async generateOrdersExport(orders) {
    try {
      console.log(`📊 Generando Excel personalizado con ${orders.length} pedidos`);

      // Preparar datos para Excel con el formato específico
      const data = orders.map((order) => {
        // Lógica para extraer Dpto/Oficina de la dirección
        let dpto = '';
        const address = order.shipping_address || '';
        // Busca patrones como "Dpto 101", "Of 305", "Casa 2", "#304"
        const dptoMatch = address.match(/(?:dpto|dept|departamento|oficina|of|casa|unit|interior)\.?\s*[:#]?\s*([a-zA-Z0-9-]+)/i);
        if (dptoMatch && dptoMatch[1]) {
          dpto = dptoMatch[1];
        }

        return {
          'Nombre Completo': order.customer_name || '',
          'Telefono': order.customer_phone || '',
          'Correo': order.customer_email || '',
          'Direccion': order.shipping_address || '',
          'Comuna': order.shipping_commune || '',
          'Dpto': dpto, // Extraído automáticamente o vacío
          'Observacion': order.notes || '',
          'Cantidad': 1, // Fijo según requerimiento
          'Valor de la Encomienda': order.total_amount || 0,
          'Tamaño': 'normal', // Valor por defecto
          'Forma de Pago': 'contado', // Valor por defecto
          'Devolución': 'no' // Valor por defecto
        };
      });

      const wb = XLSX.utils.book_new();

      // Crear hoja principal
      const ws = XLSX.utils.json_to_sheet(data);

      // Configurar ancho de columnas para mejor lectura
      ws['!cols'] = [
        { wch: 30 }, // Nombre Completo
        { wch: 15 }, // Telefono
        { wch: 25 }, // Correo
        { wch: 40 }, // Direccion
        { wch: 20 }, // Comuna
        { wch: 10 }, // Dpto
        { wch: 30 }, // Observacion
        { wch: 10 }, // Cantidad
        { wch: 15 }, // Valor de la Encomienda
        { wch: 10 }, // Tamaño
        { wch: 15 }, // Forma de Pago
        { wch: 10 }  // Devolución
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

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
        'Número de Pedido': order.order_number,
        'ID Externo': order.external_order_id || '',
        'Fecha de Pedido': order.order_date ? new Date(order.order_date).toLocaleDateString('es-CL') : '',
        'Fecha de Creación': new Date(order.created_at).toLocaleDateString('es-CL'),
        'Cliente': order.customer_name,
        'Email': order.customer_email || '',
        'Teléfono': order.customer_phone || '',
        'Dirección': order.shipping_address,
        'Ciudad': order.shipping_city || '',
        'Comuna': order.shipping_commune || '',
        'Región': order.shipping_state || '',
        'Estado': this.translateStatus(order.status),
        'Monto Total': order.total_amount || 0,
        'Costo de Envío': order.shipping_cost || 0,
        'Empresa': order.company_id?.name || '',
        'Canal': order.channel_id?.channel_name || '',
        'Notas': order.notes || ''
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
      
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
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
      if (stats.hasOwnProperty(order.status)) {
        stats[order.status]++;
      }
      stats.totalAmount += order.total_amount || 0;
      stats.totalShippingCost += order.shipping_cost || 0;
      
      const company = order.company_id?.name || 'Sin Empresa';
      stats.byCompany[company] = (stats.byCompany[company] || 0) + 1;
      
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
    
    const headers = ['Conductor', 'N° Pedido', 'Cliente', 'Comuna', 'Fecha Entrega', 'Monto'];
    detailSheet.addRow(headers);
    
    const headerRow = detailSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
    
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
    
    detailSheet.columns = [
      { width: 20 }, { width: 15 }, { width: 25 }, { width: 15 }, { width: 12 }, { width: 10 }
    ];
    
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

module.exports = ExcelService;