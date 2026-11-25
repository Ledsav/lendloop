"use client";

import { useId, useState } from "react";
import { ErrorText } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, CONDITIONS, type Category, type Condition } from "@/convex/lib/validators";
import { CATEGORY_LABEL } from "@/lib/format";

export type ListingValues = { name: string; category: Category; condition: Condition; description: string };

const EMPTY: ListingValues = { name: "", category: "power tools", condition: "good", description: "" };
const CONDITION_LABEL: Record<Condition, string> = { new: "New", good: "Good", fair: "Fair", worn: "Worn, but works" };

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
  const id = useId();

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if ((await onSubmit(values)) && initial === EMPTY) setValues(EMPTY);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>What is it?</Label>
        <Input
          id={`${id}-name`}
          required
          minLength={2}
          maxLength={60}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Cordless drill"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${id}-category`}>Category</Label>
          <Select value={values.category} onValueChange={(v) => set("category", v as Category)}>
            <SelectTrigger id={`${id}-category`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-condition`}>Condition</Label>
          <Select value={values.condition} onValueChange={(v) => set("condition", v as Condition)}>
            <SelectTrigger id={`${id}-condition`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CONDITION_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-note`}>A note for borrowers</Label>
        <Textarea
          id={`${id}-note`}
          maxLength={500}
          rows={3}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What's included, anything to know"
        />
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
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
