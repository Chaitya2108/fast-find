import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'


function matchesSearch(event, search) {
  if (!search) return true; // if empty search, keep all

  const searchLower = search.toLowerCase();

  const location = event.location?.toLowerCase() || "";
  const food = event.freeFood?.join(", ").toLowerCase() || "";
  const sourceId = event.sourceId?.toLowerCase() || "";
  const url = event.url?.toLowerCase() || "";

  const date = event.date
    ? `${event.date.month}/${event.date.date}/${event.date.year}`
    : "";

  return (
    location.includes(searchLower) ||
    food.includes(searchLower) ||
    sourceId.includes(searchLower) ||
    url.includes(searchLower) ||
    date.includes(searchLower)
  );
}

function App() {
  const API_URL = import.meta.env.VITE_API_URL || "/api/events";                                     // local proxy path

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [search, setSearch] = useState("");


  useEffect(() => {
      
    fetch(API_URL) // automatically forwarded via proxy
      .then(res => res.json())
      .then(data => {
        const today = new Date();
        const validEvents = data.filter(e => e.date);
        validEvents.forEach(event => {
          event.jsDate = new Date(event.date.year, event.date.month - 1, event.date.date);
        });
        const upcoming = validEvents
          .filter(event => event.jsDate >= today)
          .sort((a, b) => a.jsDate - b.jsDate);

        const past = validEvents
          .filter(event => event.jsDate < today)
          .sort((a, b) => b.jsDate - a.jsDate);
        
        setUpcomingEvents(upcoming);
        setPastEvents(past);
      });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>🍔 Free Food Portal</h1>
      <input
        type="text"
        placeholder="Search events..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "30px",
          fontSize: "16px",
          borderRadius: "8px",
          border: "1px solid #ccc"
        }}
      />


      <section>
        <h2>Upcoming Events</h2>
        <div style={styles.grid}>
          {upcomingEvents.filter(event => matchesSearch(event, search)).map((event, idx) => (
            <div key={idx} style={styles.card}>
              <h3 style={styles.title}>{event.location || "Unknown Location"}</h3>
              <p><strong>Food:</strong> {event.freeFood?.join(", ") || "N/A"}</p>
              <p><strong>Date:</strong> {event.date.month}/{event.date.date}/{event.date.year}</p>
              <p>
                <strong>Time:</strong> 
                {event.start ? ` ${event.start.hour}:${event.start.minute.toString().padStart(2, '0')}` : ""} 
                {event.end ? ` - ${event.end.hour}:${event.end.minute.toString().padStart(2, '0')}` : ""}
              </p>
              {event.url && (
                <a href={event.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                  View Instagram
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "50px" }}>
        <h2>Past Events</h2>
        <div style={styles.grid}>
          {pastEvents.filter(event => matchesSearch(event, search)).map((event, idx) => (
            <div key={idx} style={{ ...styles.card, opacity: 0.5 }}>
              <h3 style={styles.title}>{event.location || "Unknown Location"}</h3>
              <p><strong>Food:</strong> {event.freeFood?.join(", ") || "N/A"}</p>
              <p><strong>Date:</strong> {event.date.month}/{event.date.date}/{event.date.year}</p>
              <p>
                <strong>Time:</strong> 
                {event.start ? ` ${event.start.hour}:${event.start.minute.toString().padStart(2, '0')}` : ""} 
                {event.end ? ` - ${event.end.hour}:${event.end.minute.toString().padStart(2, '0')}` : ""}
              </p>
              {event.url && (
                <a href={event.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                  View Instagram
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles = {
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
  },
  card: {
    flex: "1 1 300px",
    padding: "20px",
    border: "1px solid #eee",
    borderRadius: "12px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
    
    transition: "transform 0.2s",
  },
  title: {
    fontSize: "18px",
    marginBottom: "10px",
  },
  link: {
    marginTop: "10px",
    display: "inline-block",
    color: "#007bff",
    // textDecoration: "",
  }
};

export default App
