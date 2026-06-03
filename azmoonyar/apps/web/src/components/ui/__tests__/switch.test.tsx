import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Switch } from '../switch';

describe('Switch Component', () => {
  it('renders with label', () => {
    render(<Switch label="Enable notifications" />);
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('calls onCheckedChange when toggled', () => {
    const handleChange = jest.fn();
    render(<Switch label="Test switch" onCheckedChange={handleChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('can be checked by default', () => {
    render(<Switch label="Checked switch" checked />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('can be disabled', () => {
    render(<Switch label="Disabled switch" disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('renders without label', () => {
    const { container } = render(<Switch />);
    expect(container.querySelector('input[type="checkbox"]')).toBeInTheDocument();
  });
});
