import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Input } from '@/components/ui';

function TestInputWrapper(props: { secureTextEntry?: boolean }) {
  const [val, setVal] = useState('');
  return (
    <Input
      label="Test Label"
      value={val}
      onChangeText={setVal}
      placeholder="Type here..."
      secureTextEntry={props.secureTextEntry}
    />
  );
}

describe('Input Component', () => {
  it('renders label and updates text value', async () => {
    await render(<TestInputWrapper />);

    expect(screen.getByText('Test Label')).toBeTruthy();
    const input = screen.getByPlaceholderText('Type here...');
    fireEvent.changeText(input, 'Student Name');
    expect(await screen.findByDisplayValue('Student Name')).toBeTruthy();
  });

  it('renders error message with alert role and aria-invalid', async () => {
    await render(
      <Input
        label="Email"
        value=""
        onChangeText={jest.fn()}
        error="Invalid email format"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(screen.getByText('Invalid email format')).toBeTruthy();
  });

  it('toggles password visibility when secureTextEntry is set', async () => {
    await render(<TestInputWrapper secureTextEntry={true} />);

    const toggleButton = screen.getByRole('button', { name: 'Show password' });
    expect(toggleButton).toBeTruthy();

    fireEvent.press(toggleButton);
    expect(await screen.findByRole('button', { name: 'Hide password' })).toBeTruthy();
  });
});
