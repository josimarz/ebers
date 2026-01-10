/**
 * Utility functions for input masks
 */

/**
 * Applies CPF mask (000.000.000-00)
 */
export function applyCpfMask(value: string): string {
  if (!value) return '';
  
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Apply mask based on length
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  } else if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  } else {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
}

/**
 * Applies phone mask ((11) 99999-9999)
 */
export function applyPhoneMask(value: string): string {
  if (!value) return '';
  
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Apply mask based on length
  if (digits.length <= 2) {
    return digits;
  } else if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  } else if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  } else {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }
}

/**
 * Applies currency mask (R$ 0,00)
 */
export function applyCurrencyMask(value: string): string {
  if (!value) return '';
  
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  if (!digits) return '';
  
  // Convert to number and format as currency
  const number = parseInt(digits, 10) / 100;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(number);
}

/**
 * Removes CPF mask and returns only digits
 */
export function removeCpfMask(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Removes phone mask and returns only digits
 */
export function removePhoneMask(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Removes currency mask and returns numeric value
 */
export function removeCurrencyMask(value: string): number {
  if (!value) return 0;
  
  // Remove currency symbol, spaces, and convert comma to dot
  const cleanValue = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.'); // Convert decimal comma to dot
  
  return parseFloat(cleanValue) || 0;
}