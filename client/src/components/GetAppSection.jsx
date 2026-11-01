import { useEffect, useState, useSyncExternalStore } from 'react'
import { installState, onInstallChange, openInstalledApp, promptInstall } from '../pwa/install'
import '../pages/DownloadPage.css'

// "Get the CityPulse app": a heading typed letter by letter, one line of text and one "Open in app" button. The button
// installs the app when the browser offers it (Kayte's install prompt), otherwise opens the
// installed app; if neither works it points to the browser's own install / "Open in app" button.
// Shown under the event ring on the landing page and on /download.
const HEADING = 'Get the CityPulse app'
const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// How many letters of the heading show: counts up (typing), holds, counts back down (erasing).
function useTypewriter(length) {
  const [letters, setLetters] = useState(() => (reducedMotion() ? length : 0))
  const [erasing, setErasing] = useState(false)
  useEffect(() => {
    if (reducedMotion()) return
    const full = !erasing && letters === length
    const empty = erasing && letters === 0
    const timer = setTimeout(
      () => {
        if (full) setErasing(true)
        else if (empty) setErasing(false)
        else setLetters((n) => n + (erasing ? -1 : 1))
      },
      full ? 2500 : empty ? 500 : erasing ? 40 : 110,
    )
    return () => clearTimeout(timer)
  }, [letters, erasing, length])
  return letters
}

function GetAppSection({ id }) {
  const state = useSyncExternalStore(onInstallChange, () => installState())
  const [hint, setHint] = useState('')
  const letters = useTypewriter(HEADING.length)

  const openApp = async () => {
    setHint('')
    if (state === 'prompt') {
      await promptInstall()
      return
    }
    if (state === 'ios') {
      setHint('In Safari, tap Share, then Add to Home Screen.')
      return
    }
    if (!(await openInstalledApp())) {
      setHint('Use the Install or Open in app button at the top of your browser.')
    }
  }

  return (
    <section id={id} className="download__card" aria-labelledby={`${id ?? 'download'}-title`}>
      <h2 id={`${id ?? 'download'}-title`} className="download__heading">
        <span className="visually-hidden">{HEADING}</span>
        {/* Typed out letter by letter, then erased and typed again. */}
        <span className="download__typed" aria-hidden="true">
          {HEADING.slice(0, letters)}
          <span className="download__caret" />
        </span>
      </h2>
      <p className="download__text">Get CityPulse on this device by clicking Open in app.</p>
      <button type="button" className="download__button" onClick={openApp}>
        <img src="/icon-192x192.png" alt="" width="22" height="22" />
        Open in app
      </button>
      {hint && (
        <p className="download__hint" role="status">
          {hint}
        </p>
      )}
    </section>
  )
}

export default GetAppSection
