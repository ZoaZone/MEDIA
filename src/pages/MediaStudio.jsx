// src/pages/MediaStudio.jsx
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function MediaStudio() {
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [formData, setFormData] = useState({ 
    creativeVision: "", format: "16:9", duration: 60, mode: "professional" 
  });

  const handleExecutePipeline = async () => {
    setLoading(true);
    try {
      const payload = { 
        script: formData.creativeVision, 
        format: formData.format, 
        duration: parseInt(formData.duration),
        mode: formData.mode,
        timestamp: new Date().toISOString()
      };
      
      // LOGGING: This will help us catch the 400 error in the F12 console
      console.log("Sending Payload:", payload);
      const result = await base44.functions.invoke("generateMediaContent", payload);
      setProject(result);
    } catch (err) { 
      console.error("DEBUG - Backend Rejected:", err);
      alert("Error: " + err.message); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif", color: "#000" }}>
      <h1 style={{ marginBottom: "20px", color: "#000" }}>Automated Brand Studio</h1>
      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "40px" }}>
        
        {/* Input Panel with Forced Black Text */}
        <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "12px", border: "1px solid #ccc" }}>
          <label style={{ display: "block", marginBottom: "5px", color: "#000", fontWeight: "bold" }}>Brand Vision</label>
          <textarea onChange={(e) => setFormData({...formData, creativeVision: e.target.value})} style={{ width: "100%", height: "150px", marginBottom: "15px", color: "#000" }} />
          
          <label style={{ display: "block", marginBottom: "5px", color: "#000", fontWeight: "bold" }}>Format</label>
          <select onChange={(e) => setFormData({...formData, format: e.target.value})} style={{ width: "100%", marginBottom: "10px", color: "#000" }}>
            <option value="16:9">16:9 Widescreen</option>
            <option value="9:16">9:16 Vertical</option>
          </select>

          <button onClick={handleExecutePipeline} disabled={loading} style={{ width: "100%", padding: "12px", background: "#7f00ff", color: "#fff", borderRadius: "6px" }}>
            {loading ? "Generating..." : "Execute Pipeline"}
          </button>
        </div>

        {/* Preview Panel */}
        <div style={{ background: "#000", borderRadius: "12px", minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {project ? <video src={project.videoUrl} controls autoPlay style={{ width: "100%" }} /> : <p style={{ color: "#fff" }}>Configure vision to generate media.</p>}
        </div>
      </div>
    </div>
  );
}