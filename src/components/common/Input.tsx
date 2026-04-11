"use client";

import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">
            {label}
            {props.required && <span className="text-[--accent] ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-[--bg-input] border rounded-lg px-3.5 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-[--accent]/30 focus:border-[--accent] transition-all duration-200 ${
            error ? "border-[--danger]" : "border-[--border-primary]"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-[--danger] text-xs mt-1.5">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
