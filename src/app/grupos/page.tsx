"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Users, Plus, UserPlus, Music, ChevronLeft, Loader2, Search, X, MoreVertical
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const groupTypes = [
  { value: "CHOIR", label: "Coral", icon: "🎤" },
  { value: "QUARTET", label: "Quarteto", icon: "🎵" },
  { value: "DUO", label: "Dueto", icon: "🎼" },
  { value: "BAND", label: "Banda", icon: "🎸" },
  { value: "WORSHIP_TEAM", label: "Equipe de Louvor", icon: "🙏" },
  { value: "OTHER", label: "Outro", icon: "📋" },
]

interface Group {
  id: string
  name: string
  description?: string
  type: string
  photo?: string
  isActive: boolean
  totalEvents: number
  isPublic: boolean
  createdAt: string
  createdById: string
  members?: {
    id: string
    userId: string
    role: string
    isLeader: boolean
    user: {
      id: string
      name: string
      email: string
      avatar?: string
    }
  }[]
}

export default function GruposPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(null)
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  
  const [newGroup, setNewGroup] = React.useState({
    name: "",
    description: "",
    type: "WORSHIP_TEAM",
    isPublic: true,
  })

  const isDirector = session?.user?.role === "DIRECTOR" || session?.user?.role === "ADMIN"

  // Fetch groups
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups")
      if (!res.ok) throw new Error("Erro ao carregar grupos")
      return res.json()
    },
  })

  // Create group mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newGroup) => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Erro ao criar grupo")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      setIsCreateOpen(false)
      setNewGroup({ name: "", description: "", type: "WORSHIP_TEAM", isPublic: true })
      toast.success("Grupo criado!")
    },
    onError: () => {
      toast.error("Erro ao criar grupo")
    },
  })

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ groupId, email }: { groupId: string; email: string }) => {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error("Erro ao convidar membro")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      setIsInviteOpen(false)
      setInviteEmail("")
      toast.success("Membro adicionado!")
    },
    onError: () => {
      toast.error("Erro ao adicionar membro")
    },
  })

  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) {
      toast.error("Nome do grupo é obrigatório")
      return
    }
    createMutation.mutate(newGroup)
  }

  const handleInviteMember = () => {
    if (!inviteEmail.trim() || !selectedGroup) {
      toast.error("E-mail é obrigatório")
      return
    }
    inviteMutation.mutate({ groupId: selectedGroup.id, email: inviteEmail })
  }

  const filteredGroups = (groupsData?.groups || []).filter((group: Group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getGroupTypeInfo = (type: string) => {
    return groupTypes.find((t) => t.value === type) || groupTypes[5]
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => router.push("/")} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="font-semibold text-sm">Grupos</h1>
                <p className="text-[10px] text-slate-500">Corais, quartetos, bandas</p>
              </div>
            </div>
            
            {isDirector && (
              <Button size="sm" className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Novo
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar grupos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Groups List */}
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Users className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {searchTerm ? "Nenhum grupo encontrado" : "Nenhum grupo criado ainda"}
            </p>
            {isDirector && !searchTerm && (
              <Button size="sm" variant="outline" className="mt-3 h-8 text-xs" onClick={() => setIsCreateOpen(true)}>
                Criar primeiro grupo
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group: Group) => {
              const typeInfo = getGroupTypeInfo(group.type)
              
              return (
                <Card key={group.id} className="border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-xl flex-shrink-0">
                        {typeInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-sm">{group.name}</h3>
                            <Badge variant="secondary" className="text-[9px] h-4 px-1 mt-1">
                              {typeInfo.label}
                            </Badge>
                          </div>
                          {isDirector && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedGroup(group)
                                  setIsInviteOpen(true)
                                }}>
                                  <UserPlus className="h-3 w-3 mr-2" />
                                  Adicionar Membro
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        
                        {group.description && (
                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{group.description}</p>
                        )}
                        
                        {/* Members */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex -space-x-1.5">
                            {(group.members || []).slice(0, 4).map((member) => (
                              <Avatar key={member.id} className="h-5 w-5 border border-white dark:border-slate-800">
                                <AvatarImage src={member.user.avatar} />
                                <AvatarFallback className="text-[8px] bg-emerald-100 text-emerald-700">
                                  {member.user.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {(group.members?.length || 0) > 4 && (
                              <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[8px] font-medium border border-white dark:border-slate-800">
                                +{(group.members?.length || 0) - 4}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {group.members?.length || 0} membro{(group.members?.length || 0) !== 1 ? "s" : ""}
                          </span>
                          
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
                            <Music className="h-3 w-3" />
                            {group.totalEvents}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Create Group Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Novo Grupo</DialogTitle>
            <DialogDescription className="text-xs">
              Crie um novo grupo musical
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="Ex: Coral Jovem"
                className="h-9 text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={newGroup.type}
                onValueChange={(value) => setNewGroup({ ...newGroup, type: value })}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groupTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-sm">
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder="Descrição do grupo"
                rows={2}
                className="text-sm"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button 
                size="sm"
                className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600"
                onClick={handleCreateGroup}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Adicionar Membro</DialogTitle>
            <DialogDescription className="text-xs">
              Adicione ao grupo "{selectedGroup?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="h-9 text-sm"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsInviteOpen(false)}>
                Cancelar
              </Button>
              <Button 
                size="sm"
                className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600"
                onClick={handleInviteMember}
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
