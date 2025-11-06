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
    expect(screen.getByText('Warrington')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
  });

  it('should NOT display old warehouse names', () => {
    const mockOnChange = jest.fn();
    render(<WarehouseSelector value="" onChange={mockOnChange} />);

    // Verify old names are not present
    expect(screen.queryByText('Warrenton')).not.toBeInTheDocument();
    expect(screen.queryByText('Main Warehouse')).not.toBeInTheDocument();
  });

  it('should call onChange with correct warehouse value', () => {
    const mockOnChange = jest.fn();
    const { container } = render(
      <WarehouseSelector value="" onChange={mockOnChange} />
    );

    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Warrington' } });

    expect(mockOnChange).toHaveBeenCalledWith('Warrington');
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
