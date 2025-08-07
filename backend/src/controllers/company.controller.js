const bcrypt = require('bcrypt');
const { ERRORS } = require('../config/constants');
const Company = require('../models/Company');
const User = require('../models/User');
const Order = require('../models/Order');
const Channel = require('../models/Channel'); // si no existe, crea uno básico

class CompanyController {
  // Listar todas las empresas (admin)
  async getAll(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      // Traer todas las empresas
      const companies = await Company.find({}).lean();

      // Para cada empresa obtenemos los conteos (channels activos, orders y usuarios activos)
      const companiesWithCounts = await Promise.all(
        companies.map(async (company) => {
          const channels_count = await Channel.countDocuments({ company_id: company._id, is_active: true });
          const orders_count = await Order.countDocuments({ company_id: company._id });
          const users_count = await User.countDocuments({ company_id: company._id, is_active: true });

          return {
            ...company,
            channels_count,
            orders_count,
            users_count
          };
        })
      );

      res.json(companiesWithCounts);
    } catch (error) {
      console.error('Error obteniendo empresas:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Obtener una empresa específica
  async getById(req, res) {
    try {
      const { id } = req.params;

      const company = await Company.findById(id).lean();
      if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== id) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      // Conteos
      const channels_count = await Channel.countDocuments({ company_id: id, is_active: true });
      const orders_count = await Order.countDocuments({ company_id: id });
      const users_count = await User.countDocuments({ company_id: id, is_active: true });

      res.json({
        ...company,
        channels_count,
        orders_count,
        users_count
      });
    } catch (error) {
      console.error('Error obteniendo empresa:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Crear nueva empresa (admin)
  async create(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      const {
        name,
        email,
        contact_email,
        phone,
        address,
        price_per_order,
        owner_email,
        owner_name,
        owner_password
      } = req.body;

      // Definir finalEmail (usa email o contact_email)
const finalEmail = email || contact_email;

if (!name || !finalEmail) {
  return res.status(400).json({ error: 'El nombre y el email de la empresa son obligatorios' });
}

      // Generar slug
      const slug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .substring(0, 100);

            
      // Validar si ya existe empresa con mismo email o slug
      const exists = await Company.findOne({ $or: [{ email: finalEmail }, { slug }] });
      if (exists) {
        return res.status(400).json({ error: 'Ya existe una empresa con ese nombre o email' });
      }

        // Crear empresa
      const company = new Company({
        name,
        slug,
        email: finalEmail,
        phone,
        address,
        price_per_order: price_per_order || 0
      });
      await company.save();



      // Crear usuario dueño si datos completos
      if (owner_email && owner_password) {
        const password_hash = await bcrypt.hash(owner_password, 10);
        const user = new User({
          company_id: company._id,
          email: owner_email,
          password_hash,
          full_name: owner_name || name,
          role: 'company_owner',
          is_active: true
        });
        await user.save();
      }

      res.status(201).json({
        message: 'Empresa creada exitosamente',
        company
      });
    } catch (error) {
      console.error('Error creando empresa:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Actualizar empresa
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const company = await Company.findById(id);
      if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== id) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      Object.assign(company, updates);
      company.updated_at = new Date();

      await company.save();

      res.json(company);
    } catch (error) {
      console.error('Error actualizando empresa:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Actualizar precio por pedido (admin)
  async updatePrice(req, res) {
    try {
      const { id } = req.params;
      const { price_per_order } = req.body;

      if (price_per_order < 0) {
        return res.status(400).json({ error: 'El precio no puede ser negativo' });
      }

      const company = await Company.findById(id);
      if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      company.price_per_order = price_per_order;
      company.updated_at = new Date();
      await company.save();

      res.json({
        message: 'Precio actualizado exitosamente',
        company
      });
    } catch (error) {
      console.error('Error actualizando precio:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Obtener usuarios de una empresa
  async getUsers(req, res) {
    try {
      const { id } = req.params;

      if (req.user.role !== 'admin' && req.user.company_id.toString() !== id) {
        return res.status(403).json({ error: ERRORS.FORBIDDEN });
      }

      const users = await User.find({ company_id: id }).select('id email full_name role is_active last_login created_at').sort('full_name');

      res.json(users);
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({ error: ERRORS.SERVER_ERROR });
    }
  }

  // Estadísticas de la empresa
async getStats(req, res) {
  try {
    const { id } = req.params;
    
    if (req.user.role !== 'admin' && req.user.company_id.toString() !== id) {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }

    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

    // Calcular estadísticas
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      ordersTotal,
      ordersThisMonth,
      ordersLastMonth,
      deliveredOrders,
      usersCount,
      channelsCount
    ] = await Promise.all([
      Order.countDocuments({ company_id: id }),
      Order.countDocuments({ company_id: id, order_date: { $gte: thisMonth } }),
      Order.countDocuments({ company_id: id, order_date: { $gte: lastMonth, $lt: thisMonth } }),
      Order.countDocuments({ company_id: id, status: 'delivered' }),
      User.countDocuments({ company_id: id, is_active: true }),
      Channel.countDocuments({ company_id: id, is_active: true })
    ]);

    // Calcular revenue
    const revenueThisMonth = ordersThisMonth * (company.price_per_order || 0);
    const revenueTotal = ordersTotal * (company.price_per_order || 0);

    const stats = {
      orders_total: ordersTotal,
      orders_this_month: ordersThisMonth,
      orders_last_month: ordersLastMonth,
      delivered_orders: deliveredOrders,
      revenue_this_month: Math.round(revenueThisMonth * 1.19), // Con IVA
      revenue_total: Math.round(revenueTotal * 1.19),
      users_count: usersCount,
      channels_count: channelsCount,
      delivery_rate: ordersTotal > 0 ? Math.round((deliveredOrders / ordersTotal) * 100) : 0,
      growth_rate: ordersLastMonth > 0 ? Math.round(((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100) : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: ERRORS.SERVER_ERROR });
  }
}
async uploadLogo(req, res) {
  try {
    const companyId = req.params.id;
    const logo_url = req.file.path;

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      { logo_url },
      { new: true }
    );

    res.json({ success: true, company: updatedCompany });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
}

module.exports = new CompanyController();
