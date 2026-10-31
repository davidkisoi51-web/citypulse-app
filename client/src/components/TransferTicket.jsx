import { useState } from "react";
import { useAuth } from "../auth/authContext";
import { Link } from 'react-router-dom'
import NavBar from "./NavBar";
import { API_URL } from "../payment/purchases";
import './TransferTickets.css'

//need to add email validation and transfer functions
export function TransferTickets({onTransfer}){
   // const {user} = useAuth

    function handleSumbit(event){
        event.preventDefault()

        //placeholder before implementing functionality
        const user_email = ""

        fetch(API_URL,{
            method: "POST",
            headers: {"Content-Type": "application/json", "Authorization": `Bearer token`},
            body: JSON.stringify(user_email),
        })
        .then((response) => {
            if(!response.ok) { throw new Error("post request failed")}
            return response.json()
        })
        .then((data) => onTransfer(user_email))
        .catch((error) => {return error})
       }

       function ticketSelect(){
         fetch(API_URL,{
            methods: "GET",
            headers: {
            "Authorization": `Bearer <token>`},
        })
        .then(response => {
        if (!response.ok){ throw new Error ("post request failed")}
        return response.json()
        })
        .then(data => { 
            for (const test of data){
            return (
                <>
                <option value ={test}>test</option>
                </>
            )
            }
        })
        .catch((error) =>  {return error})
       }
       
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
            <form className="transfer_form"  onSubmit={handleSumbit}>

                <p className="p_transfer">Transferee Email:</p>
                
                <input className="transfer_input" type="text" name = "transfer_email" placeholder="Email"></input>

                <div className="select_transfer">
                <p className="p_transfer">Ticket to transfer:</p>
                <select className="ticket_select" onClick={ticketSelect}>
                    
                </select>
                </div>

                <button 
                className="transfer_ticket_btn"
                type="submit"
                >Transfer</button>
            </form>
        </div>
        </main>
        </>
       )//on the button click, prompt a message to confirm
}
export default TransferTickets

