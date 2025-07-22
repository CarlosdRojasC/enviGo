<template>
  <div class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-content driver-form-modal" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <div class="header-content">
          <h2 class="modal-title">
            <i :class="isEditing ? 'icon-edit' : 'icon-plus'"></i>
            {{ isEditing ? 'Editar Conductor' : 'Nuevo Conductor' }}
          </h2>
          <p class="modal-subtitle">
            {{ isEditing ? 'Actualiza la información del conductor' : 'Completa los datos para agregar un nuevo conductor' }}
          </p>
        </div>
        <button @click="$emit('cancel')" class="btn-close">
          <i class="icon-x"></i>
        </button>
      </div>

      <!-- Progress Indicator -->
      <div class="form-progress">
        <div class="progress-steps">
          <div 
            v-for="(step, index) in formSteps" 
            :key="index"
            class="progress-step"
            :class="{ 
              active: currentStep === index, 
              completed: currentStep > index,
              error: hasStepErrors(index)
            }"
            @click="goToStep(index)"
          >
            <div class="step-indicator">
              <div class="step-number" v-if="!hasStepErrors(index) || currentStep <= index">
                {{ index + 1 }}
              </div>
              <i v-else class="icon-alert-circle step-error"></i>
            </div>
            <div class="step-info">
              <div class="step-label">{{ step.label }}</div>
              <div class="step-description">{{ step.description }}</div>
            </div>
          </div>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${((currentStep + 1) / formSteps.length) * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="handleSubmit" class="driver-form">
        <!-- Step 1: Información Personal -->
        <div v-show="currentStep === 0" class="form-step" data-step="personal">
          <div class="step-header">
            <div class="step-icon">👤</div>
            <div class="step-content">
              <h3>Información Personal</h3>
              <p>Datos básicos del conductor para identificación y contacto</p>
            </div>
          </div>

          <div class="form-grid">
            <!-- Foto del conductor -->
            <div class="form-group photo-upload">
              <label>Foto del Conductor</label>
              <div class="photo-uploader">
                <div class="photo-preview" :class="{ 'has-photo': form.photo }">
                  <img v-if="form.photo" :src="form.photo" alt="Foto del conductor" />
                  <div v-else class="photo-placeholder">
                    <i class="icon-camera"></i>
                    <span>{{ getInitials(form.name) || 'CN' }}</span>
                  </div>
                  <div class="photo-overlay">
                    <button type="button" @click="triggerPhotoUpload" class="btn-photo">
                      <i class="icon-upload"></i>
                    </button>
                    <button v-if="form.photo" type="button" @click="removePhoto" class="btn-photo remove">
                      <i class="icon-trash"></i>
                    </button>
                  </div>
                </div>
                <input 
                  ref="photoInput"
                  type="file" 
                  accept="image/*" 
                  @change="handlePhotoUpload"
                  style="display: none"
                />
                <p class="photo-help">JPG, PNG o GIF. Máximo 2MB.</p>
              </div>
            </div>

            <!-- Información básica -->
            <div class="form-group">
              <label for="name" class="required">Nombre Completo</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                :class="{ error: errors.name }"
                placeholder="Ej: Juan Carlos Pérez González"
                required
                autocomplete="name"
                @blur="validateField('name')"
              />
              <span v-if="errors.name" class="error-message">
                <i class="icon-alert-circle"></i>
                {{ errors.name }}
              </span>
            </div>

            <div class="form-group">
              <label for="email" class="required">Email</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                :class="{ error: errors.email }"
                placeholder="juan.perez@ejemplo.com"
                required
                :disabled="isEditing"
                autocomplete="email"
                @blur="validateField('email')"
              />
              <span v-if="errors.email" class="error-message">
                <i class="icon-alert-circle"></i>
                {{ errors.email }}
              </span>
              <span v-if="isEditing" class="help-text">
                <i class="icon-info"></i>
                El email no se puede cambiar una vez creado el conductor
              </span>
            </div>

            <div class="form-group">
              <label for="phone" class="required">Teléfono</label>
              <div class="phone-input-group">
                <select v-model="form.countryCode" class="country-select">
                  <option value="+56">🇨🇱 +56</option>
                  <option value="+54">🇦🇷 +54</option>
                  <option value="+51">🇵🇪 +51</option>
                  <option value="+57">🇨🇴 +57</option>
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+55">🇧🇷 +55</option>
                </select>
                <input
                  id="phone"
                  v-model="form.phone"
                  type="tel"
                  :class="{ error: errors.phone }"
                  placeholder="9 1234 5678"
                  required
                  autocomplete="tel"
                  @blur="validateField('phone')"
                  @input="formatPhoneNumber"
                />
              </div>
              <span v-if="errors.phone" class="error-message">
                <i class="icon-alert-circle"></i>
                {{ errors.phone }}
              </span>
            </div>

            <div class="form-group">
              <label for="dni">RUT/DNI/Cédula</label>
              <input
                id="dni"
                v-model="form.dni"
                type="text"
                :class="{ error: errors.dni }"
                placeholder="12.345.678-9"
                autocomplete="off"
                @blur="validateField('dni')"
                @input="formatDNI"
              />
              <span v-if="errors.dni" class="error-message">
                <i class="icon-alert-circle"></i>
                {{ errors.dni }}
              </span>
            </div>

            <div class="form-group">
              <label for="birthDate">Fecha de Nacimiento</label>
              <input
                id="birthDate"
                v-model="form.birthDate"
                type="date"
                :max="maxBirthDate"
                :class="{ warning: isUnderAge }"
              />
              <span v-if="isUnderAge" class="warning-message">
                <i class="icon-alert-triangle"></i>
                El conductor debe ser mayor de 18 años
              </span>
            </div>

            <div class="form-group full-width">
              <label for="address">Dirección</label>
              <input
                id="address"
                v-model="form.address"
                type="text"
                placeholder="Av. Providencia 1234, Providencia, Santiago"
                autocomplete="street-address"
              />
              <div class="address-suggestions" v-if="addressSuggestions.length > 0">
                <div 
                  v-for="suggestion in addressSuggestions" 
                  :key="suggestion.id"
                  class="suggestion-item"
                  @click="selectAddressSuggestion(suggestion)"
                >
                  <i class="icon-map-pin"></i>
                  {{ suggestion.address }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Información del Vehículo -->
        <div v-show="currentStep === 1" class="form-step" data-step="vehicle">
          <div class="step-header">
            <div class="step-icon">🚗</div>
            <div class="step-content">
              <h3>Información del Vehículo</h3>
              <p>Detalles del vehículo que utilizará para las entregas</p>
            </div>
          </div>

          <div class="form-grid">
            <!-- Selector de tipo de vehículo -->
            <div class="form-group full-width">
              <label class="required">Tipo de Vehículo</label>
              <div class="vehicle-selector">
                <div 
                  v-for="vehicle in vehicleTypes" 
                  :key="vehicle.value"
                  class="vehicle-option"
                  :class="{ 
                    selected: form.vehicleType === vehicle.value,
                    recommended: vehicle.recommended 
                  }"
                  @click="selectVehicleType(vehicle.value)"
                >
                  <div class="vehicle-visual">
                    <div class="vehicle-icon">{{ vehicle.icon }}</div>
                    <div v-if="vehicle.recommended" class="recommended-badge">
                      <i class="icon-star"></i>
                      Recomendado
                    </div>
                  </div>
                  <div class="vehicle-info">
                    <div class="vehicle-name">{{ vehicle.label }}</div>
                    <div class="vehicle-description">{{ vehicle.description }}</div>
                    <div class="vehicle-specs">
                      <span class="spec">{{ vehicle.capacity }}</span>
                      <span class="spec">{{ vehicle.range }}</span>
                    </div>
                  </div>
                  <div class="vehicle-selection">
                    <div class="selection-indicator">
                      <i class="icon-check"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detalles del vehículo -->
            <div class="form-group">
              <label for="vehiclePlate">Patente/Placa</label>
              <input
                id="vehiclePlate"
                v-model="form.vehiclePlate"
                type="text"
                placeholder="ABCD-12"
                style="text-transform: uppercase"
                @input="formatVehiclePlate"
                @blur="validateVehiclePlate"
              />
              <span v-if="plateValidation.message" :class="plateValidation.type + '-message'">
                <i :class="plateValidation.type === 'error' ? 'icon-alert-circle' : 'icon-check-circle'"></i>
                {{ plateValidation.message }}
              </span>
            </div>

            <div class="form-group">
              <label for="vehicleBrand">Marca</label>
              <select id="vehicleBrand" v-model="form.vehicleBrand">
                <option value="">Seleccionar marca...</option>
                <optgroup v-for="category in vehicleBrands" :key="category.type" :label="category.type">
                  <option v-for="brand in category.brands" :key="brand" :value="brand">
                    {{ brand }}
                  </option>
                </optgroup>
              </select>
            </div>

            <div class="form-group">
              <label for="vehicleModel">Modelo</label>
              <input
                id="vehicleModel"
                v-model="form.vehicleModel"
                type="text"
                placeholder="Corolla, Civic, MT-15..."
              />
            </div>

            <div class="form-group">
              <label for="vehicleYear">Año</label>
              <select id="vehicleYear" v-model="form.vehicleYear">
                <option value="">Seleccionar año...</option>
                <option v-for="year in vehicleYears" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="vehicleColor">Color</label>
              <div class="color-input-group">
                <input
                  id="vehicleColor"
                  v-model="form.vehicleColor"
                  type="text"
                  placeholder="Blanco, Negro, Azul..."
                  list="common-colors"
                />
                <datalist id="common-colors">
                  <option value="Blanco"/>
                  <option value="Negro"/>
                  <option value="Gris"/>
                  <option value="Azul"/>
                  <option value="Rojo"/>
                  <option value="Verde"/>
                  <option value="Amarillo"/>
                  <option value="Plata"/>
                  
                </datalist>
              </div>
            </div>

            <!-- Características adicionales -->
            <div class="form-group full-width">
              <label>Características del Vehículo</label>
              <div class="checkbox-grid">
                <label class="checkbox-item">
                  <input v-model="form.features.hasInsurance" type="checkbox" />
                  <span class="checkmark"></span>
                  <div class="checkbox-content">
                    <span class="checkbox-title">Seguro Vigente</span>
                    <span class="checkbox-subtitle">Requerido para entregas comerciales</span>
                  </div>
                </label>

                <label class="checkbox-item">
                  <input v-model="form.features.hasGPS" type="checkbox" />
                  <span class="checkmark"></span>
                  <div class="checkbox-content">
                    <span class="checkbox-title">GPS Integrado</span>
                    <span class="checkbox-subtitle">Para seguimiento en tiempo real</span>
                  </div>
                </label>

                <label class="checkbox-item">
                  <input v-model="form.features.hasCooling" type="checkbox" />
                  <span class="checkmark"></span>
                  <div class="checkbox-content">
                    <span class="checkbox-title">Sistema de Refrigeración</span>
                    <span class="checkbox-subtitle">Para productos que requieren frío</span>
                  </div>
                </label>

                <label class="checkbox-item">
                  <input v-model="form.features.isEcological" type="checkbox" />
                  <span class="checkmark"></span>
                  <div class="checkbox-content">
                    <span class="checkbox-title">Vehículo Ecológico</span>
                    <span class="checkbox-subtitle">Eléctrico o híbrido</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Documentación -->
        <div v-show="currentStep === 2" class="form-step" data-step="documents">
          <div class="step-header">
            <div class="step-icon">📄</div>
            <div class="step-content">
              <h3>Documentación</h3>
              <p>Licencias y documentos requeridos para operar</p>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="driverLicense" class="required">Número de Licencia</label>
              <input
                id="driverLicense"
                v-model="form.driverLicense"
                type="text"
                :class="{ error: errors.driverLicense }"
                placeholder="12345678"
                required
                @blur="validateField('driverLicense')"
              />
              <span v-if="errors.driverLicense" class="error-message">
                <i class="icon-alert-circle"></i>
                {{ errors.driverLicense }}
              </span>
            </div>

            <div class="form-group">
              <label for="licenseType">Clase de Licencia</label>
              <select id="licenseType" v-model="form.licenseType">
                <option value="B">Clase B - Automóviles particulares</option>
                <option value="A2">Clase A2 - Motocicletas hasta 400cc</option>
                <option value="A3">Clase A3 - Motocicletas hasta 125cc</option>
                <option value="A4">Clase A4 - Motocicletas hasta 50cc</option>
                <option value="C">Clase C - Camiones hasta 3.5 ton</option>
                <option value="D">Clase D - Transporte de pasajeros</option>
              </select>
            </div>

            <div class="form-group">
              <label for="licenseExpiry">Vencimiento de Licencia</label>
              <input
                id="licenseExpiry"
                v-model="form.licenseExpiry"
                type="date"
                :min="today"
                :class="{ warning: isLicenseExpiringSoon }"
              />
              <span v-if="isLicenseExpiringSoon" class="warning-message">
                <i class="icon-alert-triangle"></i>
                Licencia próxima a vencer en {{ daysUntilExpiry }} días
              </span>
            </div>

            <div class="form-group">
              <label for="emergencyContact">Contacto de Emergencia</label>
              <input
                id="emergencyContact"
                v-model="form.emergencyContact"
                type="text"
                placeholder="Nombre: María Pérez, Teléfono: +56 9 8765 4321"
              />
            </div>

            <!-- Upload Documents -->
            <div class="form-group full-width">
              <label>Documentos</label>
              <div class="documents-upload">
                <div class="upload-grid">
                  <div class="upload-item">
                    <div class="upload-area" :class="{ 'has-file': uploadedFiles.license }">
                      <input
                        id="licenseFile"
                        type="file"
                        accept="image/*,application/pdf"
                        @change="handleFileUpload('license', $event)"
                        style="display: none"
                      />
                      <label for="licenseFile" class="upload-label">
                        <div class="upload-content">
                          <div v-if="!uploadedFiles.license" class="upload-placeholder">
                            <i class="icon-upload"></i>
                            <span class="upload-title">Foto de Licencia</span>
                            <span class="upload-subtitle">JPG, PNG o PDF</span>
                          </div>
                          <div v-else class="upload-success">
                            <i class="icon-check-circle"></i>
                            <span class="upload-filename">{{ uploadedFiles.license.name }}</span>
                            <button type="button" @click.prevent="removeFile('license')" class="btn-remove-file">
                              <i class="icon-x"></i>
                            </button>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div class="upload-item">
                    <div class="upload-area" :class="{ 'has-file': uploadedFiles.registration }">
                      <input
                        id="registrationFile"
                        type="file"
                        accept="image/*,application/pdf"
                        @change="handleFileUpload('registration', $event)"
                        style="display: none"
                      />
                      <label for="registrationFile" class="upload-label">
                        <div class="upload-content">
                          <div v-if="!uploadedFiles.registration" class="upload-placeholder">
                            <i class="icon-upload"></i>
                            <span class="upload-title">Permiso de Circulación</span>
                            <span class="upload-subtitle">JPG, PNG o PDF</span>
                          </div>
                          <div v-else class="upload-success">
                            <i class="icon-check-circle"></i>
                            <span class="upload-filename">{{ uploadedFiles.registration.name }}</span>
                            <button type="button" @click.prevent="removeFile('registration')" class="btn-remove-file">
                              <i class="icon-x"></i>
                            </button>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div class="upload-item">
                    <div class="upload-area" :class="{ 'has-file': uploadedFiles.insurance }">
                      <input
                        id="insuranceFile"
                        type="file"
                        accept="image/*,application/pdf"
                        @change="handleFileUpload('insurance', $event)"
                        style="display: none"
                      />
                      <label for="insuranceFile" class="upload-label">
                        <div class="upload-content">
                          <div v-if="!uploadedFiles.insurance" class="upload-placeholder">
                            <i class="icon-upload"></i>
                            <span class="upload-title">Seguro del Vehículo</span>
                            <span class="upload-subtitle">JPG, PNG o PDF</span>
                          </div>
                          <div v-else class="upload-success">
                            <i class="icon-check-circle"></i>
                            <span class="upload-filename">{{ uploadedFiles.insurance.name }}</span>
                            <button type="button" @click.prevent="removeFile('insurance')" class="btn-remove-file">
                              <i class="icon-x"></i>
                            </button>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Configuración y Horarios -->
        <div v-show="currentStep === 3" class="form-step" data-step="settings">
          <div class="step-header">
            <div class="step-icon">⚙️</div>
            <div class="step-content">
              <h3>Configuración y Horarios</h3>
              <p>Preferencias de trabajo y disponibilidad del conductor</p>
            </div>
          </div>

          <div class="form-grid">
            <!-- Configuración básica -->
            <div class="form-group">
              <label for="workZone">Zona de Trabajo Preferida</label>
              <select id="workZone" v-model="form.workZone">
                <option value="">Sin preferencia específica</option>
                <option v-for="zone in zones" :key="zone" :value="zone">{{ zone }}</option>
              </select>
            </div>

            <div class="form-group">
              <label for="maxDeliveryDistance">Distancia máxima de entrega (km)</label>
              <div class="range-input-group">
                <input
                  id="maxDeliveryDistance"
                  v-model.number="form.maxDeliveryDistance"
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  class="range-slider"
                />
                <div class="range-value">{{ form.maxDeliveryDistance }} km</div>
              </div>
            </div>

            <!-- Horarios de trabajo -->
            <div class="form-group full-width">
              <label>Horarios de Trabajo</label>
              <div class="schedule-container">
                <div class="schedule-header">
                  <span>Día</span>
                  <span>Trabaja</span>
                  <span>Horario</span>
                  <span>Descanso</span>
                </div>
                <div 
                  v-for="day in weekDays" 
                  :key="day.value"
                  class="schedule-row"
                >
                  <div class="day-label">
                    <span class="day-name">{{ day.label }}</span>
                    <span class="day-short">{{ day.short }}</span>
                  </div>
                  
                  <div class="day-toggle">
                    <label class="toggle-switch">
                      <input 
                        v-model="form.workDays" 
                        :value="day.value" 
                        type="checkbox"
                      />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div class="time-inputs" v-if="form.workDays.includes(day.value)">
                    <input 
                      v-model="form.workHours[day.value].start" 
                      type="time" 
                      class="time-input"
                    />
                    <span class="time-separator">-</span>
                    <input 
                      v-model="form.workHours[day.value].end" 
                      type="time" 
                      class="time-input"
                    />
                  </div>
                  <div v-else class="time-off">
                    <span>Día libre</span>
                  </div>
                  
                  <div class="break-input" v-if="form.workDays.includes(day.value)">
                    <input 
                      v-model="form.workHours[day.value].breakStart" 
                      type="time" 
                      class="time-input small"
                      placeholder="13:00"
                    />
                    <span class="time-separator">-</span>
                    <input 
                      v-model="form.workHours[day.value].breakEnd" 
                      type="time" 
                      class="time-input small"
                      placeholder="14:00"
                    />
                  </div>
                  <div v-else class="break-off">
                    <span>-</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Preferencias de entrega -->
            <div class="form-group full-width">
              <label>Preferencias de Entrega</label>
              <div class="preferences-grid">
                <div class="preference-category">
                  <h4>Tipos de Productos</h4>
                  <div class="preference-items">
                    <label class="preference-item">
                      <input v-model="form.preferences.fragileItems" type="checkbox" />
                      <span class="checkmark"></span>
                      <div class="preference-content">
                        <span class="preference-title">Productos Frágiles</span>
                        <span class="preference-subtitle">Vidrio, electrónicos, etc.</span>
                      </div>
                    </label>

                    <label class="preference-item">
                      <input v-model="form.preferences.heavyItems" type="checkbox" />
                      <span class="checkmark"></span>
                      <div class="preference-content">
                        <span class="preference-title">Productos Pesados</span>
                        <span class="preference-subtitle">Más de 20kg</span>
                      </div>
                    </label>

                    <label class="preference-item">
                      <input v-model="form.preferences.coldChain" type="checkbox" />
                      <span class="checkmark"></span>
                      <div class="preference-content">
                        <span class="preference-title">Cadena de Frío</span>
                        <span class="preference-subtitle">Productos refrigerados</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div class="preference-category">
                  <h4>Modalidades de Pago</h4>
                  <div class="preference-items">
                    <label class="preference-item">
                      <input v-model="form.preferences.cashOnDelivery" type="checkbox" />
                      <span class="checkmark"></span>
                      <div class="preference-content">
                        <span class="preference-title">Pago contra Entrega</span>
                        <span class="preference-subtitle">Manejo de efectivo</span>
                      </div>
                    </label>

                    <label class="preference-item">
                      <input v-model="form.preferences.cardPayment" type="checkbox" />
                      <span class="checkmark"></span>
                      <div class="preference-content">
                        <span class="preference-title">Pago con Tarjeta</span>
                        <span class="preference-subtitle">POS móvil</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div class="preference-category">
                  <h4>Servicios Especiales</h4>
                  <div class="preference-items">
                    <label class="preference-item">
                      <input v-model="form.preferences.expressDelivery" type="checkbox" />
                      <span class="checkmark"></span>
                      <div class="preference-content">
                        <span class="preference-title">Entregas Express</span>
                        <span class="preference-subtitle">Entrega en menos de 2 horas</span>
                      </div>
                    </label>

                    <label class="preference-item">
                      <input v-model="form.preferences.scheduledDelivery" type="checkbox" />
                      <span class="checkmark"></span>
                      <div class="preference-content">
                        <span class="preference-title">Entregas Programadas</span>
                        <span class="preference-subtitle">Horarios específicos</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Estado del conductor -->
            <div class="form-group full-width">
              <div class="status-section">
                <div class="status-header">
                  <h4>Estado del Conductor</h4>
                  <p>Define si el conductor estará activo para recibir asignaciones</p>
                </div>
                <div class="status-toggle-container">
                  <label class="status-toggle">
                    <input v-model="form.isActive" type="checkbox" class="toggle-input" />
                    <span class="toggle-track">
                      <span class="toggle-thumb"></span>
                    </span>
                    <div class="toggle-content">
                      <span class="toggle-title">
                        {{ form.isActive ? 'Conductor Activo' : 'Conductor Inactivo' }}
                      </span>
                      <span class="toggle-description">
                        {{ form.isActive 
                          ? 'Disponible para recibir nuevas asignaciones de entrega' 
                          : 'No recibirá nuevas órdenes hasta ser activado' 
                        }}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error General -->
        <div v-if="errors.general" class="general-error">
          <div class="error-content">
            <i class="icon-alert-circle"></i>
            <div class="error-text">
              <strong>Error al guardar</strong>
              <span>{{ errors.general }}</span>
            </div>
          </div>
        </div>

        <!-- Form Navigation -->
        <div class="form-navigation">
          <div class="nav-left">
            <button 
              v-if="currentStep > 0"
              type="button" 
              @click="previousStep" 
              class="btn-nav btn-previous"
            >
              <i class="icon-arrow-left"></i>
              Anterior
            </button>
          </div>

          <div class="nav-center">
            <div class="step-indicator-dots">
              <div 
                v-for="(step, index) in formSteps" 
                :key="index"
                class="step-dot"
                :class="{ 
                  active: currentStep === index,
                  completed: currentStep > index,
                  error: hasStepErrors(index)
                }"
                @click="goToStep(index)"
              ></div>
            </div>
            <div class="step-info">
              Paso {{ currentStep + 1 }} de {{ formSteps.length }}
            </div>
          </div>

          <div class="nav-right">
            <button 
              v-if="currentStep < formSteps.length - 1"
              type="button" 
              @click="nextStep" 
              class="btn-nav btn-next"
              :disabled="!canProceedToNextStep"
            >
              Siguiente
              <i class="icon-arrow-right"></i>
            </button>

            <button 
              v-if="currentStep === formSteps.length - 1"
              type="submit" 
              :disabled="loading || !isFormValid" 
              class="btn-nav btn-submit"
            >
              <div class="btn-content">
                <i v-if="loading" class="icon-loader spinning"></i>
                <i v-else :class="isEditing ? 'icon-save' : 'icon-plus'"></i>
                <span>{{ loading ? 'Guardando...' : (isEditing ? 'Actualizar Conductor' : 'Crear Conductor') }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button type="button" @click="saveDraft" class="btn-draft" v-if="!isEditing">
            <i class="icon-save"></i>
            Guardar Borrador
          </button>
          
          <button type="button" @click="resetForm" class="btn-reset">
            <i class="icon-refresh-cw"></i>
            Limpiar Formulario
          </button>
          
          <button type="button" @click="$emit('cancel')" class="btn-cancel">
            <i class="icon-x"></i>
            Cancelar
          </button>
        </div>
      </form>

      <!-- Form Summary -->
      <div v-if="showSummary" class="form-summary">
        <div class="summary-header">
          <h4>Resumen</h4>
          <button @click="showSummary = false" class="btn-close-summary">
            <i class="icon-x"></i>
          </button>
        </div>
        <div class="summary-content">
          <div class="summary-section">
            <h5>👤 Información Personal</h5>
            <div class="summary-item">
              <span class="label">Nombre:</span>
              <span class="value">{{ form.name || 'No especificado' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Email:</span>
              <span class="value">{{ form.email || 'No especificado' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Teléfono:</span>
              <span class="value">{{ formatPhoneDisplay() || 'No especificado' }}</span>
            </div>
          </div>

          <div class="summary-section">
            <h5>🚗 Vehículo</h5>
            <div class="summary-item">
              <span class="label">Tipo:</span>
              <span class="value">{{ getVehicleLabel() || 'No especificado' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Patente:</span>
              <span class="value">{{ form.vehiclePlate || 'No especificada' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Marca/Modelo:</span>
              <span class="value">{{ getVehicleFullName() || 'No especificado' }}</span>
            </div>
          </div>

          <div class="summary-section">
            <h5>📄 Documentación</h5>
            <div class="summary-item">
              <span class="label">Licencia:</span>
              <span class="value">{{ form.driverLicense || 'No especificada' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Documentos:</span>
              <span class="value">{{ getUploadedDocumentsCount() }} archivos subidos</span>
            </div>
          </div>

          <div class="summary-section">
            <h5>⚙️ Configuración</h5>
            <div class="summary-item">
              <span class="label">Estado:</span>
              <span class="value" :class="form.isActive ? 'status-active' : 'status-inactive'">
                {{ form.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <div class="summary-item">
              <span class="label">Días de trabajo:</span>
              <span class="value">{{ getWorkDaysCount() }} días por semana</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { shipdayService } from '../services/shipday'

const props = defineProps({
  driver: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['success', 'cancel'])

// ==================== REFS ====================
const photoInput = ref(null)
const currentStep = ref(0)
const loading = ref(false)
const errors = ref({})
const uploadedFiles = ref({})
const showSummary = ref(false)
const addressSuggestions = ref([])

// ==================== CONFIGURACIÓN DEL FORMULARIO ====================
const formSteps = [
  { 
    label: 'Personal', 
    description: 'Información básica',
    key: 'personal',
    required: ['name', 'email', 'phone']
  },
  { 
    label: 'Vehículo', 
    description: 'Tipo y detalles',
    key: 'vehicle',
    required: ['vehicleType']
  },
  { 
    label: 'Documentos', 
    description: 'Licencias y archivos',
    key: 'documents',
    required: ['driverLicense']
  },
  { 
    label: 'Configuración', 
    description: 'Horarios y preferencias',
    key: 'settings',
    required: []
  }
]

const vehicleTypes = [
  { 
    value: 'car', 
    label: 'Automóvil', 
    icon: '🚗', 
    description: 'Ideal para paquetes medianos y distancias largas',
    capacity: 'Hasta 500kg',
    range: '50-100km',
    recommended: false
  },
  { 
    value: 'motorcycle', 
    label: 'Motocicleta', 
    icon: '🏍️', 
    description: 'Rápido para paquetes pequeños en ciudad',
    capacity: 'Hasta 50kg',
    range: '20-50km',
    recommended: true
  },
  { 
    value: 'bicycle', 
    label: 'Bicicleta', 
    icon: '🚲', 
    description: 'Ecológico para distancias cortas',
    capacity: 'Hasta 20kg',
    range: '5-15km',
    recommended: false
  },
  { 
    value: 'truck', 
    label: 'Camión', 
    icon: '🚚', 
    description: 'Para paquetes grandes y pesados',
    capacity: 'Hasta 3500kg',
    range: '100+ km',
    recommended: false
  },
  { 
    value: 'van', 
    label: 'Furgoneta', 
    icon: '🚐', 
    description: 'Versatil para múltiples entregas',
    capacity: 'Hasta 1000kg',
    range: '50-150km',
    recommended: true
  }
]

const vehicleBrands = [
  {
    type: 'Automóviles',
    brands: ['Toyota', 'Honda', 'Nissan', 'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'Mazda', 'Volkswagen', 'Renault']
  },
  {
    type: 'Motocicletas',
    brands: ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Bajaj', 'TVS', 'Hero', 'KTM', 'Ducati', 'BMW']
  },
  {
    type: 'Camiones y Furgonetas',
    brands: ['Ford', 'Chevrolet', 'Isuzu', 'Mitsubishi', 'Hyundai', 'JAC', 'Foton', 'Mercedes-Benz', 'Iveco']
  }
]

const zones = [
  'Zona Norte', 'Zona Centro', 'Zona Sur', 
  'Zona Oriente', 'Zona Poniente', 'Zona Sur-Oriente'
]

const weekDays = [
  { value: 'monday', label: 'Lunes', short: 'L' },
  { value: 'tuesday', label: 'Martes', short: 'M' },
  { value: 'wednesday', label: 'Miércoles', short: 'M' },
  { value: 'thursday', label: 'Jueves', short: 'J' },
  { value: 'friday', label: 'Viernes', short: 'V' },
  { value: 'saturday', label: 'Sábado', short: 'S' },
  { value: 'sunday', label: 'Domingo', short: 'D' }
]

// ==================== ESTADO DEL FORMULARIO ====================
const form = ref({
  // Información Personal
  photo: '',
  name: '',
  email: '',
  phone: '',
  countryCode: '+56',
  dni: '',
  birthDate: '',
  address: '',
  
  // Vehículo
  vehicleType: '',
  vehiclePlate: '',
  vehicleBrand: '',
  vehicleModel: '',
  vehicleYear: '',
  vehicleColor: '',
  features: {
    hasInsurance: false,
    hasGPS: false,
    hasCooling: false,
    isEcological: false
  },
  
  // Documentación
  driverLicense: '',
  licenseType: 'B',
  licenseExpiry: '',
  emergencyContact: '',
  
  // Configuración
  workZone: '',
  maxDeliveryDistance: 25,
  workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  workHours: {
    monday: { start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    tuesday: { start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    wednesday: { start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    thursday: { start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    friday: { start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    saturday: { start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
    sunday: { start: '10:00', end: '16:00', breakStart: '13:00', breakEnd: '14:00' }
  },
  preferences: {
    fragileItems: true,
    heavyItems: false,
    coldChain: false,
    cashOnDelivery: true,
    cardPayment: true,
    expressDelivery: true,
    scheduledDelivery: true
  },
  isActive: true
})

const plateValidation = ref({ type: '', message: '' })

// ==================== COMPUTED ====================
const isEditing = computed(() => !!props.driver)

const today = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const maxBirthDate = computed(() => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 18) // Mínimo 18 años
  return date.toISOString().split('T')[0]
})

const isUnderAge = computed(() => {
  if (!form.value.birthDate) return false
  const birthDate = new Date(form.value.birthDate)
  const eighteenYearsAgo = new Date()
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
  return birthDate > eighteenYearsAgo
})

const vehicleYears = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let year = currentYear; year >= currentYear - 30; year--) {
    years.push(year)
  }
  return years
})

const isLicenseExpiringSoon = computed(() => {
  if (!form.value.licenseExpiry) return false
  const expiryDate = new Date(form.value.licenseExpiry)
  const threeMonthsFromNow = new Date()
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
  return expiryDate <= threeMonthsFromNow && expiryDate > new Date()
})

const daysUntilExpiry = computed(() => {
  if (!form.value.licenseExpiry) return 0
  const expiryDate = new Date(form.value.licenseExpiry)
  const today = new Date()
  const diffTime = expiryDate - today
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

const canProceedToNextStep = computed(() => {
  const currentStepData = formSteps[currentStep.value]
  if (!currentStepData.required) return true
  
  return currentStepData.required.every(field => {
    if (field === 'phone') {
      return form.value.phone && form.value.countryCode
    }
    return form.value[field] && form.value[field].toString().trim() !== ''
  })
})

const isFormValid = computed(() => {
  return form.value.name && 
         form.value.email && 
         form.value.phone && 
         form.value.vehicleType && 
         form.value.driverLicense &&
         Object.keys(errors.value).length === 0
})

// ==================== LIFECYCLE ====================
onMounted(() => {
  if (props.driver) {
    loadDriverData()
  }
})

// ==================== WATCHERS ====================
watch(() => form.value.address, (newAddress) => {
  if (newAddress && newAddress.length > 3) {
    // Simular búsqueda de direcciones
    setTimeout(() => {
      addressSuggestions.value = [
        { id: 1, address: 'Av. Providencia 1234, Providencia, Santiago' },
        { id: 2, address: 'Av. Providencia 1240, Providencia, Santiago' },
        { id: 3, address: 'Av. Providencia 1250, Providencia, Santiago' }
      ].filter(addr => 
        addr.address.toLowerCase().includes(newAddress.toLowerCase())
      )
    }, 300)
  } else {
    addressSuggestions.value = []
  }
})

// ==================== MÉTODOS PRINCIPALES ====================
const loadDriverData = () => {
  const driver = props.driver
  
  // Cargar datos básicos
  Object.assign(form.value, {
    photo: driver.carrierPhoto || driver.avatar || '',
    name: driver.name || '',
    email: driver.email || '',
    phone: extractPhoneNumber(driver.phoneNumber || driver.phone || ''),
    countryCode: extractCountryCode(driver.phoneNumber || driver.phone || '') || '+56',
    dni: driver.dni || '',
    birthDate: driver.birthDate || '',
    address: driver.address || '',
    
    vehicleType: driver.vehicleType || driver.vehicle_type || '',
    vehiclePlate: driver.vehiclePlate || driver.vehicle_plate || '',
    vehicleBrand: driver.vehicleBrand || '',
    vehicleModel: driver.vehicleModel || '',
    vehicleYear: driver.vehicleYear || '',
    vehicleColor: driver.vehicleColor || '',
    features: { 
      ...form.value.features, 
      ...(driver.features || {}) 
    },
    
    driverLicense: driver.driverLicense || driver.driver_license || '',
    licenseType: driver.licenseType || 'B',
    licenseExpiry: driver.licenseExpiry || '',
    emergencyContact: driver.emergencyContact || '',
    
    workZone: driver.workZone || '',
    maxDeliveryDistance: driver.maxDeliveryDistance || 25,
    workDays: driver.workDays || form.value.workDays,
    workHours: { ...form.value.workHours, ...(driver.workHours || {}) },
    preferences: { ...form.value.preferences, ...(driver.preferences || {}) },
    isActive: driver.isActive !== undefined ? driver.isActive : true
  })
}

const nextStep = () => {
  if (validateCurrentStep() && currentStep.value < formSteps.length - 1) {
    currentStep.value++
    scrollToTop()
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
    scrollToTop()
  }
}

const goToStep = (stepIndex) => {
  if (stepIndex < currentStep.value || validateStepsUntil(stepIndex)) {
    currentStep.value = stepIndex
    scrollToTop()
  }
}

const scrollToTop = () => {
  nextTick(() => {
    const formElement = document.querySelector('.driver-form')
    if (formElement) {
      formElement.scrollTop = 0
    }
  })
}

// ==================== VALIDACIÓN ====================
const validateCurrentStep = () => {
  const stepData = formSteps[currentStep.value]
  let isValid = true
  
  // Limpiar errores del paso actual
  stepData.required?.forEach(field => {
    if (errors.value[field]) {
      delete errors.value[field]
    }
  })
  
  // Validar campos requeridos del paso actual
  stepData.required?.forEach(field => {
    if (!validateField(field)) {
      isValid = false
    }
  })
  
  return isValid
}

const validateStepsUntil = (targetStep) => {
  for (let i = 0; i <= targetStep; i++) {
    const stepData = formSteps[i]
    if (stepData.required) {
      const hasAllRequired = stepData.required.every(field => {
        if (field === 'phone') {
          return form.value.phone && form.value.countryCode
        }
        return form.value[field] && form.value[field].toString().trim() !== ''
      })
      if (!hasAllRequired) return false
    }
  }
  return true
}

const validateField = (fieldName) => {
  const value = form.value[fieldName]
  let isValid = true
  
  switch (fieldName) {
    case 'name':
      if (!value || value.trim().length < 2) {
        errors.value.name = 'El nombre debe tener al menos 2 caracteres'
        isValid = false
      } else if (value.trim().length > 100) {
        errors.value.name = 'El nombre no puede exceder 100 caracteres'
        isValid = false
      }
      break
      
    case 'email':
      if (!value || value.trim() === '') {
        errors.value.email = 'El email es requerido'
        isValid = false
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.value.email = 'Formato de email inválido'
        isValid = false
      }
      break
      
    case 'phone':
      if (!value || value.trim() === '') {
        errors.value.phone = 'El teléfono es requerido'
        isValid = false
      } else if (!/^[\d\s\-\(\)]{8,15}$/.test(value.replace(/\D/g, ''))) {
        errors.value.phone = 'Formato de teléfono inválido'
        isValid = false
      }
      break
      
    case 'dni':
      if (value && !validateDNI(value)) {
        errors.value.dni = 'Formato de RUT/DNI inválido'
        isValid = false
      }
      break
      
    case 'driverLicense':
      if (!value || value.trim() === '') {
        errors.value.driverLicense = 'El número de licencia es requerido'
        isValid = false
      } else if (value.trim().length < 6) {
        errors.value.driverLicense = 'El número de licencia debe tener al menos 6 caracteres'
        isValid = false
      }
      break
  }
  
  // Limpiar error si es válido
  if (isValid && errors.value[fieldName]) {
    delete errors.value[fieldName]
  }
  
  return isValid
}

const hasStepErrors = (stepIndex) => {
  const stepData = formSteps[stepIndex]
  if (!stepData.required) return false
  
  return stepData.required.some(field => errors.value[field])
}

// ==================== MANEJO DE ARCHIVOS ====================
const triggerPhotoUpload = () => {
  photoInput.value?.click()
}

const handlePhotoUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 2 * 1024 * 1024) { // 2MB
      alert('La imagen no puede superar los 2MB')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.photo = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const removePhoto = () => {
  form.value.photo = ''
  if (photoInput.value) {
    photoInput.value.value = ''
  }
}

const handleFileUpload = (type, event) => {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('El archivo no puede superar los 5MB')
      return
    }
    
    uploadedFiles.value[type] = {
      name: file.name,
      file: file,
      size: file.size,
      type: file.type
    }
  }
}

const removeFile = (type) => {
  delete uploadedFiles.value[type]
  // Limpiar el input file correspondiente
  const input = document.getElementById(type + 'File')
  if (input) input.value = ''
}

// ==================== HELPERS ====================
const formatPhoneNumber = (event) => {
  let value = event.target.value.replace(/\D/g, '')
  
  // Formatear según el país
  if (form.value.countryCode === '+56') { // Chile
    if (value.length > 8) {
      value = value.substring(0, 9)
    }
    if (value.length > 4) {
      value = value.substring(0, 1) + ' ' + value.substring(1, 5) + ' ' + value.substring(5)
    }
  }
  
  form.value.phone = value
}

const formatDNI = (event) => {
  let value = event.target.value.replace(/[^\dkK\-\.]/g, '')
  
  // Formatear RUT chileno
  if (form.value.countryCode === '+56') {
    value = value.replace(/[^\dkK]/g, '')
    if (value.length > 1) {
      const body = value.slice(0, -1)
      const dv = value.slice(-1)
      value = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
    }
  }
  
  form.value.dni = value
}

const formatVehiclePlate = (event) => {
  const value = event.target.value.toUpperCase()
  form.value.vehiclePlate = value
}

const validateVehiclePlate = () => {
  const plate = form.value.vehiclePlate
  if (!plate) {
    plateValidation.value = { type: '', message: '' }
    return
  }
  
  // Validar formato chileno: ABCD-12 o AB-CD-12
  const chileanFormat = /^[A-Z]{2,4}-?\d{2}$|^[A-Z]{2}-[A-Z]{2}-\d{2}$/
  
  if (chileanFormat.test(plate)) {
    plateValidation.value = { 
      type: 'success', 
      message: 'Formato de patente válido' 
    }
  } else {
    plateValidation.value = { 
      type: 'error', 
      message: 'Formato de patente inválido (ej: ABCD-12)' 
    }
  }
}

const selectVehicleType = (type) => {
  form.value.vehicleType = type
}

const selectAddressSuggestion = (suggestion) => {
  form.value.address = suggestion.address
  addressSuggestions.value = []
}

const validateDNI = (dni) => {
  // Validación simple de RUT chileno
  if (form.value.countryCode === '+56') {
    const cleanDni = dni.replace(/[^\dkK]/g, '')
    if (cleanDni.length < 8) return false
    
    const body = cleanDni.slice(0, -1)
    const dv = cleanDni.slice(-1).toUpperCase()
    
    let sum = 0
    let multiplier = 2
    
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier
      multiplier = multiplier === 7 ? 2 : multiplier + 1
    }
    
    const calculatedDv = 11 - (sum % 11)
    const expectedDv = calculatedDv === 11 ? '0' : calculatedDv === 10 ? 'K' : calculatedDv.toString()
    
    return dv === expectedDv
  }
  
  return true // Para otros países, aceptar cualquier formato por ahora
}

const extractPhoneNumber = (fullPhone) => {
  if (!fullPhone) return ''
  // Extraer solo los números después del código de país
  const match = fullPhone.match(/^\+\d{1,3}(.+)/)
  return match ? match[1].trim() : fullPhone
}

const extractCountryCode = (fullPhone) => {
  if (!fullPhone) return '+56'
  const match = fullPhone.match(/^(\+\d{1,3})/)
  return match ? match[1] : '+56'
}

const getInitials = (name) => {
  if (!name) return ''
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

// ==================== SUMMARY HELPERS ====================
const formatPhoneDisplay = () => {
  if (!form.value.phone || !form.value.countryCode) return ''
  return `${form.value.countryCode} ${form.value.phone}`
}

const getVehicleLabel = () => {
  const vehicle = vehicleTypes.find(v => v.value === form.value.vehicleType)
  return vehicle ? `${vehicle.icon} ${vehicle.label}` : ''
}

const getVehicleFullName = () => {
  const parts = []
  if (form.value.vehicleBrand) parts.push(form.value.vehicleBrand)
  if (form.value.vehicleModel) parts.push(form.value.vehicleModel)
  if (form.value.vehicleYear) parts.push(form.value.vehicleYear)
  return parts.join(' ')
}

const getUploadedDocumentsCount = () => {
  return Object.keys(uploadedFiles.value).length
}

const getWorkDaysCount = () => {
  return form.value.workDays.length
}

// ==================== FORM ACTIONS ====================
const saveDraft = () => {
  const draftData = { ...form.value }
  localStorage.setItem('driver_form_draft', JSON.stringify(draftData))
  alert('Borrador guardado exitosamente')
}

const resetForm = () => {
  if (confirm('¿Estás seguro de que quieres limpiar el formulario? Se perderán todos los datos ingresados.')) {
    // Resetear a valores por defecto
    Object.assign(form.value, {
      photo: '',
      name: '',
      email: '',
      phone: '',
      countryCode: '+56',
      dni: '',
      birthDate: '',
      address: '',
      vehicleType: '',
      vehiclePlate: '',
      vehicleBrand: '',
      vehicleModel: '',
      vehicleYear: '',
      vehicleColor: '',
      features: {
        hasInsurance: false,
        hasGPS: false,
        hasCooling: false,
        isEcological: false
      },
      driverLicense: '',
      licenseType: 'B',
      licenseExpiry: '',
      emergencyContact: '',
      workZone: '',
      maxDeliveryDistance: 25,
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      preferences: {
        fragileItems: true,
        heavyItems: false,
        coldChain: false,
        cashOnDelivery: true,
        cardPayment: true,
        expressDelivery: true,
        scheduledDelivery: true
      },
      isActive: true
    })
    
    errors.value = {}
    uploadedFiles.value = {}
    currentStep.value = 0
  }
}

const handleSubmit = async () => {
  // Validar todo el formulario
  let isValid = true
  
  formSteps.forEach((step, index) => {
    step.required?.forEach(field => {
      if (!validateField(field)) {
        isValid = false
      }
    })
  })
  
  if (!isValid) {
    // Ir al primer paso con errores
    for (let i = 0; i < formSteps.length; i++) {
      if (hasStepErrors(i)) {
        currentStep.value = i
        break
      }
    }
    return
  }

  loading.value = true
  errors.value = {}

  try {
    const driverData = formatDriverData()
    
    let result
    if (isEditing.value) {
      const driverId = props.driver.id || props.driver.email
      result = await shipdayService.updateDriver(driverId, driverData)
    } else {
      result = await shipdayService.createDriver(driverData)
    }

    // Limpiar borrador si existe
    localStorage.removeItem('driver_form_draft')

    emit('success', {
      message: isEditing.value ? 'Conductor actualizado exitosamente' : 'Conductor creado exitosamente',
      driver: result.data || result
    })
    
  } catch (error) {
    console.error('Error guardando conductor:', error)
    
    if (error.response?.data?.error) {
      errors.value.general = error.response.data.error
    } else if (error.response?.data?.details) {
      errors.value.general = error.response.data.details
    } else {
      errors.value.general = error.message || 'Error al guardar el conductor'
    }
  } finally {
    loading.value = false
  }
}

const formatDriverData = () => {
  return {
    // Datos básicos para Shipday
    name: form.value.name,
    email: form.value.email,
    phoneNumber: `${form.value.countryCode}${form.value.phone.replace(/\D/g, '')}`,
    vehicleType: form.value.vehicleType,
    isActive: form.value.isActive,
    
    // Datos extendidos
    photo: form.value.photo,
    dni: form.value.dni,
    birthDate: form.value.birthDate,
    address: form.value.address,
    vehiclePlate: form.value.vehiclePlate,
    vehicleBrand: form.value.vehicleBrand,
    vehicleModel: form.value.vehicleModel,
    vehicleYear: form.value.vehicleYear,
    vehicleColor: form.value.vehicleColor,
    features: form.value.features,
    driverLicense: form.value.driverLicense,
    licenseType: form.value.licenseType,
    licenseExpiry: form.value.licenseExpiry,
    emergencyContact: form.value.emergencyContact,
    workZone: form.value.workZone,
    maxDeliveryDistance: form.value.maxDeliveryDistance,
    workDays: form.value.workDays,
    workHours: form.value.workHours,
    preferences: form.value.preferences,
    uploadedFiles: uploadedFiles.value
  }
}
</script>
<style scoped>
/* ==================== VARIABLES CSS ==================== */
:root {
  --primary: #3b82f6;
  --primary-dark: #2563eb;
  --primary-light: #dbeafe;
  --secondary: #6b7280;
  --success: #10b981;
  --success-light: #d1fae5;
  --warning: #f59e0b;
  --warning-light: #fef3c7;
  --error: #ef4444;
  --error-light: #fee2e2;
  --info: #06b6d4;
  
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-dark: #1f2937;
  
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --text-light: #ffffff;
  
  --border: #e5e7eb;
  --border-light: #f3f4f6;
  --border-focus: #3b82f6;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  
  --radius: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ==================== MODAL BASE ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.driver-form-modal {
  background: var(--bg-primary);
  border-radius: var(--radius-2xl);
  max-width: 95vw;
  max-height: 95vh;
  width: 900px;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  animation: modalSlideIn 0.3s ease-out;
  display: flex;
  flex-direction: column;
}

@keyframes modalSlideIn {
  from { transform: translateY(-20px) scale(0.95); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

/* ==================== MODAL HEADER ==================== */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: var(--text-light);
  position: relative;
  overflow: hidden;
}

.modal-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" stroke-width="0.5" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
  pointer-events: none;
}

.header-content {
  flex: 1;
  position: relative;
  z-index: 1;
}

.modal-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
  font-weight: 400;
}

.btn-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: var(--text-light);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}
/* ==================== PROGRESS INDICATOR ==================== */
.form-progress {
  padding: 24px 32px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  position: relative;
}

.progress-steps::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 60px;
  right: 60px;
  height: 2px;
  background: var(--border);
  z-index: 1;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  cursor: pointer;
  transition: var(--transition);
  position: relative;
  z-index: 2;
}

.progress-step:hover {
  transform: translateY(-2px);
}

.step-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-primary);
  border: 3px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  transition: var(--transition);
  position: relative;
}

.progress-step.active .step-indicator {
  background: var(--primary);
  border-color: var(--primary);
  transform: scale(1.1);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.progress-step.completed .step-indicator {
  background: var(--success);
  border-color: var(--success);
}

.progress-step.error .step-indicator {
  background: var(--error);
  border-color: var(--error);
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.step-number {
  font-weight: 700;
  font-size: 16px;
  color: var(--text-secondary);
}

.progress-step.active .step-number,
.progress-step.completed .step-number {
  color: var(--text-light);
}

.step-error {
  color: var(--text-light);
  font-size: 16px;
}

.step-info {
  text-align: center;
  max-width: 120px;
}

.step-label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  font-size: 14px;
}

.progress-step.active .step-label {
  color: var(--primary);
}

.step-description {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

.progress-bar {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--success));
  border-radius: 3px;
  transition: width 0.5s ease;
}

/* ==================== FORM CONTAINER ==================== */
.driver-form {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  max-height: calc(95vh - 200px);
}

.form-step {
  min-height: 500px;
  animation: stepFadeIn 0.3s ease-out;
}

@keyframes stepFadeIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.step-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding: 24px;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
}

.step-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.step-content h3 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.step-content p {
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* ==================== FORM GRID ==================== */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group.photo-upload {
  grid-column: 1 / -1;
  align-items: center;
}

/* ==================== LABELS ==================== */
.form-group label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.form-group label.required::after {
  content: '*';
  color: var(--error);
  font-weight: bold;
}

/* ==================== INPUTS ==================== */
.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: 16px;
  transition: var(--transition);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.form-group input.error,
.form-group select.error,
.form-group textarea.error {
  border-color: var(--error);
  box-shadow: 0 0 0 3px var(--error-light);
}

.form-group input.warning,
.form-group select.warning,
.form-group textarea.warning {
  border-color: var(--warning);
  box-shadow: 0 0 0 3px var(--warning-light);
}

.form-group input:disabled {
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  cursor: not-allowed;
  opacity: 0.7;
}
/* ==================== PHOTO UPLOAD ==================== */
.photo-uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.photo-preview {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 3px solid var(--border);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.photo-preview:hover {
  border-color: var(--primary);
  transform: scale(1.05);
}

.photo-preview.has-photo {
  border-color: var(--success);
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.photo-placeholder i {
  font-size: 24px;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: var(--transition);
}

.photo-preview:hover .photo-overlay {
  opacity: 1;
}

.btn-photo {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--primary);
  color: var(--text-light);
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-photo:hover {
  background: var(--primary-dark);
  transform: scale(1.1);
}

.btn-photo.remove {
  background: var(--error);
}

.btn-photo.remove:hover {
  background: #dc2626;
}

.photo-help {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
  text-align: center;
}

/* ==================== PHONE INPUT ==================== */
.phone-input-group {
  display: flex;
  gap: 8px;
}

.country-select {
  flex: 0 0 120px;
  font-size: 14px;
}

.phone-input-group input {
  flex: 1;
}

/* ==================== COLOR INPUT ==================== */
.color-input-group {
  position: relative;
}

.color-input-group input {
  width: 100%;
}

/* ==================== ADDRESS SUGGESTIONS ==================== */
.address-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 4px;
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
}

.suggestion-item:hover {
  background: var(--bg-secondary);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item i {
  color: var(--text-tertiary);
  font-size: 16px;
}

/* ==================== ERROR MESSAGES ==================== */
.error-message,
.warning-message,
.help-text {
  font-size: 12px;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1.3;
}

.error-message {
  color: var(--error);
}

.warning-message {
  color: var(--warning);
}

.help-text {
  color: var(--text-tertiary);
  font-style: italic;
}

.general-error {
  margin-bottom: 24px;
  padding: 16px 20px;
  background: var(--error-light);
  border: 1px solid var(--error);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--error);
}

.error-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.error-content i {
  color: var(--error);
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.error-text {
  flex: 1;
}

.error-text strong {
  color: var(--error);
  display: block;
  margin-bottom: 4px;
  font-weight: 700;
}

.error-text span {
  color: #991b1b;
  line-height: 1.4;
}
/* ==================== VEHICLE SELECTOR ==================== */
.vehicle-selector {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.vehicle-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition);
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

.vehicle-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s;
}

.vehicle-option:hover::before {
  left: 100%;
}

.vehicle-option:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.vehicle-option.selected {
  border-color: var(--primary);
  background: var(--primary-light);
}

.vehicle-option.recommended::after {
  content: 'Recomendado';
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--warning);
  color: var(--text-light);
  padding: 4px 8px;
  border-radius: var(--radius);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.vehicle-visual {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.vehicle-icon {
  font-size: 32px;
  width: 60px;
  height: 60px;
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.recommended-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--warning);
  color: var(--text-light);
  padding: 4px 8px;
  border-radius: var(--radius);
  font-size: 10px;
  font-weight: 600;
}

.vehicle-info {
  flex: 1;
}

.vehicle-name {
  font-weight: 700;
  font-size: 18px;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.vehicle-description {
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.4;
}

.vehicle-specs {
  display: flex;
  gap: 16px;
}

.spec {
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: 4px 8px;
  border-radius: var(--radius);
}

.vehicle-selection {
  display: flex;
  align-items: center;
}

.selection-indicator {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.vehicle-option.selected .selection-indicator {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--text-light);
}

/* ==================== RANGE INPUT ==================== */
.range-input-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.range-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  outline: none;
  transition: var(--transition);
  -webkit-appearance: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow);
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.range-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  border: none;
  box-shadow: var(--shadow);
  transition: var(--transition);
}

.range-value {
  font-weight: 600;
  color: var(--primary);
  min-width: 60px;
  text-align: center;
  padding: 8px 12px;
  background: var(--primary-light);
  border-radius: var(--radius);
  font-size: 14px;
}
/* ==================== PREFERENCES GRID ==================== */
.preferences-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.preference-category {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border);
}

.preference-category h4 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border);
}

.preference-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preference-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  padding: 12px;
  border-radius: var(--radius);
  transition: var(--transition);
  background: var(--bg-primary);
}

.preference-item:hover {
  background: var(--bg-tertiary);
  transform: translateX(4px);
}

.preference-item input[type="checkbox"] {
  display: none;
}

.preference-content {
  flex: 1;
}

.preference-title {
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
}

.preference-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

/* ==================== STATUS SECTION ==================== */
.status-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 24px;
  border: 1px solid var(--border);
}

.status-header h4 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.status-header p {
  color: var(--text-secondary);
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.status-toggle-container {
  display: flex;
  justify-content: center;
}

.status-toggle {
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  padding: 20px;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  transition: var(--transition);
  border: 2px solid var(--border);
  min-width: 300px;
}

.status-toggle:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.toggle-input {
  display: none;
}

.toggle-track {
  width: 60px;
  height: 32px;
  background: var(--border);
  border-radius: 32px;
  position: relative;
  transition: var(--transition);
  flex-shrink: 0;
}

.toggle-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: var(--text-light);
  border-radius: 50%;
  transition: var(--transition);
  box-shadow: var(--shadow);
}

.toggle-input:checked + .toggle-track {
  background: var(--success);
}

.toggle-input:checked + .toggle-track .toggle-thumb {
  transform: translateX(28px);
}

.toggle-content {
  text-align: left;
  flex: 1;
}

.toggle-title {
  font-weight: 700;
  font-size: 18px;
  color: var(--text-primary);
  display: block;
  margin-bottom: 6px;
}

.toggle-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* ==================== DOCUMENTS UPLOAD ==================== */
.documents-upload {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border);
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.upload-area {
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  transition: var(--transition);
  overflow: hidden;
  background: var(--bg-primary);
}

.upload-area:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}

.upload-area.has-file {
  border-color: var(--success);
  background: var(--success-light);
  border-style: solid;
}

.upload-label {
  display: block;
  cursor: pointer;
  height: 100%;
}

.upload-content {
  padding: 20px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-placeholder {
  text-align: center;
  color: var(--text-tertiary);
}

.upload-placeholder i {
  font-size: 24px;
  margin-bottom: 8px;
  display: block;
  color: var(--text-secondary);
}

.upload-title {
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
}

.upload-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
}

.upload-success {
  text-align: center;
  color: var(--success);
  position: relative;
}

.upload-success i {
  font-size: 24px;
  margin-bottom: 8px;
  display: block;
}

.upload-filename {
  font-weight: 600;
  display: block;
  margin-bottom: 8px;
  word-break: break-word;
  font-size: 12px;
  color: var(--text-primary);
}

.btn-remove-file {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--error);
  color: var(--text-light);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: var(--transition);
  box-shadow: var(--shadow);
}

.btn-remove-file:hover {
  background: #dc2626;
  transform: scale(1.1);
}
/* ==================== CHECKBOX STYLES ==================== */
.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  padding: 16px;
  border-radius: var(--radius-lg);
  transition: var(--transition);
  border: 1px solid var(--border);
  background: var(--bg-primary);
}

.checkbox-item:hover {
  background: var(--bg-secondary);
  border-color: var(--primary);
  transform: translateY(-1px);
}

.checkbox-item input[type="checkbox"] {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  position: relative;
  transition: var(--transition);
  flex-shrink: 0;
  margin-top: 2px;
  background: var(--bg-primary);
}

.checkbox-item input[type="checkbox"]:checked + .checkmark {
  background: var(--primary);
  border-color: var(--primary);
}

.checkbox-item input[type="checkbox"]:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-light);
  font-size: 12px;
  font-weight: bold;
}

.checkbox-content {
  flex: 1;
}

.checkbox-title {
  font-weight: 600;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
}

.checkbox-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

/* ==================== SCHEDULE CONTAINER ==================== */
.schedule-container {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border);
}

.schedule-header {
  display: grid;
  grid-template-columns: 120px 80px 1fr 120px;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 2px solid var(--border);
  margin-bottom: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 14px;
}

.schedule-row {
  display: grid;
  grid-template-columns: 120px 80px 1fr 120px;
  gap: 16px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
  transition: var(--transition);
}

.schedule-row:last-child {
  border-bottom: none;
}

.schedule-row:hover {
  background: var(--bg-primary);
  border-radius: var(--radius);
  margin: 0 -8px;
  padding: 12px 8px;
}

.day-label {
  display: flex;
  flex-direction: column;
}

.day-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.day-short {
  font-size: 12px;
  color: var(--text-tertiary);
}

.day-toggle {
  display: flex;
  justify-content: center;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--border);
  transition: var(--transition);
  border-radius: 24px;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: var(--text-light);
  transition: var(--transition);
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(24px);
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.time-input {
  padding: 6px 8px !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius) !important;
  font-size: 14px !important;
  width: 80px;
  text-align: center;
}

