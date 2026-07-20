import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { PaymentGateway } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPaymentGatewayForCountry(country: string): PaymentGateway {
  const normalizedCountry = country.trim().toLowerCase()

  if (['nigeria', 'ng', 'ngn'].includes(normalizedCountry)) {
    return 'paystack'
  }

  if (
    ['united kingdom', 'uk', 'gb', 'great britain', 'britain', 'england', 'scotland', 'wales', 'northern ireland'].includes(
      normalizedCountry
    )
  ) {
    return 'stripe'
  }

  return 'stripe'
}
