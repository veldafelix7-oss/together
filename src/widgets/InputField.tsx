/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error,
  required = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  const handleType = () => {
    if (isPassword) {
      return showPassword ? 'text' : 'password';
    }
    return type;
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[10px] font-semibold tracking-[0.15em] text-[#8E8E93] uppercase">
        {label}
      </label>
      <div className="relative w-full">
        <input
          id={id}
          type={handleType()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-[#141414] text-white placeholder-[#555558] text-[14px] px-4 py-3 rounded-xl border ${
            error ? 'border-red-500' : 'border-[#2C2C2E] focus:border-[#FF8DA1]/80'
          } focus:outline-none transition-colors duration-200 pr-12`}
        />
        {isPassword && (
          <button
            id={`${id}-toggle-visibility`}
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-400 mt-1">{error}</span>}
    </div>
  );
};
