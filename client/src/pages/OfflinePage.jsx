import './OfflinePage.css'

function OfflinePage() {
    const retry = () => window.location.reload()

    return (
        <main className="offline-page">
            <div className="offline-page">
                <h1>You are currently offline</h1>
                <p>Please check your internet connection and try again.</p>
                <button type="button" onClick={retry}>
                Retry
                </button>
            </div>
        </main>
    )
}

export default OfflinePage