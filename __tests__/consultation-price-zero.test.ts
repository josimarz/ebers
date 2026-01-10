import { PatientSchema } from '@/lib/validations';

describe('Consultation Price Validation', () => {
  const basePatientData = {
    name: 'João Silva',
    birthDate: new Date('1990-01-01'),
    gender: 'MALE' as const,
    religion: 'CATHOLIC' as const,
    phone1: '11999999999',
    hasTherapyHistory: false,
    takesMedication: false,
    hasHospitalization: false,
    credits: 0
  };

  it('should reject consultation price of 0', () => {
    const patientData = {
      ...basePatientData,
      consultationPrice: 0
    };

    const result = PatientSchema.safeParse(patientData);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error.issues.some(issue => 
        issue.path.includes('consultationPrice') && 
        issue.message.includes('maior que zero')
      )).toBe(true);
    }
  });

  it('should accept positive consultation prices', () => {
    const patientData = {
      ...basePatientData,
      consultationPrice: 150.50
    };

    const result = PatientSchema.safeParse(patientData);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.consultationPrice).toBe(150.50);
    }
  });

  it('should reject negative consultation prices', () => {
    const patientData = {
      ...basePatientData,
      consultationPrice: -50
    };

    const result = PatientSchema.safeParse(patientData);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error.issues.some(issue => 
        issue.path.includes('consultationPrice') && 
        (issue.message.includes('maior que zero') || issue.message.includes('positivo'))
      )).toBe(true);
    }
  });

  it('should accept undefined consultation price', () => {
    const patientData = {
      ...basePatientData,
      consultationPrice: undefined
    };

    const result = PatientSchema.safeParse(patientData);
    expect(result.success).toBe(true);
  });
});