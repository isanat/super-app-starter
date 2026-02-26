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
import { RefreshCw, WifiOff, Download, X, Share, Plus, ChevronRight, Smartphone } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

function getInitialOfflineStatus(): boolean {
  if (typeof window === "undefined") return false
  return !navigator.onLine
}

function getInitialInstalledStatus(): boolean {
  if (typeof window === "undefined") return false
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
  const isInWebAppiOS = ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone)
  return isStandalone || !!isInWebAppiOS
}

function getInitialDismissed(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem("pwa-install-dismissed")
}

function getDeviceType(): { isIOS: boolean; isAndroid: boolean } {
  if (typeof window === "undefined") return { isIOS: false, isAndroid: false }
  
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  
  return { isIOS, isAndroid }
}

export function PWARegister() {
  const [isOffline, setIsOffline] = useState(getInitialOfflineStatus)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isInstalled, setIsInstalled] = useState(getInitialInstalledStatus)
  const [showManualInstall, setShowManualInstall] = useState(false)
  const [hasBeenDismissed, setHasBeenDismissed] = useState(getInitialDismissed)

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

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setShowUpdateDialog(true)
            }
          })
        })

        if (reg.waiting) {
          setShowUpdateDialog(true)
        }
      } catch (error) {
        console.error("[PWA] Service Worker registration failed:", error)
      }
    }

    registerSW()

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

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

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
      
      // Mostrar prompt após delay se não foi dispensado
      if (!hasBeenDismissed && !isInstalled) {
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, 2000)
      }
      
      console.log("[PWA] Install prompt available - App is installable!")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // iOS - mostrar instruções manuais
    const deviceType = getDeviceType()
    if (deviceType.isIOS && !isInstalled && !hasBeenDismissed) {
      setTimeout(() => {
        setShowManualInstall(true)
      }, 5000)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [isInstalled, hasBeenDismissed])

  // Atualizar Service Worker
  const handleUpdate = useCallback(() => {
    if (registration?.waiting) {
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
        console.log("[PWA] App installed successfully!")
        setIsInstalled(true)
        setShowInstallPrompt(false)
      }
      
      setInstallEvent(null)
    } catch (error) {
      console.error("[PWA] Install failed:", error)
    }
  }, [installEvent])

  const handleDismiss = useCallback(() => {
    setShowInstallPrompt(false)
    setHasBeenDismissed(true)
    localStorage.setItem("pwa-install-dismissed", "true")
  }, [])

  return (
    <>
      {/* Indicador de Offline */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 text-sm z-[9999] flex items-center justify-center gap-2 animate-pulse">
          <WifiOff className="h-4 w-4" />
          Você está offline. Algumas funcionalidades podem não estar disponíveis.
        </div>
      )}

      {/* Dialog de Atualização */}
      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <RefreshCw className="h-8 w-8 text-white" />
            </div>
            <AlertDialogTitle className="text-xl">
              Atualização Disponível!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Uma nova versão do <strong>Louvor Conectado</strong> está disponível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)} className="w-full rounded-xl">
              Depois
            </Button>
            <Button onClick={handleUpdate} className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              Atualizar Agora
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Instalação PWA - Android/Desktop */}
      <AlertDialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
        <AlertDialogContent className="max-w-sm rounded-2xl overflow-hidden p-0 border-0">
          {/* Header com gradiente */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-6 py-8 text-center text-white">
            <button 
              onClick={handleDismiss}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Ícone do App */}
            <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-white shadow-2xl flex items-center justify-center overflow-hidden ring-4 ring-white/30">
              <img 
                src="/icons/icon-192.png" 
                alt="Louvor Conectado" 
                className="h-full w-full object-cover"
              />
            </div>
            
            <h2 className="text-xl font-bold">Louvor Conectado</h2>
            <p className="text-sm text-emerald-100 mt-1">Ministério de Louvor</p>
          </div>
          
          <div className="px-6 py-5 bg-white dark:bg-slate-900">
            <AlertDialogHeader className="p-0 mb-4">
              <AlertDialogTitle className="text-center text-lg flex items-center justify-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-600" />
                Instalar como App
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm">
                Instale o app na sua tela inicial para uma experiência completa!
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {/* Benefícios */}
            <div className="space-y-3 mb-5">
              {[
                { icon: "⚡", text: "Abre como app nativo" },
                { icon: "🔔", text: "Notificações de convites" },
                { icon: "📶", text: "Funciona sem internet" },
                { icon: "🚀", text: "Mais rápido e fluido" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-slate-700 dark:text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>
            
            <AlertDialogFooter className="flex-col gap-2 p-0">
              <Button 
                onClick={handleInstall} 
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-base font-medium shadow-lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Instalar App
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleDismiss}
                className="w-full text-slate-500 text-sm"
              >
                Continuar no navegador
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Instalação Manual - iOS */}
      <AlertDialog open={showManualInstall} onOpenChange={setShowManualInstall}>
        <AlertDialogContent className="max-w-sm rounded-2xl overflow-hidden p-0 border-0">
          {/* Header com gradiente */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-6 py-8 text-center text-white">
            <button 
              onClick={() => {
                setShowManualInstall(false)
                localStorage.setItem("pwa-install-dismissed", "true")
              }}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Ícone do App */}
            <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-white shadow-2xl flex items-center justify-center overflow-hidden ring-4 ring-white/30">
              <img 
                src="/icons/icon-192.png" 
                alt="Louvor Conectado" 
                className="h-full w-full object-cover"
              />
            </div>
            
            <h2 className="text-xl font-bold">Louvor Conectado</h2>
            <p className="text-sm text-emerald-100 mt-1">Ministério de Louvor</p>
          </div>
          
          <div className="px-6 py-5 bg-white dark:bg-slate-900">
            <AlertDialogHeader className="p-0 mb-4">
              <AlertDialogTitle className="text-center text-lg">
                📱 Instalar no iPhone/iPad
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm">
                Siga os passos abaixo:
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {/* Instruções iOS */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <Share className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">1. Toque em "Compartilhar"</p>
                  <p className="text-xs text-slate-500">Ícone na barra inferior</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">2. Selecione "Adicionar à Tela de Início"</p>
                  <p className="text-xs text-slate-500">Role para baixo se necessário</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">3. Toque em "Adicionar"</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Pronto! App instalado ✓</p>
                </div>
              </div>
            </div>
            
            <AlertDialogFooter className="p-0">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowManualInstall(false)
                  localStorage.setItem("pwa-install-dismissed", "true")
                }}
                className="w-full rounded-xl"
              >
                Entendi!
              </Button>
            </AlertDialogFooter>
          </div>
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
        setIsInstalled(true)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [installEvent])

  return { isInstalled, canInstall, install }
}
