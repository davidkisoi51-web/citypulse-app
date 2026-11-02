import './C_A_T.css'
import { Link } from 'react-router-dom'

function About() {
    return (
        
        <main className="page">
        <Link className="back_to_events" to="/">
          ← Back to events
        </Link>
        <div className='container-a'>
            <h2 className='_title'>About CityPulse</h2>
            <p className="_desc">CityPulse is a Local Event Finder and Activity Hub, designed to help users discover, filter and plan local events - ranging from live concerts and tech meetups to local community markets and sports matches.</p>
        </div>
        </main>

    )
}

export default About