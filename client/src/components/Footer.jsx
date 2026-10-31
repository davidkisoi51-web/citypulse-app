import { Link } from 'react-router-dom'
import './Footer.css'

const COLUMNS = [
    {
        title: 'CityPulse',
        links: [
            { to: '/about-us', label: 'About us' },
            { to: '/contact-us', label: 'Contact us' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { to: '/privacy-policy', label: 'Privacy policy' },
            { to: '/terms', label: 'Terms' },
            { to: '/cookies', label: 'Cookies' },
        ],
    },
]

function Footer () {
    const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

    return (
        <footer className="footer">
            <div className="footer__content">
                <div className="footer__brand">
                    <Link className="footer__brand-link" to="/">
                        <img className="footer__logo" src="/citypulse-mark.svg" alt="" width="40" height="40" />
                        <span>CityPulse</span>
                    </Link>
                    <p className="footer__text">
                        Discover local events, activities and experiences happening around you.
                    </p>
                </div>

                {COLUMNS.map((col) => (
                    <nav key={col.title} className="footer__col" aria-label={col.title}>
                        <h2 className="footer__col-title">{col.title}</h2>
                        <ul>
                            {col.links.map((l) => (
                                <li key={l.to}>
                                    <Link to={l.to}>{l.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                ))}
            </div>

            <div className="footer__bottom">
                <p>© {new Date().getFullYear()} CityPulse. All rights reserved.</p>
                <button type="button" className="footer__top" onClick={toTop}>
                    Back to top <span aria-hidden="true">↑</span>
                </button>
            </div>

            {/* Big faded wordmark along the bottom edge. */}
            <p className="footer__wordmark" aria-hidden="true">CityPulse</p>
        </footer>
    )
}

export default Footer
