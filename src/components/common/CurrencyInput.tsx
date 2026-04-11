"use client";

interface CurrencyInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

function formatCurrency(val: string): string {
  const num = val.replace(/[^\d]/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("es-AR");
}

function parseCurrency(formatted: string): string {
  return formatted.replace(/[^\d]/g, "");
}

export default function CurrencyInput({
  label,
  value,
  onChange,
  error,
  required,
  placeholder = "0",
}: CurrencyInputProps) {
  const displayValue = formatCurrency(value);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-body mb-1.5">
          {label}
          {required && <span className="text-accent ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">$</span>
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onChange(parseCurrency(e.target.value))}
          placeholder={placeholder}
          className={`w-full bg-input border rounded-lg pl-8 pr-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 ${
            error ? "border-danger" : "border-edge"
          }`}
        />
      </div>
      {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
    </div>
  );
}
