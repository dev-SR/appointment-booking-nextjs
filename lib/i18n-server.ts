import { cookies } from 'next/headers'

export async function getIsEn() {
  const cookieStore = await cookies()
  return cookieStore.get('NEXT_LOCALE')?.value === 'en'
}
