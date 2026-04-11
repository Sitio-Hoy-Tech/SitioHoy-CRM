"use client";

import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-body mb-1.5">
            {label}
            {props.required && <span className="text-accent ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full bg-input border rounded-lg px-3.5 py-2.5 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 ${
            error ? "border-danger" : "border-edge"
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="" className="text-muted">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
