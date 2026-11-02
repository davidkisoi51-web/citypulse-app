import './C_A_T.css'
import { Link } from 'react-router-dom'

function Terms() {
    return(
        <main className="page">
            <Link className="back_to_events" to="/">
          ← Back to events
        </Link>
        <div className='container-t'>
            <h2 className="_title">Terms of Use</h2>
            <p className='_desc'>Welcome to CityPulse. By using this application, you agree to use CityPulse responsibly and for its intended purpose of discovering local events and activities. </p>
        </div>
        </main>
    )
}

export default Terms