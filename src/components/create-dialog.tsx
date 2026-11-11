"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"

export interface FieldDef {
  name: string
  label: string
  placeholder?: string
  type?: string
  default?: string
  upper?: boolean
  select?: { value: string; label: string }[]
}

export function CreateDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
  loading,
  fields,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (p: Record<string, unknown>) => void
  loading: boolean
  fields: FieldDef[]
}) {
  const [values, setValues] = useState<Record<string, string>>({})

  function submit() {
    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      const v = values[f.name] ?? f.default ?? ""
      if (f.type === "number") payload[f.name] = Number(v) || 0
      else payload[f.name] = f.upper ? v.toUpperCase() : v || null
    }
    onSubmit(payload)
    setValues({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              {f.select ? (
                <Select
                  value={values[f.name] ?? f.default ?? ""}
                  onValueChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {f.select.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={f.type ?? "text"}
                  value={values[f.name] ?? f.default ?? ""}
                  onChange={(e) =>
                    setValues((s) => ({
                      ...s,
                      [f.name]: f.upper ? e.target.value.toUpperCase() : e.target.value,
                    }))
                  }
                  placeholder={f.placeholder}
                  className="h-9"
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const apiFetch = async (path: string) => {
  const r = await fetch(path, { cache: "no-store" })
  return r.json()
}
