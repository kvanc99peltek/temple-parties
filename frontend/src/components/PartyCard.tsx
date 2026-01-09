// This is like a Java class, but for UI
interface PartyCardProps {
  name?: string;
  location?: string;
  date?: string;
  host?: string;
}

export default function PartyCard(props: PartyCardProps) {
  return (
    <div className="border p-8 rounded shadow">
      <h2 className="text-2xl font-bold">{props.name}</h2>
      <p> Hosted by: {props.host}</p> 
      {props.location && <p>📍 {props.location}</p>}
      <p>📅 {props.date}</p>
      <button className="mt-3 bg-green-700 text-white px-4 py-2 rounded">
        RSVP
      </button>
    </div>
  );
}
