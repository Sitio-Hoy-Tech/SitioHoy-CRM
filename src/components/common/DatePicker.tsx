"use client";

import ReactDatePicker from "react-datepicker";
import { es } from "date-fns/locale";

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

export default function DatePicker({
  label,
  value,
  onChange,
  error,
  required,
  placeholder = "Seleccionar fecha",
}: DatePickerProps) {
  const selected = value ? new Date(value + "T12:00:00") : null;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-body mb-1.5">
          {label}
          {required && <span className="text-accent ml-0.5">*</span>}
        </label>
      )}
      <ReactDatePicker
        selected={selected}
        onChange={(date: Date | null) => {
          if (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            onChange(`${year}-${month}-${day}`);
          } else {
            onChange("");
          }
        }}
        locale={es}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder}
        className={`w-full bg-input border rounded-lg px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 ${
          error ? "border-danger" : "border-edge"
        }`}
        calendarClassName="dark-calendar"
        showPopperArrow={false}
        isClearable
      />
      {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
    </div>
  );
}
