import { useState, useEffect } from 'react'

function InstallPrompt() {
    const [installEvent, setInstallEvent] = useState(null)
    const [installed, setInstalled] = useState(false)

    useEffect(() => {
        const handleInstallPrompt = (event) => {
            event.preventDefault()
            setInstallEvent(event)
        }

        const handleAppInstalled = () => {
            setInstalled(true)
            setInstallEvent(null)
        }

        window.addEventListener('beforeinstallprompt', handleInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstall = async () => {
        if (!installEvent) return

        await installEvent.prompt()
        setInstallEvent(null)
    }

    if (installed || !installEvent) return null

    return (
        <aside className="install-prompt">
            <p>Install CityPulse app on your device for quick access to local events.</p>
            <button type="button" onClick={handleInstall}>
                Install CityPulse
            </button>
        </aside>
    )
}

export default InstallPrompt