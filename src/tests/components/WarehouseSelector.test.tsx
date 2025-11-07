/**
 * Tests for WarehouseSelector Component
 * Sprint 4 Quick Win - Warehouse Names Correction
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { WarehouseSelector } from '@/components/orders/WarehouseSelector';

describe('WarehouseSelector', () => {
  it('should display correct warehouse names', () => {
    const mockOnChange = jest.fn();
    render(<WarehouseSelector value="" onChange={mockOnChange} />);

    // Check for updated warehouse names
    expect(screen.getByText('Baltimore')).toBeInTheDocument();
    expect(screen.getByText('Warrenton')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
  });

  it('renders only the supported warehouse options', () => {
    const mockOnChange = jest.fn();
    const { container } = render(<WarehouseSelector value="" onChange={mockOnChange} />);

    const optionLabels = Array.from(
      container.querySelectorAll('option')
    ).map(option => option.textContent?.trim());

    expect(optionLabels).toEqual(['Select warehouse', 'Baltimore', 'Warrenton', 'Storage']);
  });

  it('should call onChange with correct warehouse value', () => {
    const mockOnChange = jest.fn();
    const { container } = render(
      <WarehouseSelector value="" onChange={mockOnChange} />
    );

    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Warrenton' } });

    expect(mockOnChange).toHaveBeenCalledWith('Warrenton');
  });

  it('should display selected warehouse', () => {
    const mockOnChange = jest.fn();
    render(<WarehouseSelector value="Baltimore" onChange={mockOnChange} />);

    expect(screen.getByText(/Orders from.*Baltimore.*warehouse/)).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnChange = jest.fn();
    const { container } = render(
      <WarehouseSelector value="" onChange={mockOnChange} disabled />
    );

    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).toBeDisabled();
  });
});
