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
    const { packageCount, collectionDate, notes } = req.body;
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
      pickup_address: company.address || 'Dirección a confirmar',
      pickup_commune: 'A definir', // Podrías extraer de company.address
      pickup_date: new Date(collectionDate),
      estimated_packages: packageCount,
      notes: notes || '',
      status: 'pending',
      pickup_type: 'collection_request', // Nuevo campo para distinguir
      requested_by: req.user._id,
      created_at: new Date()
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