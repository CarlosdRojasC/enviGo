const Order = require('../models/Order');
const Company = require('../models/Company');

/**
 * @desc    Realiza una búsqueda global
 * @route   GET /api/search/global
 * @access  Private
 */
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const searchRegex = new RegExp(q, 'i');
    const userCompanyId = req.user.company_id;
    const isAdmin = req.user.role === 'admin';

    // Construir filtros base
    const orderFilter = {
      $or: [
        { order_number: searchRegex },
        { customer_name: searchRegex }
      ]
    };
    const companyFilter = { name: searchRegex };

    // Aplicar filtro de compañía si no es admin
    if (!isAdmin) {
      orderFilter.company_id = userCompanyId;
      companyFilter._id = userCompanyId;
    }

    // Realizar búsquedas en paralelo
    const [foundOrders, foundCompanies] = await Promise.all([
      Order.find(orderFilter).limit(5).lean(),
      isAdmin ? Company.find(companyFilter).limit(5).lean() : Promise.resolve([]) // Solo admin busca empresas
    ]);

    // Formatear resultados para el frontend
    const results = [
      ...foundOrders.map(order => ({
        id: order._id,
        type: 'orders',
        icon: '📦',
        title: `Pedido #${order.order_number}`,
        subtitle: `Cliente: ${order.customer_name}`,
        route: `/app/orders?search=${order.order_number}`
      })),
      ...foundCompanies.map(company => ({
        id: company._id,
        type: 'companies',
        icon: '🏢',
        title: company.name,
        subtitle: `Empresa`,
        route: `/app/admin/companies?search=${company.name}`
      }))
    ];

    res.json({ results });

  } catch (error) {
    console.error('Error en la búsqueda global:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}