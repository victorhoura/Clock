import { useCallback, useEffect, useState } from 'react'

// Chrome/Edge/Samsung Internet fire this event when the site can be installed;
// it isn't in the DOM typings yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari's own flag for apps opened from the home screen.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac, so also check for a touch screen.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/.test(navigator.userAgent) || isIOS()
}

export type InstallMode =
  | 'native' // the browser can show its own install dialog
  | 'ios' // iPhone/iPad: only via Share → Add to Home Screen
  | 'manual' // other mobile browsers: via the browser menu
  | null // already installed, or nothing to offer (desktop without support)

/** Tells how the app can be added to the home screen here, and triggers the native prompt when available. */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Keep the event so the install dialog opens from our own button instead.
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const mode: InstallMode = installed
    ? null
    : deferred
      ? 'native'
      : isIOS()
        ? 'ios'
        : isMobile()
          ? 'manual'
          : null

  const promptInstall = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    // A prompt event can only be used once.
    setDeferred(null)
  }, [deferred])

  return { mode, promptInstall }
}
