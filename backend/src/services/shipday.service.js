// backend/src/services/shipday.service.js
const axios = require('axios');
const Order = require('../models/Order');

class ShipdayService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.SHIPDAY_API_KEY;
    this.api = axios.create({
      baseURL: 'https://api.shipday.com/',
      headers: {
        'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Crea un pedido en Shipday y lo asigna a un conductor.
   * @param {object} orderData - Los datos del pedido de tu base de datos.
   * @param {string} driverId - El ID del conductor de Shipday.
   * @returns {Promise<object>} - La respuesta de la API de Shipday.
   */
  async createAndAssignOrder(orderData, driverId) {
    try {
      const payload = {
        orderNumber: orderData.order_number,
        customerName: orderData.customer_name,
        customerEmail: orderData.customer_email,
        customerPhoneNumber: orderData.customer_phone,
        deliveryAddress: {
          address: orderData.shipping_address,
          city: orderData.shipping_city,
          state: orderData.shipping_state,
          zip: orderData.shipping_zip
        },
        // Puedes añadir más detalles si los tienes
        // restaurantName: "Tu Empresa",
        // restaurantAddress: "Dirección de recogida",
        // deliveryTime: "YYYY-MM-DDTHH:mm:ssZ"
        assignedTo: driverId
      };

      console.log('Enviando pedido a Shipday:', payload);
      const response = await this.api.post('/orders', payload);

      // Actualizar nuestro pedido con los datos de Shipday
      const updatedOrder = await Order.findByIdAndUpdate(
        orderData._id,
        {
          $set: {
            shipday_order_id: response.data.orderId,
            shipday_driver_id: driverId,
            tracking_link: response.data.trackingLink,
            delivery_status: 'assigned', // Estado inicial tras la asignación
            updated_at: new Date()
          }
        },
        { new: true }
      );

      console.log(`Pedido ${orderData.order_number} creado en Shipday y asignado a driver ${driverId}.`);
      return { success: true, shipdayOrder: response.data, order: updatedOrder };

    } catch (error) {
      console.error('Error creando pedido en Shipday:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Error al conectar con Shipday.');
    }
  }

  /**
   * Procesa un evento de webhook de Shipday.
   * @param {object} webhookData - El cuerpo del webhook recibido.
   */
  async processWebhook(webhookData) {
    const { orderId, eventType, orderState, proofOfDelivery } = webhookData;

    console.log(`Webhook recibido de Shipday: OrderID ${orderId}, Evento ${eventType}`);

    const order = await Order.findOne({ shipday_order_id: orderId });
    if (!order) {
      console.warn(`Pedido con Shipday ID ${orderId} no encontrado en la base de datos.`);
      return { success: false, message: 'Pedido no encontrado.' };
    }

    const updateData = {
      delivery_status: orderState.toLowerCase().replace(/ /g, '_'), // ej. "On The Way" -> "on_the_way"
      updated_at: new Date()
    };

    // Si es un evento de entrega, guardar la prueba.
    if (eventType === 'delivered' && proofOfDelivery) {
      updateData.proof_of_delivery = {
        photo_url: proofOfDelivery.photo,
        signature_url: proofOfDelivery.signature,
        notes: proofOfDelivery.notes,
        location: {
          type: 'Point',
          coordinates: [proofOfDelivery.location.longitude, proofOfDelivery.location.latitude]
        }
      };
      // Opcional: Actualizar también tu estado principal
      updateData.status = 'delivered';
      updateData.delivery_date = new Date();
    }
    
    if (eventType === 'failed_delivery') {
      updateData.status = 'cancelled'; // O un estado personalizado como 'failed_delivery'
    }

    await Order.updateOne({ _id: order._id }, { $set: updateData });

    console.log(`Pedido ${order.order_number} actualizado por webhook. Nuevo estado: ${updateData.delivery_status}`);
    return { success: true, message: 'Webhook procesado.' };
  }
   /**
   * Crea un conductor en Shipday.
   * @param {object} driverInfo - Información del conductor (name, email, phone).
   * @returns {Promise<object>} - La respuesta de la API de Shipday con los datos del conductor creado.
   */
  async createDriver(driverInfo) {
    try {
      const payload = {
        name: driverInfo.name,
        email: driverInfo.email,
        phoneNumber: driverInfo.phone
        // Shipday podría permitir más campos como 'teamId', etc.
      };

      console.log('Creando conductor en Shipday:', payload);
      const response = await this.api.post('/drivers', payload);

      console.log('Conductor creado en Shipday exitosamente:', response.data);
      return response.data; // Devuelve el objeto del conductor creado

    } catch (error) {
      console.error('Error creando conductor en Shipday:', error.response?.data || error.message);
      // Extraer un mensaje de error más claro si está disponible
      const errorMessage = error.response?.data?.message || 'Error al crear conductor en Shipday.';
      throw new Error(errorMessage);
    }
  }
}

// Exportar una instancia para usarla como singleton
module.exports = new ShipdayService(process.env.SHIPDAY_API_KEY);