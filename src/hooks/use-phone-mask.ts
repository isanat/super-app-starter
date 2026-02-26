import { useCallback } from 'react'

/**
 * Hook para máscara de telefone brasileiro
 * Formatos: (00) 00000-0000 ou (00) 0000-0000
 */
export function usePhoneMask() {
  const formatPhone = useCallback((value: string): string => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '')
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11)
    
    // Aplica a máscara
    if (limited.length <= 2) {
      return limited
    }
    if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
    }
    // Para 8 ou 9 dígitos no número local
    if (limited.length <= 10) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`
    }
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
  }, [])

  const handlePhoneChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) => {
    const formatted = formatPhone(e.target.value)
    onChange(formatted)
  }, [formatPhone])

  const isValidPhone = useCallback((phone: string): boolean => {
    const numbers = phone.replace(/\D/g, '')
    // Deve ter 10 ou 11 dígitos (com DDD)
    return numbers.length === 10 || numbers.length === 11
  }, [])

  const getRawPhone = useCallback((phone: string): string => {
    return phone.replace(/\D/g, '')
  }, [])

  return {
    formatPhone,
    handlePhoneChange,
    isValidPhone,
    getRawPhone,
  }
}
