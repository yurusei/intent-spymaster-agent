import React, { useState } from "react";

const CATEGORY_META = {
  "Question":        { icon: "?",  color: "#4f7ef8" },
  "Pain Point":      { icon: "!",  color: "#e05c5c" },
  "Comparison":      { icon: "⇄",  color: "#f0964a" },
  "Anecdote":        { icon: "✦",  color: "#7c5cbf" },
  "Feature Request": { icon: "+",  color: "#27ae7a" },
};

const SOURCE_COLORS = {
  Reddit:     "#ff4500",
  G2:         "#ff492c",
  Capterra:   "#00a2e8",
  Trustpilot: "#00b67a",
  Forum:      "#7c5cbf",
};

export default function CategoryCard({ category, signals }) {
  const [copied, setCopied] = useState(false);
  const meta = CATEGORY_META[category] || { icon: "•", color: "#888" };

  function handleCopyAll() {
    const text = signals.map((s) => `[${s.source}] ${s.signal}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="category-card" style={{ "--accent": meta.color }}>
      <div className="card-header">
        <div className="card-title">
          <span className="cat-icon" style={{ background: meta.color }}>{meta.icon}</span>
          <h3>{category}</h3>
          <span className="count-badge">{signals.length}</span>
        </div>
        <button className="btn-copy" onClick={handleCopyAll}>
          {copied ? "Copied!" : "Copy all"}
        </button>
      </div>

      <ul className="signal-list">
        {signals.map((s, i) => (
          <li key={i} className="signal-item">
            <p className="signal-text">{s.signal}</p>
            <span
              className="source-badge"
              style={{ background: SOURCE_COLORS[s.source] || "#888" }}
            >
              {s.source}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
