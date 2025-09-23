const Company = require('../models/Company');
const User = require('../models/User');
const Notification = require('../models/Notification');
const NotificationService = require('../services/notification.service');
const Pickup = require('../models/Pickup');

class CollectionController {
  /**
   * Solicitar colecta (para clientes)
   */
async requestCollection(req, res) {
    
  try {
    console.log('Datos recibidos:', req.body); // ← Agregar esta línea
  
  const { packageCount, collectionDate, notes } = req.body;
  console.log('collectionDate extraída:', collectionDate); // ← Y esta
    const company_id = req.user.company_id;
    
    if (!company_id) {
      return res.status(400).json({ error: 'No se pudo identificar tu empresa' });
    }

    // Obtener datos de la empresa
    const company = await Company.findById(company_id).select('name address phone');
    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Crear pickup directamente en el sistema
 const pickup = await Pickup.create({
  company_id: company_id,
  manifest_id: tempManifest._id, // Usar el manifiesto temporal
  pickup_address: company.address || 'Dirección a confirmar',
  pickup_commune: 'A definir',
  status: 'pending_assignment',
  total_orders: 0,
  total_packages: packageCount,
  orders_to_pickup: [],
  pickup_type: 'collection_request',
  pickup_name: `Colecta - ${company.name}`, // ← AGREGAR ESTE CAMPO
  pickup_description: `Colecta de ${packageCount} paquetes solicitada para ${new Date(collectionDate).toLocaleDateString('es-CL')}`, // ← Y ESTE
  requested_by: req.user._id,
  notes: notes || '',
  created_at: new Date()
});
// Crear manifiesto temporal para la colecta
const tempManifest = await Manifest.create({
  company_id: company_id,
  manifest_number: `COLECTA-${Date.now()}`, // ← Cambiar prefijo
  manifest_type: 'collection_request',
  status: 'pending',
  total_orders: 0,
  orders: [],
  title: `Colecta ${company.name} - ${new Date(collectionDate).toLocaleDateString('es-CL')}` // ← Agregar título descriptivo
});

    // Preparar datos para notificación
    const notificationData = {
      company_name: company.name,
      company_address: company.address || 'Dirección no disponible',
      company_phone: company.phone || '',
      contact_name: req.user.name,
      package_count: packageCount,
      collection_date: new Date(collectionDate).toLocaleDateString('es-CL'),
      notes: notes || '',
      pickup_id: pickup._id,
      requested_at: new Date().toLocaleString('es-CL')
    };

    // Enviar notificación por email al admin
    await NotificationService.sendCollectionRequestToAdmin(notificationData);

    // Crear notificación en el sistema para admin
    const adminUsers = await User.find({ role: 'admin' });
    
    for (const admin of adminUsers) {
      await Notification.create({
        user: admin._id,
        title: `Nueva solicitud de colecta`,
        message: `${company.name} solicita colecta de ${packageCount} paquetes para el ${new Date(collectionDate).toLocaleDateString('es-CL')}`,
        type: 'new_order',
        link: '/app/admin/pickups'
      });
    }

    res.json({
      message: 'Solicitud de colecta creada exitosamente',
      pickup: {
        id: pickup._id,
        company_name: company.name,
        package_count: packageCount,
        collection_date: collectionDate,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error en solicitud de colecta:', error);
    res.status(500).json({ 
      error: 'Error al procesar solicitud de colecta',
      details: error.message 
    });
  }
}

  /**
   * Obtener solicitudes de colecta (para admin)
   */
  async getCollectionRequests(req, res) {
    try {
      // Por ahora devolver un array vacío, luego podrías crear un modelo Collection
      const requests = [];
      
      res.json({
        requests,
        total: requests.length
      });

    } catch (error) {
      console.error('Error obteniendo solicitudes:', error);
      res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
  }
}

module.exports = new CollectionController();