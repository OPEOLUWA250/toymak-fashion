"use client";

import { useState, type InputHTMLAttributes } from "react";

/**
 * A number box that can be cleared while typing. A plain controlled
 * `type="number"` input turns an empty box straight back into "0", so the
 * zero can't be deleted. Here the typed text is kept as-is, an empty box
 * counts as 0, and the text tidies up once the field loses focus.
 */
export function NumberInput({
  value,
  onValueChange,
  integer = false,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (value: number) => void;
  integer?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);

  // Follow changes made from outside (e.g. settings reloaded after saving)
  // without overwriting what's being typed when it already means this value.
  if (value !== lastValue) {
    setLastValue(value);
    if (Number(text || 0) !== value) setText(String(value));
  }

  return (
    <input
      {...props}
      type="number"
      inputMode={integer ? "numeric" : "decimal"}
      value={text}
      onFocus={(event) => {
        event.target.select();
        props.onFocus?.(event);
      }}
      onChange={(event) => {
        setText(event.target.value);
        const parsed = Number(event.target.value || 0);
        if (Number.isFinite(parsed)) onValueChange(Math.max(0, integer ? Math.floor(parsed) : parsed));
      }}
      onBlur={(event) => {
        setText(String(value));
        props.onBlur?.(event);
      }}
    />
  );
}
