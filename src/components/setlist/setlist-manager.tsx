"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Music, Plus, Trash2, Music2, Youtube, Spotify, Save, Loader2
} from "lucide-react"
import { toast } from "sonner"

interface Song {
  id: string
  title: string
  artist?: string
  key?: string
  youtubeUrl?: string
  spotifyUrl?: string
  notes?: string
}

interface SetlistManagerProps {
  eventId: string
  initialSetlist?: Song[]
  onSave: (songs: Song[]) => void
  isEditing?: boolean
}

export function SetlistManager({ 
  eventId, 
  initialSetlist = [], 
  onSave,
  isEditing = true 
}: SetlistManagerProps) {
  const [songs, setSongs] = React.useState<Song[]>(initialSetlist)
  const [isLoading, setIsLoading] = React.useState(false)
  
  const [newSong, setNewSong] = React.useState<Partial<Song>>({
    title: '',
    artist: '',
    key: '',
    youtubeUrl: '',
    spotifyUrl: '',
    notes: '',
  })

  const addSong = () => {
    if (!newSong.title?.trim()) {
      toast.error("Título da música é obrigatório")
      return
    }

    const song: Song = {
      id: `song_${Date.now()}`,
      title: newSong.title,
      artist: newSong.artist,
      key: newSong.key,
      youtubeUrl: newSong.youtubeUrl,
      spotifyUrl: newSong.spotifyUrl,
      notes: newSong.notes,
    }

    setSongs([...songs, song])
    setNewSong({
      title: '',
      artist: '',
      key: '',
      youtubeUrl: '',
      spotifyUrl: '',
      notes: '',
    })
    toast.success("Música adicionada!")
  }

  const removeSong = (id: string) => {
    setSongs(songs.filter(s => s.id !== id))
  }

  const moveSongUp = (index: number) => {
    if (index === 0) return
    const newSongs = [...songs]
    ;[newSongs[index - 1], newSongs[index]] = [newSongs[index], newSongs[index - 1]]
    setSongs(newSongs)
  }

  const moveSongDown = (index: number) => {
    if (index === songs.length - 1) return
    const newSongs = [...songs]
    ;[newSongs[index], newSongs[index + 1]] = [newSongs[index + 1], newSongs[index]]
    setSongs(newSongs)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(songs)
      toast.success("Setlist salvo com sucesso!")
    } catch {
      toast.error("Erro ao salvar setlist")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Lista de músicas */}
      {songs.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Music2 className="h-4 w-4 text-emerald-600" />
            Músicas ({songs.length})
          </h4>
          
          {songs.map((song, index) => (
            <Card key={song.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {isEditing && (
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveSongUp(index)}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveSongDown(index)}
                          disabled={index === songs.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-medium">{song.title}</h5>
                      {song.key && (
                        <Badge variant="outline" className="text-xs">
                          Tom: {song.key}
                        </Badge>
                      )}
                      {song.artist && (
                        <span className="text-sm text-muted-foreground">
                          - {song.artist}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2">
                      {song.youtubeUrl && (
                        <a
                          href={song.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-red-600 hover:underline"
                        >
                          <Youtube className="h-4 w-4" />
                          YouTube
                        </a>
                      )}
                      {song.spotifyUrl && (
                        <a
                          href={song.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-green-600 hover:underline"
                        >
                          <Spotify className="h-4 w-4" />
                          Spotify
                        </a>
                      )}
                    </div>
                    
                    {song.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {song.notes}
                      </p>
                    )}
                  </div>
                  
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => removeSong(song.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Music className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-center">
              Nenhuma música no setlist ainda
            </p>
          </CardContent>
        </Card>
      )}

      {/* Adicionar música */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Música
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={newSong.title || ''}
                  onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                  placeholder="Nome da música"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="artist">Artista</Label>
                <Input
                  id="artist"
                  value={newSong.artist || ''}
                  onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                  placeholder="Artista original"
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="key">Tom</Label>
                <Input
                  id="key"
                  value={newSong.key || ''}
                  onChange={(e) => setNewSong({ ...newSong, key: e.target.value })}
                  placeholder="Ex: C, D, Am"
                  className="uppercase"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <div className="relative">
                  <Youtube className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="youtube"
                    value={newSong.youtubeUrl || ''}
                    onChange={(e) => setNewSong({ ...newSong, youtubeUrl: e.target.value })}
                    placeholder="https://youtube.com/..."
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="spotify">Spotify</Label>
                <div className="relative">
                  <Spotify className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="spotify"
                    value={newSong.spotifyUrl || ''}
                    onChange={(e) => setNewSong({ ...newSong, spotifyUrl: e.target.value })}
                    placeholder="https://open.spotify.com/..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={newSong.notes || ''}
                onChange={(e) => setNewSong({ ...newSong, notes: e.target.value })}
                placeholder="Anotações sobre arranjo, cifra, etc."
                rows={2}
              />
            </div>
            
            <Button
              onClick={addSong}
              variant="outline"
              className="w-full"
              disabled={!newSong.title?.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar ao Setlist
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Botão Salvar */}
      {isEditing && songs.length > 0 && (
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Setlist
        </Button>
      )}
    </div>
  )
}
