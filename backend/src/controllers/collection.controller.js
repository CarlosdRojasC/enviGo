const Company = require('../models/Company');
const User = require('../models/User');
const Notification = require('../models/Notification');
const NotificationService = require('../services/notification.service');

class CollectionController {
  /**
   * Solicitar colecta (para clientes)
   */
  async requestCollection(req, res) {
    try {
      const { packageCount, notes } = req.body;
      const company_id = req.user.company_id;
      
      if (!company_id) {
        return res.status(400).json({ error: 'No se pudo identificar tu empresa' });
      }

      // Obtener datos de la empresa
      const company = await Company.findById(company_id);
      if (!company) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      // Preparar datos de la solicitud
      const collectionData = {
        company_name: company.name,
        company_address: company.address || 'Dirección no disponible',
        company_phone: company.phone || '',
        contact_name: req.user.name,
        package_count: packageCount,
        notes: notes || '',
        requested_by: req.user._id,
        company_id: company_id,
        status: 'pending',
        requested_at: new Date()
      };

      // Enviar notificación por email al admin
      await NotificationService.sendCollectionRequestToAdmin(collectionData);

      // Crear notificación en el sistema para admin
      const adminUsers = await User.find({ role: 'admin' });
      
      for (const admin of adminUsers) {
        await Notification.create({
          user: admin._id,
          title: `Nueva solicitud de colecta`,
          message: `${company.name} solicita colecta de ${packageCount} paquetes`,
          type: 'new_order',
          link: '/admin/collections'
        });
      }

      res.json({
        message: 'Solicitud de colecta enviada exitosamente',
        data: {
          company_name: company.name,
          package_count: packageCount,
          requested_at: collectionData.requested_at
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