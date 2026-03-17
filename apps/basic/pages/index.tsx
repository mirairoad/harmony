import ClientSafeIsland from "../islands/client-safe.island.tsx";
// import Counter from "../islands/Counter.tsx";

export default function Index() {
  return (
    <>
      <h1 class="text-5xl font-bold mb-4">Harmony</h1>
      <ClientSafeIsland />
    </>
  );
}