.time-input.small {
  width: 60px;
}

.time-input:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 2px var(--primary-light) !important;
}

.time-separator {
  color: var(--text-tertiary);
  font-weight: 600;
  font-size: 14px;
}

.time-off,
.break-off {
  color: var(--text-tertiary);
  font-style: italic;
  text-align: center;
  font-size: 14px;
}

.break-input {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
/* ==================== FORM NAVIGATION ==================== */
.form-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 32px;
  padding: 24px 0;
  border-top: 2px solid var(--border);
}

.nav-left,
.nav-right {
  flex: 1;
}

.nav-right {
  display: flex;
  justify-content: flex-end;
}

.nav-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-indicator-dots {
  display: flex;
  gap: 8px;
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
  cursor: pointer;
  transition: var(--transition);
}

.step-dot:hover {
  transform: scale(1.2);
}

.step-dot.active {
  background: var(--primary);
  transform: scale(1.3);
}

.step-dot.completed {
  background: var(--success);
}

.step-dot.error {
  background: var(--error);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.step-info {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
  text-align: center;
}

.btn-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  font-size: 14px;
  min-width: 120px;
  justify-content: center;
}

.btn-previous {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-previous:hover:not(:disabled) {
  background: var(--border-light);
  border-color: var(--text-secondary);
  transform: translateX(-2px);
}

.btn-next {
  background: var(--primary);
  color: var(--text-light);
}

.btn-next:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateX(2px);
  box-shadow: var(--shadow-md);
}

