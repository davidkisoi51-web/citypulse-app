import { useState, useEffect} from "react";
import { Link } from 'react-router-dom'
import NavBar from "./NavBar";
import './TransferTickets.css'
import { normalizeEmail } from "../auth/authUtils";
import ConfirmMsg from "./ConfirmMsg";

const transfer_URL = 'api/auth/transfer'

export function TransferTickets(){
    const [ticket, setTicket] = useState('')
    const email = document.getElementById("transfer_input")

   async function test_fetch(email = document.getElementById("transfer_input")){
    const storeEmail = localStorage.setItem("email", email)
    //need to process email given and return a confrim message
    // issue with post request here
    return fetch(transfer_URL,{
            method: "POST",
            headers: {"Content-Type": "application/json", "Authorization": `Bearer token`},
            body: JSON.stringify(email),
        })
        .then((response) => {
            if(!response.ok) { throw new Error("post request failed")}
            return response.json()
        })
        .then((data) => {return data})
        .catch((error) => {throw error})
}
    const mock_tickets = ["Kering - Nov 2nd", "Njerae - Nov 15th", "Neyo - Dec 6th"]
    
       return (
        <>
        <NavBar />
         <Link className="back_to_events" to="/">
          ← Back to events
        </Link>
        <h3>Transfer Tickets</h3>
        <p className="transfer_desc">Transfer a ticket over to another user!</p>
        <main className="ticket_transfer">        
        <div className ="transfer_card" >   
            
            <form className="transfer_form" action={test_fetch}>

                <p className="p_transfer">Transferee Email:</p>
                
                <input className="transfer_input" type="text" 
                    name = "transfer_email" placeholder="Email" 
                    ></input>

                <div className="select_transfer">
                <p className="p_transfer">Ticket to transfer:</p>
                <select className="ticket_select" value={ticket} onChange={(e) => setTicket(e.target.value)} >
                    <option>Tickets</option>
                    {mock_tickets.map((c) => (
                        <option key={c} value={c} style={{backgroundColor: "rgb(80, 11, 11)", color: "white"}}>
                        {c}
                        </option>
                    ))}
                </select>
                </div>

                <button type="submit"
                className="transfer_ticket_btn"
                >Transfer</button>
            </form>
        </div>
        </main>
        </>
       )
}
export default TransferTickets

