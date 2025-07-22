const validateCompanyAccess = (req, res, next) => {
  try {
    const { companyId } = req.params;
    const user = req.user;

    // Admin puede acceder a cualquier empresa
    if (user.role === 'admin') {
      return next();
    }

    // Usuarios de empresa solo pueden acceder a su empresa
    if (user.company_id && user.company_id.toString() === companyId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'No tienes permisos para acceder a los datos de esta empresa'
    });

  } catch (error) {
    console.error('Error en validación de acceso a empresa:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};