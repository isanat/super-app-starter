"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { 
  Users, Plus, MoreVertical, UserPlus, Mail, Phone, 
  Music, Church, Loader2, Search, X
} from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthStore } from "@/store/auth"

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
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(null)
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  
  // Form state
  const [newGroup, setNewGroup] = React.useState({
    name: "",
    description: "",
    type: "WORSHIP_TEAM",
    isPublic: true,
  })

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
      toast.success("Grupo criado com sucesso!")
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
      toast.success("Membro adicionado com sucesso!")
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
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Grupos</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Gerencie corais, quartetos, duetos e bandas
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Grupo</DialogTitle>
                <DialogDescription>
                  Crie um novo grupo musical para sua igreja
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Grupo</Label>
                  <Input
                    id="name"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    placeholder="Ex: Coral Jovem, Quarteto Harmonia"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={newGroup.type}
                    onValueChange={(value) => setNewGroup({ ...newGroup, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {groupTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    placeholder="Descrição opcional do grupo"
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateGroup}
                    disabled={createMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Criar Grupo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar grupos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Groups Grid */}
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {searchTerm
                  ? "Nenhum grupo encontrado"
                  : "Nenhum grupo criado ainda.\nClique em 'Novo Grupo' para começar."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group: Group) => {
              const typeInfo = getGroupTypeInfo(group.type)
              
              return (
                <Card key={group.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-2xl">
                          {typeInfo.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            {typeInfo.label}
                          </Badge>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedGroup(group)
                            setIsInviteOpen(true)
                          }}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Adicionar Membro
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Convidar para Evento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {group.description}
                      </p>
                    )}
                    
                    {/* Members */}
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {(group.members || []).slice(0, 4).map((member) => (
                          <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                            <AvatarImage src={member.user.avatar} />
                            <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">
                              {member.user.name?.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(group.members?.length || 0) > 4 && (
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium border-2 border-white">
                            +{(group.members?.length || 0) - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {(group.members?.length || 0)} membro{(group.members?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Music className="h-4 w-4" />
                        <span>{group.totalEvents} eventos</span>
                      </div>
                      {!group.isPublic && (
                        <Badge variant="outline" className="text-xs">
                          Privado
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Invite Member Dialog */}
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Membro</DialogTitle>
              <DialogDescription>
                Adicione um membro ao grupo "{selectedGroup?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail do Membro</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleInviteMember}
                  disabled={inviteMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {inviteMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
