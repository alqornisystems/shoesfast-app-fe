"use client"

import { useState, useEffect } from "react"
import { Building2, Check, ChevronDown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

type Project = {
  id: number
  name: string
}

export function BranchSwitcher() {
  const { branch, switchBranch, user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.is_super_admin) {
      api.get<{ data: Project[] }>("/api/projects")
        .then((res) => setProjects(res.data || []))
        .catch(() => setProjects([]))
    }
  }, [user])

  if (!user?.is_super_admin) {
    return null
  }

  const handleSwitch = async (branchId: number | null) => {
    setLoading(true)
    try {
      await switchBranch(branchId)
      // Wait a bit for session to persist, then reload
      await new Promise(resolve => setTimeout(resolve, 300))
      window.location.reload()
    } catch (error) {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 min-w-[180px] justify-between"
          disabled={loading}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-medium truncate">
              {branch?.active_name || "Semua Cabang"}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Pilih Cabang
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleSwitch(null)}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span>Semua Cabang</span>
            {branch?.active_id === null && (
              <Check className="h-4 w-4" />
            )}
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => handleSwitch(project.id)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span>{project.name}</span>
              {branch?.active_id === project.id && (
                <Check className="h-4 w-4" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
