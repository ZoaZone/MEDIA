import React, { useState } from "react";
import { base44 } from "../api/base44Client";

export default function MediaStudio() {
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [formData, setFormData] = useState({ creativeVision: "", format: "16:9", durationSeconds: 60 });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleExecutePipeline = async () => {
    setLoading(true);
    try {
      const payload = { 
        script: formData.creativeVision, 
        format: formData.format, 
        duration: formData.durationSeconds 
      };
      
      const result = await base44.functions.invoke("generateMediaContent", payload);
      setProject(result);
    } catch (error) {
      console.error("PIPELINE ERROR:", error);
      alert("Error: Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>Automated Brand Studio</h1>
      
      <div style={{ marginTop: "20px" }}>
        <label style={{ display: "block", marginBottom: "8px" }}>Creative Brand Vision</label>
        <textarea 
          name="creativeVision" 
          value={formData.creativeVision} 
          onChange={handleInputChange} 
          style={{ width: "100%", height: "150px", padding: "12px", borderRadius: "8px" }} 
        />
      </div>

      <button 
        onClick={handleExecutePipeline} 
        disabled={loading} 
        style={{ marginTop: "20px", padding: "12px 24px", background: "#7f00ff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
      >
        {loading ? "Generating..." : "Execute Pipeline"}
      </button>

      <div style={{ marginTop: "30px" }}>
        {project ? (
          <video src={project.videoUrl} controls style={{ width: "100%", borderRadius: "8px" }} />
        ) : (
          <p style={{ color: "#666" }}>
            {loading ? "AI is working... (Check Console if this takes > 10s)" : "Ready to generate."}
          </p>
        )}
      </div>
    </div>
  );
}