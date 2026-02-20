"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PatientSchema, 
  PatientIpadSchema, 
  formatValidationErrors,
  Gender,
  Religion,
  ConsultationFrequency,
  DayOfWeek
} from '@/lib/validations';
import { cn } from '@/lib/utils';
import { PatientPhoto, Button, Card, CardBody } from '@/components/ui';
import MaskedInput from '@/components/ui/MaskedInput';
import { removeCpfMask, removePhoneMask, removeCurrencyMask } from '@/lib/masks';
import { useToast } from '@/lib/toast-context';

interface PatientRegistrationFormProps {
  isIpad?: boolean;
  initialData?: Partial<PatientFormData>;
  onSubmit?: (data: PatientFormData) => Promise<void>;
  submitButtonText?: string;
}

interface PatientFormData {
  name: string;
  profilePhoto?: string;
  birthDate: string;
  gender: string;
  cpf: string;
  rg?: string;
  religion: string;
  legalGuardian?: string;
  legalGuardianEmail?: string;
  legalGuardianCpf?: string;
  phone1: string;
  phone2?: string;
  email?: string;
  hasTherapyHistory: boolean;
  therapyHistoryDetails?: string;
  therapyReason?: string;
  takesMedication: boolean;
  medicationSince?: string;
  medicationNames?: string;
  hasHospitalization: boolean;
  hospitalizationDate?: string;
  hospitalizationReason?: string;
  consultationPrice?: number;
  consultationFrequency?: string;
  consultationDay?: string;
  credits?: number;
}

const genderOptions = [
  { value: Gender.MALE, label: 'Masculino' },
  { value: Gender.FEMALE, label: 'Feminino' },
  { value: Gender.NON_BINARY, label: 'Não binário' }
];

const religionOptions = [
  { value: Religion.ATHEIST, label: 'Ateu' },
  { value: Religion.BUDDHISM, label: 'Budismo' },
  { value: Religion.CANDOMBLE, label: 'Candomblé' },
  { value: Religion.CATHOLIC, label: 'Católica' },
  { value: Religion.SPIRITIST, label: 'Espírita' },
  { value: Religion.SPIRITUALIST, label: 'Espiritualista' },
  { value: Religion.EVANGELICAL, label: 'Evangélica' },
  { value: Religion.HINDUISM, label: 'Hinduísmo' },
  { value: Religion.ISLAM, label: 'Islamismo' },
  { value: Religion.JUDAISM, label: 'Judaísmo' },
  { value: Religion.MORMON, label: 'Mórmon' },
  { value: Religion.NO_RELIGION, label: 'Sem religião' },
  { value: Religion.JEHOVAH_WITNESS, label: 'Testemunha de Jeová' },
  { value: Religion.UMBANDA, label: 'Umbanda' }
];

const frequencyOptions = [
  { value: ConsultationFrequency.WEEKLY, label: 'Semanal' },
  { value: ConsultationFrequency.BIWEEKLY, label: 'Quinzenal' },
  { value: ConsultationFrequency.MONTHLY, label: 'Mensal' },
  { value: ConsultationFrequency.SPORADIC, label: 'Esporádica' }
];

const dayOptions = [
  { value: DayOfWeek.MONDAY, label: 'Segunda-feira' },
  { value: DayOfWeek.TUESDAY, label: 'Terça-feira' },
  { value: DayOfWeek.WEDNESDAY, label: 'Quarta-feira' },
  { value: DayOfWeek.THURSDAY, label: 'Quinta-feira' },
  { value: DayOfWeek.FRIDAY, label: 'Sexta-feira' },
  { value: DayOfWeek.SATURDAY, label: 'Sábado' },
  { value: DayOfWeek.SUNDAY, label: 'Domingo' }
];

