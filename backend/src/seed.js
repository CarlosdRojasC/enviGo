require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Modelos (crea tus modelos si no están)
const CompanySchema = new mongoose.Schema({
  name: String,
  slug: String,
  price_per_order: Number,
  is_active: Boolean
});
const UserSchema = new mongoose.Schema({
  email: String,
  password_hash: String,
  full_name: String,
  role: String,
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  is_active: Boolean,
  last_login: Date
});

const Company = mongoose.model('Company', CompanySchema);
const User = mongoose.model('User', UserSchema);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB');

    // Limpia datos previos (opcional)
    await Company.deleteMany({});
    await User.deleteMany({});

    // Crear empresa
    const company = new Company({
      name: "Liquo",
      slug: "liquo",
      price_per_order: 1000,
      is_active: true
    });
    await company.save();
    console.log('Empresa creada:', company);

    // Crear usuario admin
    const password = 'admin1234';
    const password_hash = await bcrypt.hash(password, 10);

    const user = new User({
      email: 'admin@liquo.com',
      password_hash,
      full_name: 'Admin Liquo',
      role: 'admin',
      company_id: company._id,
      is_active: true,
      last_login: new Date()
    });
    await user.save();
    console.log('Usuario admin creado:', user);

    process.exit(0);
  } catch (error) {
    console.error('Error en seed:', error);
    process.exit(1);
  }
}

seed();
