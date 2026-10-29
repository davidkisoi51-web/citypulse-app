import { useState } from "react";
import { useAuth } from "../auth/authContext";

//haven't finished evidently
export function TransferTickets(){
    const {user} = useAuth

    return <form>
        <label for="usertransfer">Transfer to:</label><br></br>
        <input type="text" placeholder="user email"></input><br></br>

    </form>
}