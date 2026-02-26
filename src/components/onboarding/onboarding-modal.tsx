"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useOnboarding } from "@/hooks/use-onboarding"
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X,
  User,
  Calendar,
  Bell,
  Star,
  Music,
} from "lucide-react"

const stepIcons: Record<string, React.ReactNode> = {
  welcome: <Music className="h-12 w-12 text-emerald-600" />,
  profile: <User className="h-12 w-12 text-emerald-600" />,
  availability: <Calendar className="h-12 w-12 text-emerald-600" />,
  notifications: <Bell className="h-12 w-12 text-emerald-600" />,
  points: <Star className="h-12 w-12 text-emerald-600" />,
}

export function OnboardingModal() {
  const router = useRouter()
  const {
    currentStep,
    steps,
    totalSteps,
    nextStep,
    prevStep,
    completeOnboarding,
    skipOnboarding,
    isFirstStep,
    isLastStep,
  } = useOnboarding()

  const [isVisible, setIsVisible] = React.useState(true)

  const handleSkip = () => {
    skipOnboarding()
    setIsVisible(false)
  }

  const handleComplete = () => {
    completeOnboarding()
    setIsVisible(false)
  }

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      nextStep()
    }
  }

  if (!isVisible) return null

  const step = steps[currentStep]
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg animate-in fade-in-0 zoom-in-95 duration-300">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Pular
              <X className="h-4 w-4 ml-1" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} de {totalSteps}
            </span>
          </div>
          
          <Progress value={progress} className="h-2 mt-2" />
          
          <div className="flex justify-center py-6">
            <div className="h-24 w-24 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
              {stepIcons[step.id]}
            </div>
          </div>
          
          <CardTitle className="text-xl">{step.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {step.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center">
          <div className="flex justify-center gap-2 py-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? "w-8 bg-emerald-600" 
                    : index < currentStep 
                      ? "w-2 bg-emerald-400" 
                      : "w-2 bg-gray-300 dark:bg-gray-600"
                }`}
              />
            ))}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <Button
            onClick={handleNext}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLastStep ? (
              <>
                Começar
                <Check className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
