import { team } from '../data/team'
import { Link } from 'react-router-dom'

import './Contact.css'

function Contact() {
    return (
        <main className="page">
            <Link className="back_to_events" to="/">
          ← Back to events
        </Link>
            <h2 className='contact-title'>Contact Us</h2>

            <p className='contact-desc'>Need help with tickets, refunds, account access, event information, or a fan support question? Do not hesitate to contact us.</p>
            <div className='container'>
            <ul className="contact-list">
                {team.map((member) => (
                    <li key={member.email} className='member'>
                        <strong>{member.name}</strong>
                        {member.role && ` (${member.role})`}
                       
                        <a style={{color: "#f09f82"}} href={`mailto:${member.email}`}>{member.email} </a>
                    </li>
                ))}
            </ul>
            </div>
        </main>
    )
}

export default Contact
