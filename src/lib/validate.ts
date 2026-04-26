import { z } from 'zod'
import { NextResponse } from 'next/server'

type ValidationSuccess<T> = {
  success: true
  data: T
}

type ValidationError = {
  success: false
  response: ReturnType<typeof NextResponse.json>
}

export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationSuccess<T> | ValidationError {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors

    return {
      success: false,
      response: NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      ),
    }
  }

  return { success: true, data: result.data }
}