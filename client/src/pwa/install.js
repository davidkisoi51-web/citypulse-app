// "Install the app" support. Chrome/Edge/Android fire `beforeinstallprompt` once, soon after
// the page loads, so this module is imported first thing in main.jsx and keeps the event until
// the Download page asks for it. Safari (iPhone/iPad, Mac) never fires it: there the app is
// added from the Share menu, so the page shows those steps instead.

let deferredPrompt = null
let installed = false
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
    notify()
  })
}

// Already running as the installed app (opened from the home screen / app list)?
export function isRunningInstalled() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

// What the Download page should offer right now.
//   'installed' – opened from the installed app, or just installed
//   'prompt'    – the browser can show its install dialog (our button opens it)
//   'ios'       – iPhone/iPad: Share → Add to Home Screen
//   'manual'    – other browsers: install from the browser menu
export function installState(userAgent = globalThis.navigator?.userAgent ?? '') {
  if (installed || isRunningInstalled()) return 'installed'
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
