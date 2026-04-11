"use client";

import PhoneInputLib from "react-phone-number-input";
import type { E164Number } from "libphonenumber-js";

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export default function PhoneInput({ label, value, onChange, error, required }: PhoneInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">
          {label}
          {required && <span className="text-[--accent] ml-0.5">*</span>}
        </label>
      )}
      <PhoneInputLib
        international
        defaultCountry="AR"
        value={value as E164Number}
        onChange={(val) => onChange(val || "")}
        className={error ? "!border-[--danger]" : ""}
      />
      {error && <p className="text-[--danger] text-xs mt-1.5">{error}</p>}
    </div>
  );
}