.btn-submit {
  background: var(--success);
  color: var(--text-light);
  min-width: 180px;
}

.btn-submit:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-nav:disabled {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  cursor: not-allowed;
  border: 1px solid var(--border);
  transform: none !important;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ==================== QUICK ACTIONS ==================== */
.quick-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.btn-draft,
.btn-reset,
.btn-cancel {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: var(--transition);
  font-size: 12px;
  font-weight: 500;
}

.btn-draft {
  background: var(--warning-light);
  color: #92400e;
  border: 1px solid var(--warning);
}

.btn-draft:hover {
  background: var(--warning);
  color: var(--text-light);
}

.btn-reset {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-reset:hover {
  background: var(--border-light);
  color: var(--text-primary);
}

.btn-cancel {
  background: var(--error-light);
  color: #991b1b;
  border: 1px solid var(--error);
}

.btn-cancel:hover {
  background: var(--error);
  color: var(--text-light);
}

/* ==================== FORM SUMMARY ==================== */
.form-summary {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 320px;
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border);
  z-index: 1001;
  max-height: 80vh;
  overflow-y: auto;
  animation: summarySlideIn 0.3s ease-out;
}

@keyframes summarySlideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

.summary-header h4 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.btn-close-summary {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius);
  transition: var(--transition);
}

