import './ConfirmMsg.css'
function ConfirmMessage(){
    
    return (
        <>
        <main className="popup-box" style= {{display :"flex", alignItems:"center", justifyContent: "center", width: "100px"}}>
            <div className="popup" id = "popup">
                <h2>Confirm?</h2>
                <button >
                    Confirm?
                </button>
            </div>
            </main>
        
        </>
    )

}
export default ConfirmMessage()