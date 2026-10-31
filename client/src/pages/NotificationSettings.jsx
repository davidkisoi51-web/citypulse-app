import { useState, useEffect } from "react";
import "./NotificationSettings.css";

function NotificationSettings() {
    const [enabled, setEnabled] = useState(false);
    const [minutesBefore, setMinutesBefore] = useState(60);

    const handleSave = () => {
        alert(`Settings is working. API connection is still needed.`);
    };

    return (
        <main className="notification-settings">
            <h2>Notification Settings</h2>
            <p>Choose how you want to be notified about upcoming events.</p>

            <section className="notification-settings__section">
                <label>
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                    />
                    Enable event reminders
                </label>
                </section>
                <section className="notification-settings__input-group">
                    <label htmlFor="reminder-time">Remind me before an event:   </label>
                    <select
                        id="reminder-time"
                        value={minutesBefore}
                        onChange={(e) => setMinutesBefore(parseInt(e.target.value))}
                        disabled={!enabled}
                    >
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                        <option value={1440}>1 day</option>
                        <option value={2880}>2 days</option>

                        </select>
                </section>
           
            <button type="button" onClick={handleSave}>Save Preferences</button>
        </main>
    );
}


export default NotificationSettings;