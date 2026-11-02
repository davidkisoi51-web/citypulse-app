import "./C_A_T.css"
import { Link } from "react-router-dom"
function Cookies() {
    return (
        <main className="page">
            <Link className="back_to_events" to="/">
          ← Back to events
        </Link>
            <div className="container-c" >
            <h2 className="_title" style = {{top: "100px"}}>Cookie Policy</h2>

            <p className="_desc" style={{top: "110px"}}>CityPulse may use browser storage technologies to help provide a seamless experience when using the application.</p>

            <h2 className="_title" style = {{top: "120px"}}>Managing Cookies</h2>

            <p className="_desc" style = {{top: "115px"}}>Users can manage or remove cookies through browser settings. Disabling certain storage features may affect some functionalities of the application.</p>
            </div>
        </main>
    )
}

export default Cookies
