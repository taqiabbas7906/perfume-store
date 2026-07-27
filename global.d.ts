export {}

declare global {
  interface SquareTokenizeResult {
    status: 'OK' | 'INVALID' | 'ERROR' | string
    token?: string
    errors?: Array<{ message: string; field?: string; type?: string }>
  }

  interface SquareCard {
    attach: (selector: string) => Promise<void>
    tokenize: (verificationDetails?: unknown) => Promise<SquareTokenizeResult>
    destroy: () => Promise<void>
  }

  interface SquarePayments {
    card: (options?: Record<string, unknown>) => Promise<SquareCard>
  }

  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => SquarePayments
    }
  }
}