export default function PatientRegistrationForm({
  isIpad = false,
  initialData,
  onSubmit,
  submitButtonText = 'Salvar Paciente'
}: PatientRegistrationFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Form data state
  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    birthDate: '',
    gender: '',
    religion: '',
    phone1: '',
    hasTherapyHistory: false,
    takesMedication: false,
    hasHospitalization: false,
    ...initialData
  });

  // Real-time validation
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      validateForm();
    }
  }, [formData]);

  const validateForm = () => {
    try {
      // Convert form data to proper types for validation
      const dataToValidate = {
        ...formData,
        // Handle birthDate properly - if empty string, leave as empty string for validation
        birthDate: formData.birthDate || '',
        consultationPrice: formData.consultationPrice ? Number(formData.consultationPrice) : undefined,
        credits: formData.credits ?? 0,
        // Handle empty optional strings - convert to undefined
        profilePhoto: formData.profilePhoto || undefined,
        cpf: formData.cpf || undefined,
        rg: formData.rg || undefined,
        legalGuardian: formData.legalGuardian || undefined,
        legalGuardianEmail: formData.legalGuardianEmail || undefined,
        legalGuardianCpf: formData.legalGuardianCpf || undefined,
        phone2: formData.phone2 || undefined,
        email: formData.email || undefined,
        therapyHistoryDetails: formData.therapyHistoryDetails || undefined,
        therapyReason: formData.therapyReason || undefined,
        medicationSince: formData.medicationSince || undefined,
        medicationNames: formData.medicationNames || undefined,
        hospitalizationDate: formData.hospitalizationDate || undefined,
        hospitalizationReason: formData.hospitalizationReason || undefined,
        consultationFrequency: formData.consultationFrequency || undefined,
        consultationDay: formData.consultationDay || undefined
      };

      // Use appropriate schema based on device type
      const schema = isIpad ? PatientIpadSchema : PatientSchema;
      schema.parse(dataToValidate);
      
      setErrors({});
      return true;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'issues' in error) {
        const formattedErrors = formatValidationErrors(error as import('zod').ZodError);
        setErrors(formattedErrors);
        console.error('Validation errors:', formattedErrors);
      }
      return false;
    }
  };

  const handleInputChange = (field: keyof PatientFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreview(result);
        handleInputChange('profilePhoto', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Force validation on submit to show errors
    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default submission to API
        const response = await fetch('/api/patients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            birthDate: formData.birthDate,
            consultationPrice: formData.consultationPrice ? Number(formData.consultationPrice) : undefined
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.details) {
            setErrors(errorData.details);
          } else {
            throw new Error(errorData.error || 'Erro ao salvar paciente');
          }
          return;
        }

        // Success - redirect or show success message
        if (!isIpad) {
          router.push('/patients');
        } else {
          // For iPad, show success message and reset form
          showToast('Paciente cadastrado com sucesso!', 'success');
          setFormData({
            name: '',
            birthDate: '',
            gender: '',
            religion: '',
            phone1: '',
            hasTherapyHistory: false,
            takesMedication: false,
            hasHospitalization: false
          });
          setPhotoPreview(null);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      showToast(error instanceof Error ? error.message : 'Erro ao salvar paciente', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn(
      isIpad && "max-w-4xl mx-auto"
    )}>
      <CardBody>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-text mb-2">
            {isIpad ? 'Cadastro de Paciente' : 'Cadastro de Novo Paciente'}
          </h2>
          {isIpad && (
            <p className="text-gray-600">
              Preencha os dados abaixo para se cadastrar no sistema.
            </p>
          )}
        </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <PatientPhoto 
              src={photoPreview || formData.profilePhoto} 
              alt="Foto do paciente"
              size="large"
            />
            <label 
              htmlFor="photo-upload"
              className="absolute bottom-0 right-0 bg-primary-500 text-white rounded-full p-2 cursor-pointer hover:bg-secondary-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </label>
          </div>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <p className="text-sm text-gray-500">
            Clique no ícone + para adicionar uma foto
          </p>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                errors.name ? "border-red-500" : "border-gray-300"
              )}
              placeholder="Digite o nome completo"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Birth Date */}
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
              Data de Nascimento *
            </label>
            <input
              type="date"
              id="birthDate"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                errors.birthDate ? "border-red-500" : "border-gray-300"
              )}
            />
            {errors.birthDate && (
              <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
              Gênero *
            </label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className={cn(
                "w-full px-4 py-3 border-2 rounded-xl shadow-soft transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500",
                errors.gender ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <option value="">Selecione o gênero</option>
              {genderOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.gender && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <span className="text-red-500">⚠</span>
                {errors.gender}
              </p>
            )}
          </div>

          {/* Religion */}
          <div>
            <label htmlFor="religion" className="block text-sm font-medium text-gray-700 mb-2">
              Religião *
            </label>
            <select
              id="religion"
              value={formData.religion}
              onChange={(e) => handleInputChange('religion', e.target.value)}
              className={cn(
                "w-full px-4 py-3 border-2 rounded-xl shadow-soft transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500",
                errors.religion ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <option value="">Selecione a religião</option>
              {religionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.religion && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <span className="text-red-500">⚠</span>
                {errors.religion}
              </p>
            )}
          </div>

          {/* CPF */}
          <div>
            <MaskedInput
              mask="cpf"
              label="CPF *"
              value={formData.cpf || ''}
              onChange={(maskedValue, rawValue) => handleInputChange('cpf', rawValue)}
              error={errors.cpf}
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Informações de Contato</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone 1 */}
            <div>
              <MaskedInput
                mask="phone"
                label="Telefone Principal"
                value={formData.phone1}
                onChange={(maskedValue, rawValue) => handleInputChange('phone1', rawValue)}
                error={errors.phone1}
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            {/* Phone 2 */}
            <div>
              <MaskedInput
                mask="phone"
                label="Telefone Secundário"
                value={formData.phone2 || ''}
                onChange={(maskedValue, rawValue) => handleInputChange('phone2', rawValue)}
                placeholder="(11) 99999-9999"
              />
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                  errors.email ? "border-red-500" : "border-gray-300"
                )}
                placeholder="email@exemplo.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Legal Guardian Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Responsável Legal</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Legal Guardian */}
            <div>
              <label htmlFor="legalGuardian" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Responsável
              </label>
              <input
                type="text"
                id="legalGuardian"
                value={formData.legalGuardian || ''}
                onChange={(e) => handleInputChange('legalGuardian', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Nome completo do responsável"
              />
            </div>

            {/* Legal Guardian Email */}
            <div>
              <label htmlFor="legalGuardianEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Email do Responsável {formData.legalGuardian && '*'}
              </label>
              <input
                type="email"
                id="legalGuardianEmail"
                value={formData.legalGuardianEmail || ''}
                onChange={(e) => handleInputChange('legalGuardianEmail', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                  errors.legalGuardianEmail ? "border-red-500" : "border-gray-300"
                )}
                placeholder="email@exemplo.com"
              />
              {errors.legalGuardianEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.legalGuardianEmail}</p>
              )}
            </div>
          </div>
        </div>

        {/* Medical History */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Histórico Médico</h3>
          
          {/* Therapy History */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="hasTherapyHistory"
                checked={formData.hasTherapyHistory}
                onChange={(e) => handleInputChange('hasTherapyHistory', e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="hasTherapyHistory" className="text-sm font-medium text-gray-700">
                Já fez terapia antes? *
              </label>
            </div>
            
            {formData.hasTherapyHistory && (
              <div>
                <label htmlFor="therapyHistoryDetails" className="block text-sm font-medium text-gray-700 mb-2">
                  Quando fez terapia?
                </label>
                <textarea
                  id="therapyHistoryDetails"
                  value={formData.therapyHistoryDetails || ''}
                  onChange={(e) => handleInputChange('therapyHistoryDetails', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Descreva quando e por quanto tempo fez terapia"
                />
              </div>
            )}

            <div>
              <label htmlFor="therapyReason" className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de estar fazendo terapia
              </label>
              <textarea
                id="therapyReason"
                value={formData.therapyReason || ''}
                onChange={(e) => handleInputChange('therapyReason', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Descreva o motivo pelo qual está buscando terapia"
              />
            </div>
          </div>

          {/* Medication */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="takesMedication"
                checked={formData.takesMedication}
                onChange={(e) => handleInputChange('takesMedication', e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="takesMedication" className="text-sm font-medium text-gray-700">
                Toma algum medicamento? *
              </label>
            </div>
            
            {formData.takesMedication && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="medicationSince" className="block text-sm font-medium text-gray-700 mb-2">
                    Toma medicamento desde quando?
                  </label>
                  <input
                    type="text"
                    id="medicationSince"
                    value={formData.medicationSince || ''}
                    onChange={(e) => handleInputChange('medicationSince', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Ex: Janeiro de 2023"
                  />
                </div>
                <div>
                  <label htmlFor="medicationNames" className="block text-sm font-medium text-gray-700 mb-2">
                    Nomes dos medicamentos
                  </label>
                  <input
                    type="text"
                    id="medicationNames"
                    value={formData.medicationNames || ''}
                    onChange={(e) => handleInputChange('medicationNames', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Ex: Sertralina, Rivotril"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Hospitalization */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="hasHospitalization"
                checked={formData.hasHospitalization}
                onChange={(e) => handleInputChange('hasHospitalization', e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="hasHospitalization" className="text-sm font-medium text-gray-700">
                Já foi hospitalizado por questões psicológicas? *
              </label>
            </div>
            
            {formData.hasHospitalization && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="hospitalizationDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Quando foi hospitalizado?
                  </label>
                  <input
                    type="text"
                    id="hospitalizationDate"
                    value={formData.hospitalizationDate || ''}
                    onChange={(e) => handleInputChange('hospitalizationDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Ex: Janeiro de 2022"
                  />
                </div>
                <div>
                  <label htmlFor="hospitalizationReason" className="block text-sm font-medium text-gray-700 mb-2">
                    Razão da hospitalização
                  </label>
                  <input
                    type="text"
                    id="hospitalizationReason"
                    value={formData.hospitalizationReason || ''}
                    onChange={(e) => handleInputChange('hospitalizationReason', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Descreva a razão"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Consultation Settings - Hidden on iPad */}
        {!isIpad && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Configurações de Consulta</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Consultation Price */}
              <div>
                <MaskedInput
                  mask="currency"
                  label="Valor da Consulta"
                  value={formData.consultationPrice?.toString() || ''}
                  onChange={(maskedValue, rawValue) => {
                    const numericValue = removeCurrencyMask(maskedValue);
                    handleInputChange('consultationPrice', numericValue);
                  }}
                  error={errors.consultationPrice}
                  placeholder="R$ 0,00"
                  helperText="Digite 0 para consultas gratuitas"
                />
              </div>

              {/* Consultation Frequency */}
              <div>
                <label htmlFor="consultationFrequency" className="block text-sm font-medium text-gray-700 mb-2">
                  Periodicidade
                </label>
                <select
                  id="consultationFrequency"
                  value={formData.consultationFrequency || ''}
                  onChange={(e) => handleInputChange('consultationFrequency', e.target.value)}
                  className="w-full px-4 py-3 border-2 rounded-xl shadow-soft transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 border-gray-200 hover:border-gray-300"
                >
                  <option value="">Selecione a periodicidade</option>
                  {frequencyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Consultation Day */}
              <div>
                <label htmlFor="consultationDay" className="block text-sm font-medium text-gray-700 mb-2">
                  Dia da Semana
                </label>
                <select
                  id="consultationDay"
                  value={formData.consultationDay || ''}
                  onChange={(e) => handleInputChange('consultationDay', e.target.value)}
                  className="w-full px-4 py-3 border-2 rounded-xl shadow-soft transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 border-gray-200 hover:border-gray-300"
                >
                  <option value="">Selecione o dia</option>
                  {dayOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          {!isIpad && (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
          >
            {submitButtonText}
          </Button>
        </div>
      </form>
      </CardBody>
    </Card>
  );
}