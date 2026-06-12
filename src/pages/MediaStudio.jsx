import React, { useState } from "react";
import { base44 } from "../api/base44Client";
import { Video, Sparkles, Layers, Download, Upload } from "lucide-react";

export default function MediaStudio() {
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [formData, setFormData] = useState({ 
    creativeVision: "", 
    format: "16:9", 
    durationSeconds: 60 
  });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleExecutePipeline = async () => {
    setLoading(true);
    try {
      const payload = { script: formData.creativeVision, format: formData.format, duration: formData.durationSeconds };
      const result = await base44.functions.invoke("generateMediaContent", payload);
      setProject(result);
    } catch (error) {
      console.error("Pipeline Error:", error);
      alert("Error: Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <header style={{ marginBottom: "30px" }}>
        <h1 style={{ margin: 0 }}>Automated Brand Studio</h1>
      </header>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
        {/* Left Side: Inputs */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #eee" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Creative Brand Vision</label>
          <textarea name="creativeVision" value={formData.creativeVision} onChange={handleInputChange} style={{ width: "100%", height: "150px", marginBottom: "10px" }} />
          
          <label style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>Aspect Ratio</label>
          <select name="format" onChange={handleInputChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }}>
            <option value="16:9">16:9 (Widescreen)</option>
            <option value="9:16">9:16 (Vertical)</option>
          </select>

          <button onClick={handleExecutePipeline} disabled={loading} style={{ width: "100%", padding: "12px", background: "#7f00ff", color: "#fff", border: "none", borderRadius: "6px" }}>
            {loading ? "Generating..." : "Execute Pipeline"}
          </button>
        </div>

        {/* Right Side: Demo Video & Output */}
        <div style={{ background: "#000", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {project ? (
            <video src={project.videoUrl} controls style={{ width: "100%" }} />
          ) : (
            <div style={{ color: "#fff", padding: "40px" }}>
              {loading ? "AI is working..." : "Configure vision to generate media."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}