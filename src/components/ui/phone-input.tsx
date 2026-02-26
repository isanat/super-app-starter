"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { usePhoneMask } from "@/hooks/use-phone-mask"

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "(00) 00000-0000",
  disabled,
  className,
  id,
  name,
}: PhoneInputProps) {
  const { handlePhoneChange, isValidPhone } = usePhoneMask()
  const [touched, setTouched] = React.useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePhoneChange(e, onChange)
  }

  const showInvalid = touched && value && !isValidPhone(value)

  return (
    <div className="space-y-1">
      <Input
        id={id}
        name={name}
        type="tel"
        value={value}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${className} ${showInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        maxLength={15}
      />
      {showInvalid && (
        <p className="text-xs text-red-500">
          Digite um telefone válido com DDD
        </p>
      )}
    </div>
  )
}
