import React, { useState } from "react";
import SearchForm from "./components/SearchForm";
import ResultsPanel from "./components/ResultsPanel";
import "./styles.css";

const CATEGORY_ORDER = ["Question", "Pain Point", "Comparison", "Anecdote", "Feature Request"];

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [signals, setSignals] = useState(null);
  const [meta, setMeta] = useState(null);

  async function handleResearch(formData) {
    setLoading(true);
    setError(null);
    setSignals(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Research failed");

      // Group signals by category
      const grouped = {};
      for (const cat of CATEGORY_ORDER) grouped[cat] = [];
      for (const signal of data.signals) {
        const cat = signal.category in grouped ? signal.category : "Question";
        grouped[cat].push(signal);
      }
      // Remove empty categories
      for (const cat of CATEGORY_ORDER) {
        if (grouped[cat].length === 0) delete grouped[cat];
      }

      setSignals(grouped);
      setMeta({ snippetCount: data.snippetCount, provider: formData.provider });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!signals) return;
    const lines = [];
    for (const [cat, items] of Object.entries(signals)) {
      lines.push(`=== ${cat.toUpperCase()} ===`);
      for (const s of items) {
        lines.push(`• [${s.source}] ${s.signal}`);
      }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intent-signals.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">Intent Spymaster</span>
          </div>
          <p className="tagline">Surface real B2B intent signals from Reddit, G2, Capterra & more</p>
        </div>
      </header>

      <main className="app-main">
        <SearchForm onSubmit={handleResearch} loading={loading} />

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Scanning sources and analyzing intent...</p>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}

        {signals && !loading && (
          <ResultsPanel
            signals={signals}
            meta={meta}
            onExport={handleExport}
          />
        )}
      </main>
    </div>
  );
}
