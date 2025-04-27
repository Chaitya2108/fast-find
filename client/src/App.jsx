import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch("/api/events") // automatically forwarded via proxy
      .then(res => res.json())
      .then(data => {
        const validEvents = data.filter(e => e.freeFood && e.date);
        validEvents.sort((a,b) => {
          const aDate = new Date(a.date.year, a.date.month - 1, a.date.date);
          const bDate = new Date(b.date.year, b.date.month - 1, b.date.date);
          return aDate - bDate;
        });
        setEvents(validEvents);
      });
  }, []);

  return (
    <div>
      <h1>🍔 Upcoming Free Food Events</h1>
      {events.length === 0 ? (
        <p>No upcoming events found.</p>
      ) : (
        <ul>
          {events.map((event, idx) => (
            <li key={idx} style={{ marginBottom: "20px" }}>
              <div><strong>Location:</strong> {event.location}</div>
              <div><strong>Food:</strong> {event.freeFood.join(", ")}</div>
              <div>
                <strong>Date:</strong> {event.date.month}/{event.date.date}/{event.date.year}
              </div>
              <div>
                <strong>Time:</strong> 
                {event.start ? ` ${event.start.hour}:${event.start.minute.toString().padStart(2, '0')}` : ""} 
                {event.end ? ` - ${event.end.hour}:${event.end.minute.toString().padStart(2, '0')}` : ""}
              </div>
              {event.url && (
                <div>
                  <a href={event.url} target="_blank" rel="noopener noreferrer">View Instagram Post</a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App
