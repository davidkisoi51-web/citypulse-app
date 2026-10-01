import { Link } from 'react-router-dom'
import './Footer.css'

function Footer () {
    return (
        <footer className="footer">
            <div className="footer__content">
                <div className="footer__brand">
                    <span className="footer__logo" aria-hidden="true">
                        ●
                    </span>
                    <span>CityPulse</span>
                </div>

                <p className="footer__text">
                    Discover local events, activities and experiences happening around you!
                </p>

                <div className="footer__links">
                    <Link to="/about-us">About Us</Link>
                    <Link to="/contact-us">Contact Us</Link>
                    <Link to="/privacy-policy">Privacy Policy</Link>
                </div>
            </div>

            <div className="footer__bottom">
                <p>© {new Date().getFullYear()} CityPulse. All rights reserved.</p>
                
                <div className="footer__bottom-links">
                    <Link to="/terms">Terms</Link>
                    <Link to="/cookies">Cookies</Link>
                </div>
            </div>
        </footer>
    )
}

export default Footer