import { useState } from 'react'

const STEPS_KEY = 'louvor_onboarding_completed'

export interface OnboardingStep {
  id: string
  title: string
  description: string
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Louvor Conectado! 🎵',
    description: 'Este app foi criado para ajudar você a participar do ministério de louvor de forma organizada. Vamos fazer um tour rápido?',
  },
  {
    id: 'profile',
    title: 'Complete seu Perfil',
    description: 'Adicione suas habilidades musicais e foto de perfil para que os diretores possam conhecê-lo melhor.',
  },
  {
    id: 'availability',
    title: 'Configure sua Disponibilidade',
    description: 'Informe os horários em que você geralmente está disponível. Isso ajuda os diretores a escalarem você para os eventos certos.',
  },
  {
    id: 'notifications',
    title: 'Ative as Notificações',
    description: 'Receba lembretes sobre eventos e convites diretamente no seu celular. Nunca mais perca um convite!',
  },
  {
    id: 'points',
    title: 'Sistema de Pontos e Conquistas',
    description: 'Ganhe pontos ao confirmar presença! Desbloqueie conquistas e suba de nível. Participe ativamente e seja reconhecido!',
  },
]

export function useOnboarding() {
  const [isCompleted, setIsCompleted] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STEPS_KEY) === 'true'
  })

  const [currentStep, setCurrentStep] = useState(0)

  const completeOnboarding = () => {
    localStorage.setItem(STEPS_KEY, 'true')
    setIsCompleted(true)
  }

  const skipOnboarding = () => {
    localStorage.setItem(STEPS_KEY, 'true')
    setIsCompleted(true)
  }

  const resetOnboarding = () => {
    localStorage.removeItem(STEPS_KEY)
    setIsCompleted(false)
    setCurrentStep(0)
  }

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, DEFAULT_STEPS.length - 1))
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  return {
    isCompleted,
    currentStep,
    steps: DEFAULT_STEPS,
    totalSteps: DEFAULT_STEPS.length,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    nextStep,
    prevStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === DEFAULT_STEPS.length - 1,
  }
}
