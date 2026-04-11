"use client";

import { forwardRef } from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-body mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full bg-input border rounded-lg px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 ${
            error ? "border-danger" : "border-edge"
          } ${className}`}
          rows={3}
          {...props}
        />
        {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
