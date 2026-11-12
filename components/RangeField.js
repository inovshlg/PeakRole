'use client';

import { useState } from 'react';

/** Slider with a live value label (e.g. years of experience). */
export default function RangeField({ name, min = 0, max = 25, defaultValue = 0, label, format = (v) => v }) {
  const [v, setV] = useState(Number(defaultValue) || 0);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={name} className="text-sm font-semibold">{label}</label>
        <output htmlFor={name} className="font-display text-2xl font-bold text-brand-500">{format(v)}</output>
      </div>
      <input id={name} type="range" name={name} min={min} max={max} value={v} onChange={(e) => setV(Number(e.target.value))} className="mt-3 w-full accent-brand-500" />
      <div className="mt-1 flex justify-between text-xs text-muted"><span>{format(min)}</span><span>{format(max)}</span></div>
    </div>
  );
}
