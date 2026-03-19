import { SearchPage } from "@/modules/search/components/SearchPage";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900">
      <SearchPage context="dtic" department="dtic" />
    </main>
  );
}
