import { SearchPage } from "@/modules/search/components/SearchPage";

export default function Home() {
  return (
    <main className="min-h-screen">
      <SearchPage context="dtic" department="dtic" />
    </main>
  );
}

