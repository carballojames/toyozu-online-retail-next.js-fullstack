"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Address = {
  id: string
  label: string
  fullName: string
  phone: string
  line1: string
  city: string
  province: string
  region: string
  isDefault?: boolean
}

const MOCK_ADDRESSES: Address[] = [
  {
    id: "addr_1",
    label: "Home",
    fullName: "Juan Dela Cruz",
    phone: "0917 000 0000",
    line1: "123 Main St, Barangay Sample",
    city: "Makati",
    province: "Metro Manila",
    region: "NCR",
    isDefault: true,
  },
  {
    id: "addr_2",
    label: "Work",
    fullName: "Juan Dela Cruz",
    phone: "0917 000 0000",
    line1: "Bldg 2, Example Ave",
    city: "Taguig",
    province: "Metro Manila",
    region: "NCR",
  },
]

export default function AddressSection() {
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [label, setLabel] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [line1, setLine1] = useState("")
  const [city, setCity] = useState("")
  const [province, setProvince] = useState("")
  const [region, setRegion] = useState("")

  const hasDefault = useMemo(() => addresses.some((a) => a.isDefault), [addresses])

  const resetForm = () => {
    setLabel("")
    setFullName("")
    setPhone("")
    setLine1("")
    setCity("")
    setProvince("")
    setRegion("")
  }

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!label || !fullName || !phone || !line1 || !city || !province || !region) {
      setMessage("Please complete all fields.")
      return
    }

    const newAddress: Address = {
      id: `addr_${Date.now()}`,
      label,
      fullName,
      phone,
      line1,
      city,
      province,
      region,
      isDefault: !hasDefault,
    }

    setAddresses((prev) => [newAddress, ...prev])
    setShowForm(false)
    resetForm()
    setMessage("Address saved (demo only).")
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">My Addresses</h2>
        <p className="text-muted-foreground">Manage your delivery addresses</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Demo only (no backend)</div>
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ Add New Address"}</Button>
        </div>

        {message && (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">{message}</div>
        )}

        {showForm && (
          <form onSubmit={handleAddAddress} className="bg-card p-6 rounded-lg border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home / Work" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Full name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917 000 0000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Region</label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="NCR" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Province</label>
                <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Metro Manila" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Makati" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Address line</label>
              <Input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street / House / Building No." />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                  setMessage(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Address</Button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <div key={address.id} className="bg-card p-6 rounded-lg border relative">
              {address.isDefault && (
                <div className="absolute top-4 right-4">
                  <Badge variant="primary">Default</Badge>
                </div>
              )}

              <div className="mb-3">
                <div className="text-lg font-semibold text-foreground">{address.label}</div>
                <div className="text-sm text-muted-foreground">
                  {address.fullName} • {address.phone}
                </div>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="text-foreground font-medium">{address.line1}</div>
                <div>
                  {address.city}, {address.province}
                </div>
                <div>{address.region}</div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === address.id })))
                    setMessage("Default address updated (demo only).")
                  }}
                >
                  Set Default
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddresses((prev) => prev.filter((a) => a.id !== address.id))
                    setMessage("Address removed (demo only).")
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}