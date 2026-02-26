"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RefreshCw, WifiOff, Download } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

// Função auxiliar para verificar se está offline
function getInitialOfflineStatus(): boolean {
  if (typeof window === "undefined") return false
  return !navigator.onLine
}

// Função auxiliar para verificar se está instalado
function getInitialInstalledStatus(): boolean {
  if (typeof window === "undefined") return false
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
  const isInWebAppiOS = ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone)
  return isStandalone || !!isInWebAppiOS
}

// Função auxiliar para verificar status online
function getInitialOnlineStatus(): boolean {
  if (typeof window === "undefined") return true
  return navigator.onLine
}

export function PWARegister() {
  const [isOffline, setIsOffline] = useState(getInitialOfflineStatus)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  // Registrar Service Worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    let mounted = true

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        })

        if (!mounted) return

        setRegistration(reg)
        console.log("[PWA] Service Worker registered:", reg.scope)

        // Verificar atualizações
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Nova versão disponível
              setShowUpdateDialog(true)
            }
          })
        })

        // Verificar se já existe uma atualização pendente
        if (reg.waiting) {
          setShowUpdateDialog(true)
        }
      } catch (error) {
        console.error("[PWA] Service Worker registration failed:", error)
      }
    }

    registerSW()

    // Listener para atualizações do controller
    const handleControllerChange = () => {
      console.log("[PWA] Controller changed, reloading...")
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)

    return () => {
      mounted = false
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
    }
  }, [])

  // Detectar status de conexão
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => {
      setIsOffline(false)
      console.log("[PWA] Back online")
    }

    const handleOffline = () => {
      setIsOffline(true)
      console.log("[PWA] Gone offline")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Capturar evento de instalação do PWA
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setInstallEvent(promptEvent)
      setShowInstallPrompt(true)
      console.log("[PWA] Install prompt available")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  // Atualizar Service Worker
  const handleUpdate = useCallback(() => {
    if (registration?.waiting) {
      // Enviar mensagem para o SW pular espera
      registration.waiting.postMessage({ type: "SKIP_WAITING" })
    }
    setShowUpdateDialog(false)
  }, [registration])

  // Instalar PWA
  const handleInstall = useCallback(async () => {
    if (!installEvent) return

    try {
      await installEvent.prompt()
      const result = await installEvent.userChoice
      
      if (result.outcome === "accepted") {
        console.log("[PWA] App installed")
      }
      
      setInstallEvent(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error("[PWA] Install failed:", error)
    }
  }, [installEvent])

  // Fechar prompt de instalação
  const handleDismissInstall = useCallback(() => {
    setShowInstallPrompt(false)
  }, [])

  return (
    <>
      {/* Indicador de Offline */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 text-sm z-[9999] flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          Você está offline. Algumas funcionalidades podem não estar disponíveis.
        </div>
      )}

      {/* Dialog de Atualização */}
      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-600" />
              Atualização Disponível
            </AlertDialogTitle>
            <AlertDialogDescription>
              Uma nova versão do Louvor Conectado está disponível. Deseja atualizar agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Depois
            </Button>
            <Button onClick={handleUpdate} className="bg-emerald-600 hover:bg-emerald-700">
              Atualizar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Instalação */}
      <AlertDialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-emerald-600" />
              Instalar App
            </AlertDialogTitle>
            <AlertDialogDescription>
              Instale o Louvor Conectado no seu dispositivo para uma experiência melhor, com acesso rápido e funcionamento offline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleDismissInstall}>
              Agora não
            </Button>
            <Button onClick={handleInstall} className="bg-emerald-600 hover:bg-emerald-700">
              Instalar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Hook para verificar se o app está instalado
export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState(getInitialInstalledStatus)
  const [canInstall, setCanInstall] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Capturar evento de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setInstallEvent(promptEvent)
      setCanInstall(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const install = useCallback(async () => {
    if (!installEvent) return false

    try {
      await installEvent.prompt()
      const result = await installEvent.userChoice
      
      if (result.outcome === "accepted") {
        setCanInstall(false)
        setInstallEvent(null)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [installEvent])

  return { isInstalled, canInstall, install }
}

// Hook para status de conexão
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(getInitialOnlineStatus)

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}
