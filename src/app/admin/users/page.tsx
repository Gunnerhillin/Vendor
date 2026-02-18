"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, Shield, ShoppingBag, User, Search } from "lucide-react"
import type { Profile, UserRole } from "@/types"

const roleBadge: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-800",
  vendor: "bg-blue-100 text-blue-800",
  customer: "bg-gray-100 text-gray-700",
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setProfiles(data as Profile[])
    }
    setLoading(false)
  }

  const updateRole = async (userId: string, newRole: UserRole) => {
    setUpdating(userId)
    const supabase = createClient()

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId)

    if (!error) {
      setProfiles(profiles.map(p =>
        p.id === userId ? { ...p, role: newRole } : p
      ))
    }
    setUpdating(null)
  }

  const filtered = profiles.filter(p =>
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: profiles.length,
    admins: profiles.filter(p => p.role === "admin").length,
    vendors: profiles.filter(p => p.role === "vendor").length,
    customers: profiles.filter(p => p.role === "customer").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-primary mb-1">Users & Roles</h1>
        <p className="text-sm text-gray-500">Manage user accounts and assign roles</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-warm-300">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-gray-500" />
            <span className="text-xs text-gray-500 font-medium">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-warm-300">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-purple-600" />
            <span className="text-xs text-gray-500 font-medium">Admins</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.admins}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-warm-300">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={16} className="text-blue-600" />
            <span className="text-xs text-gray-500 font-medium">Vendors</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.vendors}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-warm-300">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-gray-500" />
            <span className="text-xs text-gray-500 font-medium">Customers</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.customers}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="input pl-11"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-warm-300 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-warm-300 bg-warm-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Current Role</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Change Role</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                  {search ? "No users match your search" : "No users found"}
                </td>
              </tr>
            ) : (
              filtered.map((profile) => (
                <tr key={profile.id} className="border-b border-warm-300 last:border-b-0 hover:bg-warm-100/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent-dark">
                        {(profile.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-primary">{profile.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{profile.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[profile.role]}`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={profile.role}
                      onChange={(e) => updateRole(profile.id, e.target.value as UserRole)}
                      disabled={updating === profile.id}
                      className="text-sm border border-warm-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:opacity-50"
                    >
                      <option value="customer">Customer</option>
                      <option value="vendor">Vendor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
