const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');
const { ERRORS } = require('../config/constants');

class DriverController {
  /**
   * 🔍 Obtener todos los conductores (solo admin)
   */
  async getAllDrivers(req, res) {
    try {
      if (req.user.role !== 'admin')
        return res.status(403).json({ success: false, message: ERRORS.FORBIDDEN });

      const drivers = await Driver.find()
        .select('_id full_name email phone vehicle_type company_id is_active home_address createdAt')
        .sort({ full_name: 1 });

      res.status(200).json({
        success: true,
        total: drivers.length,
        data: drivers,
      });
    } catch (error) {
      console.error('❌ Error al obtener conductores:', error);
      res.status(500).json({ success: false, message: 'Error interno al obtener conductores' });
    }
  }

  /**
   * 🧍 Crear un nuevo conductor (solo admin)
   */
  async createDriver(req, res) {
    try {
      if (req.user.role !== 'admin')
        return res.status(403).json({ success: false, message: ERRORS.FORBIDDEN });

      const {
        full_name,
        email,
        phone,
        home_address,
        home_latitude,
        home_longitude,
        vehicle_type,
        company_id,
        password,
      } = req.body;

      if (!full_name || !email || !password)
        return res.status(400).json({
          success: false,
          message: 'Nombre, correo y contraseña son obligatorios.',
        });

      const existing = await Driver.findOne({ email: email.toLowerCase() });
      if (existing)
        return res.status(400).json({ success: false, message: 'El correo ya está registrado.' });

      const hashedPassword = await bcrypt.hash(password, 10);

      const driver = new Driver({
        full_name,
        email: email.toLowerCase(),
        phone,
        home_address,
        home_latitude,
        home_longitude,
        vehicle_type,
        company_id,
        password: hashedPassword,
        is_active: true,
      });

      await driver.save();

      res.status(201).json({
        success: true,
        message: 'Conductor creado correctamente.',
        data: {
          id: driver._id,
          full_name: driver.full_name,
          email: driver.email,
          phone: driver.phone,
          home_address: driver.home_address,
        },
      });
    } catch (error) {
      console.error('❌ Error creando conductor:', error);
      res.status(500).json({ success: false, message: 'Error interno al crear conductor' });
    }
  }

  /**
   * 🧠 Login de conductor (email + password)
   */
  async loginDriver(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password)
        return res.status(400).json({
          success: false,
          message: 'Debe ingresar correo y contraseña',
        });

      const driver = await Driver.findOne({ email: email.toLowerCase(), is_active: true }).select('+password');

      if (!driver)
        return res.status(404).json({ success: false, message: 'Conductor no encontrado o inactivo' });

      const match = await bcrypt.compare(password, driver.password);
      if (!match)
        return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });

      const token = jwt.sign(
        { id: driver._id, role: 'driver' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        token,
        driver: {
          id: driver._id,
          full_name: driver.full_name,
          email: driver.email,
          phone: driver.phone,
          home_address: driver.home_address,
        },
      });
    } catch (error) {
      console.error('❌ Error en login de conductor:', error);
      res.status(500).json({ success: false, message: 'Error interno en login' });
    }
  }

  /**
   * ✏️ Actualizar conductor (solo admin)
   */
  async updateDriver(req, res) {
    try {
      if (req.user.role !== 'admin')
        return res.status(403).json({ success: false, message: ERRORS.FORBIDDEN });

      const { driverId } = req.params;
      const updates = req.body;

      const driver = await Driver.findById(driverId);
      if (!driver)
        return res.status(404).json({ success: false, message: 'Conductor no encontrado' });

      if (updates.email && updates.email !== driver.email) {
        const exists = await Driver.findOne({ email: updates.email });
        if (exists)
          return res.status(400).json({ success: false, message: 'El correo ya está en uso' });
      }

      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      Object.assign(driver, updates);
      await driver.save();

      res.json({
        success: true,
        message: 'Conductor actualizado correctamente',
        data: driver,
      });
    } catch (error) {
      console.error('❌ Error actualizando conductor:', error);
      res.status(500).json({ success: false, message: 'Error interno al actualizar conductor' });
    }
  }

  /**
   * ❌ Eliminar conductor (solo admin)
   */
  async deleteDriver(req, res) {
    try {
      if (req.user.role !== 'admin')
        return res.status(403).json({ success: false, message: ERRORS.FORBIDDEN });

      const { driverId } = req.params;
      const driver = await Driver.findByIdAndDelete(driverId);

      if (!driver)
        return res.status(404).json({ success: false, message: 'Conductor no encontrado' });

      res.json({ success: true, message: 'Conductor eliminado correctamente' });
    } catch (error) {
      console.error('❌ Error eliminando conductor:', error);
      res.status(500).json({ success: false, message: 'Error interno al eliminar conductor' });
    }
  }

  /**
   * 🔐 Reiniciar contraseña de conductor (solo admin)
   */
  async resetPassword(req, res) {
    try {
      if (req.user.role !== 'admin')
        return res.status(403).json({ success: false, message: ERRORS.FORBIDDEN });

      const { driverId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6)
        return res.status(400).json({ success: false, message: 'Contraseña demasiado corta' });

      const driver = await Driver.findById(driverId);
      if (!driver)
        return res.status(404).json({ success: false, message: 'Conductor no encontrado' });

      driver.password = await bcrypt.hash(newPassword, 10);
      await driver.save();

      res.json({
        success: true,
        message: `Contraseña del conductor ${driver.full_name} actualizada correctamente.`,
      });
    } catch (error) {
      console.error('❌ Error reseteando contraseña:', error);
      res.status(500).json({ success: false, message: 'Error interno al resetear contraseña' });
    }
  }

  /**
   * ⚙️ Activar / desactivar conductor
   */
  async toggleStatus(req, res) {
    try {
      if (req.user.role !== 'admin')
        return res.status(403).json({ success: false, message: ERRORS.FORBIDDEN });

      const { driverId } = req.params;
      const driver = await Driver.findById(driverId);

      if (!driver)
        return res.status(404).json({ success: false, message: 'Conductor no encontrado' });

      driver.is_active = !driver.is_active;
      await driver.save();

      res.json({
        success: true,
        message: `Conductor ${driver.is_active ? 'activado' : 'desactivado'} correctamente.`,
      });
    } catch (error) {
      console.error('❌ Error cambiando estado de conductor:', error);
      res.status(500).json({ success: false, message: 'Error interno al cambiar estado' });
    }
  }
}

module.exports = new DriverController();
