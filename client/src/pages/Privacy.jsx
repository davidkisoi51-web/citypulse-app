import './Privacy.css'
import { Link } from 'react-router-dom'

function Privacy() {
    return (
        <main className="page">
            <Link className="back_to_events" to="/">
          ← Back to events
        </Link>
        <div className="container_p">
            <h2 className="privacy-title"style={{paddingTop: "15px"}}> Privacy Policy</h2>

            <p className="privacy-p" style={{paddingBottom: "20px", paddingTop: "5px"}}>CityPulse respects your privacy and is committed to be transparent about how information is handled when you use the application.</p>

            <h2 className="privacy-title"style={{ paddingTop: "15px"}} >Privacy Notice</h2>

            <p className="privacy-p" style={{paddingTop: "10px"}}> This notice applies to you depending on how you interact with us.</p>
            <ul className='privacy-p'  style={{listStyleType: "none", padding: "10px"}}>
                <li>When searching for events, we may use your search terms and selected categories to display relevant event information.
                </li>
                <li>When browsing our application, we may use browser storage technologies to remember certain preferences and improve your experience.</li>
            </ul>

            <h2 className="privacy-title" style={{paddingBottom: "20px", paddingTop: "10px"}}>Information We Use</h2>

            <p className="privacy-p">
                CityPulse may use information such as event searches, selected categories, locations, dates, and application
                preferences to provide and improve the event discovery experience.
            </p>
            </div>
        </main>
    )
}


export default Privacy