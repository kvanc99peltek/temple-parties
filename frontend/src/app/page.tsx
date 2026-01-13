import PartyCard from '@/components/PartyCard';

export default function Home() {
  const parties = [
    { id: 1, name: "Party 1", location: "Address 1", date: "Date 1", host: "Host 1"},
    { id: 2, name: "Saturday Bash", location: "5678 Cecil Ave", date: "Jan 11, 2026", host: "Temple Social"},
    { id: 3, name: "Sunday Chill", location: "9012 Montgomery Ave", date: "Jan 12, 2026", host: "Student House"}
  ];
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Temple Parties</h1>
      <div className="space-y-4">
      {parties.map(party => (
      <PartyCard
        key={party.id}
        name={party.name}
        location={party.location}
        date={party.date}
        host={party.host}
      />
      ))}
      </div>
    </main>
  );
}
