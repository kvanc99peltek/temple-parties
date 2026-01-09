import PartyCard from '@/components/PartyCard';

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Temple Parties</h1>
      <PartyCard
        name="Back To School" 
        location="Montgomery Mansion"
        date="Jan 09, 2026"
        host="Rafiat Amir"
      />
    </main>
  );
}
