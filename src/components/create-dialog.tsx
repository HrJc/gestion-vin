"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"

export interface FieldDef {
  name: string
  label: string
  placeholder?: string
  type?: string
  default?: string
  upper?: boolean
  select?: { value: string; label: string }[]
}

export const apiFetch = async (path: string) => {
  const r = await fetch(path, { cache: "no-store" })
  return r.json()
}

// ---------- Dialog de création ----------
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
                <Select value={values[f.name] ?? f.default ?? ""} onValueChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{f.select.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input type={f.type ?? "text"} value={values[f.name] ?? f.default ?? ""} onChange={(e) => setValues((s) => ({ ...s, [f.name]: f.upper ? e.target.value.toUpperCase() : e.target.value }))} placeholder={f.placeholder} className="h-9" />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Dialog d'édition (pré-rempli) ----------
export function EditDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
  loading,
  fields,
  record,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (p: Record<string, unknown>) => void
  loading: boolean
  fields: FieldDef[]
  record: Record<string, unknown> | null
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Initialisation depuis le record (au montage uniquement)
    if (!record) return {}
    const init: Record<string, string> = {}
    for (const f of fields) {
      const v = record[f.name]
      init[f.name] = v != null ? String(v) : (f.default ?? "")
    }
    return init
  })

  function submit() {
    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      const v = values[f.name] ?? f.default ?? ""
      if (f.type === "number") payload[f.name] = Number(v) || 0
      else payload[f.name] = f.upper ? v.toUpperCase() : v || null
    }
    onSubmit(payload)
  }

  if (!record) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              {f.select ? (
                <Select value={values[f.name] ?? ""} onValueChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{f.select.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input type={f.type ?? "text"} value={values[f.name] ?? ""} onChange={(e) => setValues((s) => ({ ...s, [f.name]: f.upper ? e.target.value.toUpperCase() : e.target.value }))} placeholder={f.placeholder} className="h-9" />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Bouton d'édition ----------
export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClick} title="Modifier">
      <Pencil className="w-4 h-4" />
    </Button>
  )
}

// ---------- Bouton de suppression avec confirmation ----------
export function ArchiveButton({
  onConfirm,
  loading,
  label = "Archiver",
  description = "Cet élément sera archivé. L'historique est conservé.",
}: {
  onConfirm: () => void
  loading?: boolean
  label?: string
  description?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setOpen(true)} title="Supprimer" disabled={loading}>
        <Trash2 className="w-4 h-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onConfirm(); setOpen(false) }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ---------- Mutations utilitaires ----------
export async function patchRecord(path: string, payload: Record<string, unknown>) {
  const r = await fetch(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
  return r.json()
}

export async function deleteRecord(path: string) {
  const r = await fetch(path, { method: "DELETE" })
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
  return r.json()
}
