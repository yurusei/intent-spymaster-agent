import React, { useState } from "react";

const ROWS = [
  { key: "purpose",  label: "Purpose",  icon: "◎", desc: "What they do & what makes them unique" },
  { key: "personas", label: "Personas", icon: "◉", desc: "Who they serve" },
  { key: "problems", label: "Problems", icon: "◈", desc: "Pains they solve" },
];

export default function ClientContextCard({ context, websiteUrl }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="client-context-card">
      <button
        className="context-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="context-toggle-left">
          <span className="context-icon">◎</span>
          <span className="context-title">Client Understanding</span>
          {websiteUrl && (
            <span className="context-url">{new URL(websiteUrl).hostname}</span>
          )}
        </span>
        <span className="context-chevron">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="context-body">
          {ROWS.map(({ key, label, icon, desc }) => (
            <div key={key} className="context-row">
              <div className="context-row-label">
                <span className="context-row-icon">{icon}</span>
                <span>{label}</span>
                <span className="context-row-desc">{desc}</span>
              </div>
              <p className="context-row-value">{context[key]}</p>
            </div>
          ))}
          <p className="context-note">
            Intent signals have been filtered and prioritised based on this understanding.
          </p>
        </div>
      )}
    </div>
  );
}
