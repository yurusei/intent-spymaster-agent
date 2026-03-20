import React, { useState } from "react";

const PROVIDERS = [
  { value: "anthropic", label: "Claude (Anthropic)" },
  { value: "openai",    label: "ChatGPT (OpenAI)" },
];

export default function SearchForm({ onSubmit, loading }) {
  const [provider, setProvider]             = useState("anthropic");
  const [clientWebsite, setClientWebsite]   = useState("");
  const [topic, setTopic]                   = useState("");
  const [keyword, setKeyword]               = useState("");
  const [audience, setAudience]             = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ provider, clientWebsite, topic, keyword, audience });
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>AI Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={loading}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Client Website <span className="label-optional">(optional)</span></label>
          <input
            type="url"
            placeholder="https://example.com"
            value={clientWebsite}
            onChange={(e) => setClientWebsite(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-row form-row--two">
        <div className="form-group">
          <label>Topic or Industry <span className="label-required">*</span></label>
          <input
            type="text"
            placeholder="e.g. B2B email automation"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Keyword <span className="label-required">*</span></label>
          <input
            type="text"
            placeholder="e.g. email sequencing"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Audience <span className="label-optional">(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. RevOps leaders, SDR managers"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={loading || !topic || !keyword}>
          {loading ? "Researching..." : "Research Intent"}
        </button>
      </div>
    </form>
  );
}
