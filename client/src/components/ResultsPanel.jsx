import React from "react";
import CategoryCard from "./CategoryCard";

const PROVIDER_LABELS = {
  anthropic: "Claude",
  openai: "ChatGPT",
};

export default function ResultsPanel({ signals, meta, onExport }) {
  const totalSignals = Object.values(signals).reduce((n, arr) => n + arr.length, 0);

  return (
    <section className="results-panel">
      <div className="results-header">
        <div className="results-meta">
          <span className="meta-chip">{totalSignals} signals</span>
          <span className="meta-chip">{meta.snippetCount} sources scanned</span>
          <span className="meta-chip">via {PROVIDER_LABELS[meta.provider] || meta.provider}</span>
        </div>
        <button className="btn-secondary" onClick={onExport}>
          Export .txt
        </button>
      </div>

      <div className="categories-grid">
        {Object.entries(signals).map(([category, items]) => (
          <CategoryCard key={category} category={category} signals={items} />
        ))}
      </div>
    </section>
  );
}