.btn-close-summary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.summary-content {
  padding: 16px 20px;
}

.summary-section {
  margin-bottom: 20px;
}

.summary-section:last-child {
  margin-bottom: 0;
}

.summary-section h5 {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
  gap: 8px;
}

.summary-item .label {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
  flex-shrink: 0;
}

.summary-item .value {
  font-size: 12px;
  color: var(--text-primary);
  text-align: right;
  word-break: break-word;
}

.summary-item .value.status-active {
  color: var(--success);
  font-weight: 600;
}

.summary-item .value.status-inactive {
  color: var(--error);
  font-weight: 600;
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 1200px) {
  .form-summary {
    position: relative;
    top: auto;
    right: auto;
    width: 100%;
    margin-top: 20px;
    max-height: none;
  }
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }

  .driver-form-modal {
    width: 100%;
    max-width: 100%;
    max-height: 100%;
    border-radius: var(--radius-lg);
  }

  .modal-header {
    padding: 16px 20px;
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .modal-title {
    font-size: 22px;
  }

  .form-progress {
    padding: 16px 20px;
  }

  .progress-steps {
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }

  .progress-steps::before {
    display: none;
  }

  .progress-step {
    flex: 0 0 calc(50% - 6px);
    max-width: 150px;
  }

  .step-info {
    max-width: none;
  }

  .driver-form {
    padding: 20px;
    max-height: calc(100vh - 160px);
  }

  .step-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .phone-input-group {
    flex-direction: column;
  }

  .country-select {
    flex: none;
  }

  .vehicle-selector {
    gap: 12px;
  }

  .vehicle-option {
    flex-direction: column;
    text-align: center;
    gap: 12px;
    padding: 16px;
  }

  .vehicle-info {
    text-align: center;
  }

  .vehicle-specs {
    justify-content: center;
  }

  .checkbox-grid {
    grid-template-columns: 1fr;
  }

  .schedule-header {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: center;
  }

  .schedule-row {
    grid-template-columns: 1fr;
    gap: 12px;
    text-align: center;
    padding: 16px;
    background: var(--bg-primary);
    border-radius: var(--radius);
    margin-bottom: 8px;
  }

  .time-inputs {
    justify-content: center;
  }

  .break-input {
    justify-content: center;
  }

  .preferences-grid {
    grid-template-columns: 1fr;
  }

  .upload-grid {
    grid-template-columns: 1fr;
  }

  .status-toggle {
    flex-direction: column;
    gap: 12px;
    text-align: center;
    min-width: auto;
  }

  .form-navigation {
    flex-direction: column;
    gap: 16px;
  }

  .nav-left,
  .nav-right {
    flex: none;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .nav-center {
    order: -1;
  }

  .btn-nav {
    width: 100%;
    max-width: 280px;
  }

  .quick-actions {
    flex-direction: column;
    align-items: center;
  }

  .btn-draft,
  .btn-reset,
  .btn-cancel {
    width: 200px;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .modal-header {
    padding: 12px 16px;
  }

  .modal-title {
    font-size: 18px;
  }

  .driver-form {
    padding: 16px;
  }

  .step-header {
    padding: 16px;
  }

  .step-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .step-content h3 {
    font-size: 18px;
  }

  .vehicle-option {
    padding: 12px;
  }

  .vehicle-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .photo-preview {
    width: 100px;
    height: 100px;
  }

  .btn-photo {
    width: 32px;
    height: 32px;
  }

  .form-navigation {
    padding: 16px 0;
  }

  .btn-nav {
    padding: 10px 16px;
    font-size: 13px;
    min-width: 100px;
  }
}

/* ==================== ACCESSIBILITY ==================== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus styles for keyboard navigation */
.form-group input:focus-visible,
.form-group select:focus-visible,
.btn-nav:focus-visible,
.vehicle-option:focus-visible,
.checkbox-item:focus-visible,
.progress-step:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --border: #000000;
    --text-primary: #000000;
    --text-secondary: #000000;
    --bg-primary: #ffffff;
    --bg-secondary: #f0f0f0;
  }
}

