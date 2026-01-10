import { 
  applyCpfMask, 
  applyPhoneMask, 
  applyCurrencyMask,
  removeCpfMask,
  removePhoneMask,
  removeCurrencyMask
} from '@/lib/masks';

describe('Input Masks', () => {
  describe('CPF Mask', () => {
    it('should apply CPF mask correctly', () => {
      expect(applyCpfMask('')).toBe('');
      expect(applyCpfMask('123')).toBe('123');
      expect(applyCpfMask('12345')).toBe('123.45');
      expect(applyCpfMask('12345678')).toBe('123.456.78');
      expect(applyCpfMask('12345678901')).toBe('123.456.789-01');
    });

    it('should remove non-digit characters', () => {
      expect(applyCpfMask('123.456.789-01')).toBe('123.456.789-01');
      expect(applyCpfMask('abc123def456')).toBe('123.456');
    });

    it('should remove CPF mask', () => {
      expect(removeCpfMask('123.456.789-01')).toBe('12345678901');
      expect(removeCpfMask('123456789')).toBe('123456789');
    });
  });

  describe('Phone Mask', () => {
    it('should apply phone mask correctly', () => {
      expect(applyPhoneMask('')).toBe('');
      expect(applyPhoneMask('11')).toBe('11');
      expect(applyPhoneMask('1199')).toBe('(11) 99');
      expect(applyPhoneMask('119999')).toBe('(11) 9999');
      expect(applyPhoneMask('11999991234')).toBe('(11) 99999-1234');
    });

    it('should remove non-digit characters', () => {
      expect(applyPhoneMask('(11) 99999-1234')).toBe('(11) 99999-1234');
      expect(applyPhoneMask('abc11def99999')).toBe('(11) 99999');
    });

    it('should remove phone mask', () => {
      expect(removePhoneMask('(11) 99999-1234')).toBe('11999991234');
      expect(removePhoneMask('11999991234')).toBe('11999991234');
    });
  });

  describe('Currency Mask', () => {
    it('should apply currency mask correctly', () => {
      expect(applyCurrencyMask('')).toBe('');
      expect(applyCurrencyMask('0')).toMatch(/R\$\s*0,00/);
      expect(applyCurrencyMask('100')).toMatch(/R\$\s*1,00/);
      expect(applyCurrencyMask('1500')).toMatch(/R\$\s*15,00/);
      expect(applyCurrencyMask('150000')).toMatch(/R\$\s*1\.500,00/);
    });

    it('should remove non-digit characters', () => {
      expect(applyCurrencyMask('abc123def')).toMatch(/R\$\s*1,23/);
    });

    it('should remove currency mask', () => {
      expect(removeCurrencyMask('R$ 150,00')).toBe(150);
      expect(removeCurrencyMask('R$ 0,00')).toBe(0);
      expect(removeCurrencyMask('R$ 1.500,50')).toBe(1500.5);
      expect(removeCurrencyMask('')).toBe(0);
    });
  });
});