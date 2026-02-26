'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, BellOff, X, Check, AlertCircle } from 'lucide-react'
import { useFCM } from '@/hooks/use-fcm'

export function PushPermissionBanner() {
  const [dismissed, setDismissed] = useState(false)
  const { 
    isSupported, 
    isLoading, 
    needsPermission, 
    hasPermission, 
    isDenied,
    requestPermission 
  } = useFCM()

  // Não mostrar se não suportado, já tem permissão, ou foi dispensado
  if (!isSupported || hasPermission || dismissed) return null

  // Se negado, mostrar mensagem
  if (isDenied) {
    return (
      <Card className="mx-4 mb-4 border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Notificações bloqueadas
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Habilite nas configurações do navegador para receber lembretes de eventos.
              </p>
            </div>
            <button onClick={() => setDismissed(true)} className="text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Mostrar banner para solicitar permissão
  if (needsPermission) {
    return (
      <Card className="mx-4 mb-4 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900">
                Ativar notificações?
              </p>
              <p className="text-xs text-neutral-500">
                Receba lembretes de eventos e convites em tempo real.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissed(true)}
                className="text-neutral-500"
              >
                Agora não
              </Button>
              <Button
                size="sm"
                onClick={requestPermission}
                disabled={isLoading}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Ativando...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4" /> Ativar
                  </span>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}

// Mini component para mostrar status no perfil
export function PushStatus() {
  const { isSupported, hasPermission, isDenied, requestPermission, isLoading } = useFCM()

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-neutral-400 text-sm">
        <BellOff className="w-4 h-4" />
        <span>Notificações não suportadas</span>
      </div>
    )
  }

  if (hasPermission) {
    return (
      <div className="flex items-center gap-2 text-emerald-600 text-sm">
        <Check className="w-4 h-4" />
        <span>Notificações ativadas</span>
      </div>
    )
  }

  if (isDenied) {
    return (
      <div className="flex items-center gap-2 text-amber-600 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>Notificações bloqueadas</span>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={requestPermission}
      disabled={isLoading}
      className="text-sm"
    >
      <Bell className="w-4 h-4 mr-2" />
      {isLoading ? 'Ativando...' : 'Ativar notificações'}
    </Button>
  )
}