/* Print styles */
@media print {
  .modal-overlay {
    position: static;
    background: none;
    backdrop-filter: none;
  }

  .driver-form-modal {
    box-shadow: none;
    max-width: none;
    max-height: none;
  }

  .form-navigation,
  .quick-actions,
  .btn-close {
    display: none;
  }

  .form-step {
    page-break-inside: avoid;
  }

  .step-header {
    break-after: avoid;
  }
}

/* ==================== ADDITIONAL UTILITIES ==================== */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* ==================== DARK MODE SUPPORT ==================== */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1f2937;
    --bg-secondary: #374151;
    --bg-tertiary: #4b5563;
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --text-tertiary: #9ca3af;
    --border: #4b5563;
    --border-light: #6b7280;
  }
  
  .modal-header {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  }
}

/* ==================== CUSTOM SCROLLBAR ==================== */
.driver-form::-webkit-scrollbar {
  width: 8px;
}

.driver-form::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

.driver-form::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.driver-form::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* ==================== LOADING STATES ==================== */
.form-loading {
  position: relative;
  pointer-events: none;
  opacity: 0.7;
}

.form-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.form-loading::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  transform: translate(-50%, -50%);
  z-index: 11;
}

/* ==================== ENHANCED ANIMATIONS ==================== */
.bounce-in {
  animation: bounceIn 0.5s ease-out;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

/* ==================== ENHANCED FOCUS MANAGEMENT ==================== */
.form-group:focus-within label {
  color: var(--primary);
}

.form-group input:focus + label,
.form-group select:focus + label {
  color: var(--primary);
}

/* ==================== TOOLTIP STYLES ==================== */
.tooltip {
  position: relative;
}

.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-dark);
  color: var(--text-light);
  padding: 8px 12px;
  border-radius: var(--radius);
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: var(--transition);
  z-index: 1000;
  margin-bottom: 8px;
}

.tooltip:hover::after {
  opacity: 1;
}

/* ==================== ERROR ANIMATIONS ==================== */
.error-shake {
  animation: errorShake 0.5s ease-in-out;
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}

/* ==================== SUCCESS ANIMATIONS ==================== */
.success-pulse {
  animation: successPulse 0.6s ease-in-out;
}

@keyframes successPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
</style>