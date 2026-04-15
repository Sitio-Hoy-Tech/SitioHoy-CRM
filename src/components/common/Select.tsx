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
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-body mb-1.5">
            {label}
            {props.required && <span className="text-accent ml-0.5">*</span>}
          </label>
        )}
        <div className="relative group">
          <select
            ref={ref}
            className={`w-full appearance-none bg-[#0f172a]/80 backdrop-blur-md border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-heading cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-300 hover:bg-[#0f172a]/95 ${
              error ? "border-danger" : "border-edge"
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" className="bg-[#0f172a] text-muted">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0f172a] text-heading">
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom Arrow */}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted/60 group-hover:text-accent transition-colors duration-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
