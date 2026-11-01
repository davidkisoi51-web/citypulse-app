import { useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { installState, onInstallChange, promptInstall } from '../pwa/install'
import './DownloadPage.css'

// "Get the app": a black page with one big way to install CityPulse on this device (or, on
// iPhone/iPad and other browsers, the steps to do it), plus the link to open it elsewhere.
function DownloadPage() {
  const state = useSyncExternalStore(onInstallChange, () => installState())
  const [copied, setCopied] = useState(false)
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the link is still on screen to copy by hand.
    }
  }

  return (
    <main className="download">
      <Link className="download__back" to="/">
        ← Back to CityPulse
      </Link>

      <section className="download__card" aria-labelledby="download-title">
        <img className="download__icon" src="/icon-192x192.png" alt="" width="112" height="112" />
        <h1 id="download-title" className="download__title">
          Get the CityPulse app
        </h1>
        <p className="download__text">
          Concerts, sport and nights out near you, one tap away. Installs straight from your browser: no app store,
          nothing to pay, and it opens full screen like any other app.
        </p>

        {state === 'installed' && (
          <p className="download__done" role="status">
            ✓ CityPulse is installed on this device. Open it from your home screen or app list.
          </p>
        )}

        {state === 'prompt' && (
          <button type="button" className="download__button" onClick={promptInstall}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16" />
            </svg>
            Download the app
          </button>
        )}

        {state === 'ios' && (
          <ol className="download__steps">
            <li>
              Tap the <strong>Share</strong> button{' '}
              <svg className="download__inline-icon" viewBox="0 0 24 24" aria-label="(square with an arrow)">
                <path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" />
              </svg>{' '}
              in Safari.
            </li>
            <li>
              Choose <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong>. CityPulse appears with your other apps.
            </li>
          </ol>
        )}

        {state === 'manual' && (
          <ol className="download__steps">
            <li>
              Open your browser menu (<strong>⋮</strong> or <strong>⋯</strong>).
            </li>
            <li>
              Choose <strong>Install CityPulse</strong> or <strong>Add to Home screen</strong>.
            </li>
            <li>Works best in Chrome, Edge or Samsung Internet.</li>
          </ol>
        )}

        <div className="download__link">
          <span className="download__link-label">Or open CityPulse on another device:</span>
          <div className="download__link-row">
            <a href={appUrl}>{appUrl.replace(/^https?:\/\//, '')}</a>
            <button type="button" onClick={copyLink}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default DownloadPage
