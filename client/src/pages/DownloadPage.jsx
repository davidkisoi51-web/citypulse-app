import { Link } from 'react-router-dom'
import GetAppSection from '../components/GetAppSection'
import './DownloadPage.css'

// /download: the "Get the app" section on its own black page (for sharing a direct link).
function DownloadPage() {
  return (
    <main className="download">
      <Link className="download__back" to="/">
        ← Back to CityPulse
      </Link>
      <GetAppSection />
    </main>
  )
}

export default DownloadPage
