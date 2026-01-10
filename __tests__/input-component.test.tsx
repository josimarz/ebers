import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/Input';

describe('Input Component', () => {
  it('should maintain stable ID across re-renders', () => {
    const TestComponent = ({ value }: { value: string }) => (
      <Input 
        placeholder="Test input" 
        value={value}
        onChange={() => {}}
      />
    );

    const { rerender } = render(<TestComponent value="" />);
    
    const input = screen.getByPlaceholderText('Test input');
    const initialId = input.id;
    
    // Re-render with different props
    rerender(<TestComponent value="test" />);
    
    // ID should remain the same
    expect(input.id).toBe(initialId);
  });

  it('should use provided ID when given', () => {
    render(
      <Input 
        id="custom-id"
        placeholder="Test input"
      />
    );
    
    const input = screen.getByPlaceholderText('Test input');
    expect(input.id).toBe('custom-id');
  });

  it('should generate unique IDs for multiple inputs', () => {
    render(
      <div>
        <Input placeholder="Input 1" />
        <Input placeholder="Input 2" />
      </div>
    );
    
    const input1 = screen.getByPlaceholderText('Input 1');
    const input2 = screen.getByPlaceholderText('Input 2');
    
    expect(input1.id).not.toBe(input2.id);
    expect(input1.id).toBeTruthy();
    expect(input2.id).toBeTruthy();
  });

  it('should maintain focus when value changes', () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState('');
      
      return (
        <Input 
          placeholder="Test input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      );
    };

    render(<TestComponent />);
    
    const input = screen.getByPlaceholderText('Test input');
    
    // Focus the input
    input.focus();
    expect(document.activeElement).toBe(input);
    
    // Type in the input
    fireEvent.change(input, { target: { value: 'test' } });
    
    // Focus should be maintained
    expect(document.activeElement).toBe(input);
  });
});