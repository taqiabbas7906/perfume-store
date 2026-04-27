import bcrypt from 'bcryptjs'

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(12)
  const hashed = await bcrypt.hash(password, salt)
  return hashed
}

export async function verifyPassword(password: string, hashedPassword: string) {
  const isValid = await bcrypt.compare(password, hashedPassword)
  return isValid
}