"use client";

import { useState, useEffect } from "react";
import ReactSelect from "react-select";
import CreatableSelect from "react-select/creatable";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  creatable?: boolean;
  onCreateOption?: (inputValue: string) => void;
  isLoading?: boolean;
}

const customStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    backgroundColor: state.isFocused ? "var(--bg-dropdown)" : "rgba(0,0,0,0.5)",
    borderColor: state.isFocused ? "var(--accent)" : "var(--border-primary)",
    borderRadius: "8px",
    padding: "2px 4px",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(16, 185, 129, 0.15)" : "none",
    fontSize: "14px",
    "&:hover": {
      borderColor: "var(--border-secondary)",
    },
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: "var(--bg-dropdown)",
    border: "1px solid var(--border-secondary)",
    borderRadius: "12px",
    boxShadow: "var(--shadow-lg)",
    overflow: "hidden",
    zIndex: 9999,
  }),
  menuPortal: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 9999,
  }),
  menuList: (base: Record<string, unknown>) => ({
    ...base,
    padding: "4px",
  }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "var(--accent)"
      : state.isFocused
      ? "var(--bg-elevated)"
      : "transparent",
    color: state.isSelected ? "white" : "var(--text-primary)",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "14px",
    cursor: "pointer",
    "&:active": {
      backgroundColor: "var(--accent-soft)",
    },
  }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: "var(--text-primary)",
  }),
  input: (base: Record<string, unknown>) => ({
    ...base,
    color: "var(--text-primary)",
  }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: "var(--text-muted)",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (base: Record<string, unknown>) => ({
    ...base,
    color: "var(--text-muted)",
    "&:hover": {
      color: "var(--text-secondary)",
    },
  }),
  clearIndicator: (base: Record<string, unknown>) => ({
    ...base,
    color: "var(--text-muted)",
    "&:hover": {
      color: "var(--danger)",
    },
  }),
  noOptionsMessage: (base: Record<string, unknown>) => ({
    ...base,
    color: "var(--text-muted)",
    fontSize: "14px",
  }),
};

export default function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  error,
  required,
  creatable = false,
  onCreateOption,
  isLoading = false,
}: SearchableSelectProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalTarget(document.body); }, []);

  const selectedOption = options.find((o) => o.value === value) || null;

  const Component = creatable ? CreatableSelect : ReactSelect;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-body mb-1.5">
          {label}
          {required && <span className="text-accent ml-0.5">*</span>}
        </label>
      )}
      <Component
        options={options}
        value={selectedOption}
        onChange={(opt) => onChange((opt as Option)?.value || "")}
        placeholder={placeholder}
        styles={customStyles}
        isClearable
        isLoading={isLoading}
        noOptionsMessage={() => "Sin resultados"}
        formatCreateLabel={(input: string) => `Crear "${input}"`}
        onCreateOption={onCreateOption}
        menuPlacement="auto"
        menuPortalTarget={portalTarget}
        menuPosition="fixed"
      />
      {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
    </div>
  );
}
