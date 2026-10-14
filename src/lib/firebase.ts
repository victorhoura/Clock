import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  throw new Error(
    'Missing VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID or VITE_FIREBASE_APP_ID environment variables.',
  )
}

export const db = getFirestore(initializeApp(firebaseConfig))

// Firestore collection names, shared by every read and write.
export const COLLECTIONS = {
  members: 'team_members',
  timeEntries: 'time_entries',
  activities: 'activities',
  transactions: 'finance_transactions',
  recurring: 'finance_recurring',
} as const

const AVATAR_SIZE = 256

/**
 * Shrinks a picked photo to a 256px square JPEG and returns it as a data URL,
 * stored straight on the member's document. Firebase's free plan no longer
 * includes file storage, and at this size a photo is only ~20–40 KB.
 */
export async function avatarToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  // Center-crop to a square before scaling, so faces aren't stretched.
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  )
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}
