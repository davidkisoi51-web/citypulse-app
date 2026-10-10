import { team } from '../data/team'

function Contact() {
    return (
        <main className="page">
            <h2>Contact Us</h2>

            <p>Need help with tickets, refunds, account access, event information, or a fan support question? Do not hesitate to contact us.</p>

            <ul className="contact-list">
                {team.map((member) => (
                    <li key={member.email}>
                        <strong>{member.name}</strong>
                        {member.role && ` (${member.role})`}
                        {' – '}
                        <a href={`mailto:${member.email}`}>{member.email}</a>
                    </li>
                ))}
            </ul>
        </main>
    )
}

export default Contact
