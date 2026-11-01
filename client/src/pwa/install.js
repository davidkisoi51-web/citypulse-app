// "Install the app" support. Chrome/Edge/Android fire `beforeinstallprompt` once, soon after
// the page loads, so this module is imported first thing in main.jsx and keeps the event until
// the Download page asks for it. Safari (iPhone/iPad, Mac) never fires it: there the app is
// added from the Share menu, so the page shows those steps instead.

let deferredPrompt = null
let installed = false
// Remembers (in this browser profile) that the app is installed, so a normal tab can offer
// "Open in app": once installed, Chrome stops firing beforeinstallprompt.
const INSTALLED_KEY = 'citypulse.appInstalled'
const remember = (value) => {
  try {
    if (value) localStorage.setItem(INSTALLED_KEY, '1')
    else localStorage.removeItem(INSTALLED_KEY)
  } catch { /* Storage may be unavailable. */ }
}
const remembered = () => {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1'
  } catch {
    return false
  }
}
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // keep it for our own "Install" button
    deferredPrompt = event
    notify()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    remember(true)
    notify()
  })
  // Chrome only fires this when the app is NOT installed (e.g. after an uninstall).
  window.addEventListener('beforeinstallprompt', () => remember(false))
}

// Already running as the installed app (opened from the home screen / app list)?
export function isRunningInstalled() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}
if (isRunningInstalled()) remember(true)

// What the Download page should offer right now.
//   'installed' – opened from the installed app, or just installed
//   'prompt'    – the browser can show its install dialog (our button opens it)
//   'ios'       – iPhone/iPad: Share → Add to Home Screen
//   'manual'    – other browsers: install from the browser menu
export function installState(userAgent = globalThis.navigator?.userAgent ?? '') {
  if (installed || isRunningInstalled() || remembered()) return 'installed'
  if (deferredPrompt) return 'prompt'
  const ios = /iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && globalThis.navigator?.maxTouchPoints > 1)
  return ios ? 'ios' : 'manual'
}

// Opens the browser's install dialog. Resolves to true if the user accepted.
export async function promptInstall() {
  if (!deferredPrompt) return false
  const event = deferredPrompt
  deferredPrompt = null
  await event.prompt()
  const choice = await event.userChoice.catch(() => null)
  if (choice?.outcome === 'accepted') installed = true
  notify()
  return choice?.outcome === 'accepted'
}

// Re-render when the install state changes. Returns an unsubscribe function.
export function onInstallChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Opens the installed app through the web+citypulse: link it registers (manifest
// protocol_handlers). The first time, Chrome asks to allow it. Resolves to false if nothing
// opened (e.g. the app was uninstalled), so the caller can show the install steps instead.
export function openInstalledApp() {
  return new Promise((resolve) => {
    let left = false
    const onLeave = () => {
      left = true
    }
    window.addEventListener('blur', onLeave, { once: true })
    document.addEventListener('visibilitychange', onLeave, { once: true })
    window.location.href = 'web+citypulse://open'
    setTimeout(() => {
      window.removeEventListener('blur', onLeave)
      document.removeEventListener('visibilitychange', onLeave)
      if (!left) remember(false)
      resolve(left)
    }, 1500)
  })
}
