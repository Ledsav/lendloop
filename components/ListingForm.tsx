"use client";

import { useState } from "react";
import { CATEGORIES, CONDITIONS, type Category, type Condition } from "@/convex/lib/validators";
import { Button, ErrorText, inputClass } from "./ui";

export type ListingValues = { name: string; category: Category; condition: Condition; description: string };

const EMPTY: ListingValues = { name: "", category: "power tools", condition: "good", description: "" };

export function ListingForm({
  initial = EMPTY,
  submitLabel,
  error,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: ListingValues;
  submitLabel: string;
  error: string | null;
  pending: boolean;
  onSubmit: (values: ListingValues) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const set = <K extends keyof ListingValues>(key: K, value: ListingValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if ((await onSubmit(values)) && initial === EMPTY) setValues(EMPTY);
      }}
    >
      <label className="block text-sm text-stone-700">
        Name
        <input required minLength={2} maxLength={60} value={values.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="Cordless drill" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm text-stone-700">
          Category
          <select value={values.category} onChange={(e) => set("category", e.target.value as Category)} className={`${inputClass} capitalize`}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-stone-700">
          Condition
          <select value={values.condition} onChange={(e) => set("condition", e.target.value as Condition)} className={`${inputClass} capitalize`}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm text-stone-700">
        Short description
        <textarea maxLength={500} rows={2} value={values.description} onChange={(e) => set("description", e.target.value)} className={inputClass} placeholder="What's included, anything to know" />
      </label>
      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
