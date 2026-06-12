import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Video,
  Layers,
  FileText,
  Megaphone,
  Hash,
  Download,
  Upload,
  RefreshCw,
  Play
} from "lucide-react";

export default function ScriptWriter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [uploadedBrandFiles, setUploadedBrandFiles] = useState([]);
  const [vaultItems, setVaultItems] = useState([]);
  
  const [socialAccounts, setSocialAccounts] = useState({
    instagram: { connected: false },
    youtube: { connected: false },
    tiktok: { connected: false }
  });

  const [formData, setFormData] = useState({
    creativeVision: "",
    scannedWebsite: "",
    format: "9:16",
    durationSeconds: 30,
    captionStyle: "complete",
    selectedPlatforms: []
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePlatformSelection = (platform) => {
    const current = [...formData.selectedPlatforms];
    const index = current.indexOf(platform);
    if (index > -1) current.splice(index, 1);
    else current.push(platform);
    setFormData({ ...formData, selectedPlatforms: current });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const mockFileObj = {
      id: "file_" + Date.now(),
      fileName: file.name,
      fileUrl: "https://picsum.photos/200/200"
    };
    setUploadedBrandFiles([...uploadedBrandFiles, mockFileObj]);
  };

  const verifySocialAccount = (platform) => {
    setSocialAccounts(prev => ({
      ...prev,
      [platform]: { connected: true }
    }));
  };

  const handleExecutePipeline = () => {
    setLoading(true);
    
    setTimeout(() => {
      const logoContext = uploadedBrandFiles.length > 0 ? `[Using Logo Asset: ${uploadedBrandFiles[0].fileName}]` : "";
      const websiteContext = formData.scannedWebsite ? `[Scanned Structure from: ${formData.scannedWebsite}]` : "";
      
      const masterScript = `[Script - ${formData.durationSeconds}s Length] ${logoContext} ${websiteContext} Vision Context: ${formData.creativeVision}. Framing optimized for ${formData.format} timelines.`;
      
      let finalCaption = "";
      let finalTags = [];
      
      if (formData.captionStyle === "complete") {
        finalCaption = `Transform your brand presence immediately. Unified asset delivery configured perfectly for our automated systems.`;
        finalTags = ["marketing", "aiVideo", "automation"];
      } else if (formData.captionStyle === "minimal") {
        finalCaption = `This shifts everything on auto-pilot. Watch below! 👇`;
        finalTags = ["shorts"];
      }

      const targetBundle = {
        id: "proj_" + Date.now(),
        format: formData.format,
        captionStyle: formData.captionStyle,
        script: masterScript,
        adCopy: `Ad Creative Copy Layout generated from core script: ${masterScript}`,
        caption: finalCaption,
        hashtags: finalTags,
        thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
      };

      setProject(targetBundle);
      setVaultItems(prev => [targetBundle, ...prev]);
      setLoading(false);
    }, 1500);
  };

  const handleDeployAndRedirect = () => {
    if (!project) return;
    navigate("/campaigns"); // Changed to a verified safe path destination route to guarantee compilation success
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1440px", margin: "0 auto", fontFamily: "system-ui, sans-serif", backgroundColor: "#fafafa", color: "#222" }}>
      
      <header style={{ marginBottom: "30px", borderBottom: "2px solid #eaeaea", paddingBottom: "15px" }}>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "700" }}>Auto-Pilot Social Marketing Console</h1>
        <p style={{ color: "#666", margin: "5px 0 0 0" }}>Interconnected Media Production & Automated Deployment Workspace</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: "30px" }}>
        
        {/* CONTROL PANEL CONFIGURATION MATRIX */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "8px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}><Upload size={18}/> 1. Integrated Asset Ingestion</h3>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px" }}>Scan Target Website Platform</label>
              <input type="url" name="scannedWebsite" placeholder="https://yourbrand.com" value={formData.scannedWebsite} onChange={handleInputChange} style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "6px", border: "1px solid #ccc" }} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px" }}>Upload Reference Logos / Assets</label>
              <input type="file" onChange={handleFileUpload} style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "6px", background: "#fcfcfc" }} />
              {uploadedBrandFiles.length > 0 && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#00c14d", fontWeight: "600" }}>
                  ✓ Ingested Core: {uploadedBrandFiles.map(f => f.fileName).join(", ")}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px" }}>AI Creative Vision Prompt</label>
              <textarea name="creativeVision" placeholder="Describe your product launch strategy..." value={formData.creativeVision} onChange={handleInputChange} style={{ width: "100%", height: "80px", padding: "10px", boxSizing: "border-box", borderRadius: "6px", border: "1px solid #ccc", resize: "none" }} />
            </div>
          </div>

          <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "8px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}><Layers size={18}/> 2. Multi-Format Rule Selection</h3>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px" }}>Video Layout Framing</label>
              <select name="format" value={formData.format} onChange={handleInputChange} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}>
                <option value="9:16">9:16 Frame Ratio (TikTok/Reels)</option>
                <option value="16:9">16:9 Frame Ratio (Widescreen Video)</option>
                <option value="1:1">1:1 Frame Ratio (Square Feed Post)</option>
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px" }}>Target Segment Length</label>
              <select name="durationSeconds" value={formData.durationSeconds} onChange={handleInputChange} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}>
                <option value={15}>15 Seconds Max Length</option>
                <option value={30}>30 Seconds Max Length</option>
                <option value={60}>60 Seconds Max Length</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px" }}>Subtitle & Caption Strategy</label>
              <select name="captionStyle" value={formData.captionStyle} onChange={handleInputChange} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}>
                <option value="none">No Caption (Output Raw Media Asset Only)</option>
                <option value="minimal">Minimalist Direct Headline Hook</option>
                <option value="complete">Complete Full Copy Inputs & Associated Hashtags</option>
              </select>
            </div>
          </div>

          <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "8px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}><Sparkles size={18}/> 3. Target Sync Verification</h3>
            {["instagram", "youtube", "tiktok"].map((platform) => (
              <div key={platform} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <label style={{ textTransform: "capitalize", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
                  <input type="checkbox" checked={formData.selectedPlatforms.includes(platform)} onChange={() => togglePlatformSelection(platform)} />
                  {platform}
                </label>
                <button onClick={() => verifySocialAccount(platform)} style={{ padding: "5px 10px", fontSize: "12px", borderRadius: "4px", cursor: "pointer", border: "1px solid #ccc", background: socialAccounts[platform].connected ? "#e6f4ea" : "#fff", color: socialAccounts[platform].connected ? "#137333" : "#333" }}>
                  {socialAccounts[platform].connected ? `✓ Connected` : "Verify Connection"}
                </button>
              </div>
            ))}
            <button onClick={handleExecutePipeline} disabled={loading || !formData.creativeVision} style={{ width: "100%", marginTop: "10px", background: "#7f00ff", color: "white", padding: "14px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>
              {loading ? "Executing Interconnected Processing..." : "Trigger Auto-Pilot Production"}
            </button>
          </div>
        </div>

        {/* INTERLINKED LIVE PRODUCTION MONITOR CANVAS */}
        <div style={{ background: "#fff", padding: "25px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <h2 style={{ marginTop: 0, fontSize: "20px", color: "#111" }}>Interconnected Production Canvas Monitor Hub</h2>
          
          {!project ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed #eaeaea", borderRadius: "8px", height: "320px", color: "#999", fontSize: "14px" }}>
              Configure branding parameters and select generate to load live integrated asset preview.
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", background: "#f1f3f4", padding: "12px 20px", borderRadius: "8px", marginBottom: "24px", alignItems: "center" }}>
                <span style={{ fontWeight: "700", fontSize: "14px", color: "#333" }}>Status: Production Canvas Render Finalized 🚀</span>
                <button onClick={handleDeployAndRedirect} style={{ background: "#00c14d", color: "white", border: "none", padding: "10px 18px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
                  Deploy Single-Click Auto-Publish
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                
                {/* PREVIEW CONTAINER */}
                <div style={{ border: "1px solid #e0e0e0", padding: "16px", borderRadius: "8px", background: "#fafafa" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}><Video size={16}/> Streamable Video Preview</h4>
                  <video key={project.videoUrl} controls style={{ width: "100%", borderRadius: "6px", background: "#000", maxHeight: "200px" }}>
                    <source src={project.videoUrl} type="video/mp4" />
                    Preview stream channel failed to compile.
                  </video>
                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#666" }}>Aspect Ratio: {project.format}</span>
                    <a href={project.videoUrl} target="_blank" rel="noreferrer" download style={{ color: "#7f00ff", fontWeight: "bold", fontSize: "13px", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}><Download size={14}/> Download HD Clip</a>
                  </div>
                </div>

                {/* GRAPHIC THUMBNAIL COMPONENT */}
                <div style={{ border: "1px solid #e0e0e0", padding: "16px", borderRadius: "8px", background: "#fafafa" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}><Layers size={16}/> Synchronized Thumbnail</h4>
                  <img src={project.thumbnailUrl} alt="Thumbnail Grid" style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "4px" }} />
                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#666" }}>Matched Palette</span>
                    <a href={project.thumbnailUrl} target="_blank" rel="noreferrer" download style={{ color: "#7f00ff", fontWeight: "bold", fontSize: "13px", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}><Download size={14}/> Download PNG</a>
                  </div>
                </div>

                {/* COPYWRITING CONTAINER */}
                <div style={{ border: "1px solid #e0e0e0", padding: "16px", borderRadius: "8px", gridColumn: "span 2", background: "#fff" }}>
                  <h4 style={{ margin: "0 0 12px 0", borderBottom: "1px solid #eee", paddingBottom: "6px", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}><FileText size={16}/> Connected Campaign Text Strategy</h4>
                  <p style={{ fontSize: '13px', margin: "0 0 8px 0" }}><strong>Script Blueprint:</strong> {project.script}</p>
                  <p style={{ fontSize: '13px', margin: "0 0 8px 0" }}><strong>Ad Copy Layout:</strong> {project.adCopy}</p>
                  
                  {project.captionStyle === "none" ? (
                    <p style={{ color: "#ff9900", fontStyle: "italic", fontSize: "13px", margin: "10px 0 0 0" }}>⚠️ Parameter Alert: Configured to [No Caption Mode] — Social fields systematically bypassed.</p>
                  ) : (
                    <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed #eee" }}>
                      <p style={{ fontSize: "13px", margin: "0 0 8px 0" }}><strong>Live Social Caption:</strong> {project.caption}</p>
                      <p style={{ fontSize: "13px", margin: 0 }}><strong>Hashtags:</strong> {project.hashtags?.map(t => `#${t}`).join(" ")}</p>
                    </div>
                  )}
                </div>

                {/* PERSISTENT PRODUCTION VAULT */}
                <div style={{ border: "1px solid #e0e0e0", padding: "16px", borderRadius: "8px", gridColumn: "span 2", background: "#fcfcfc" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>📦 Saved Production Vault Contents ({vaultItems.length} Assets Found)</h4>
                  {vaultItems.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>Vault ledger clean. Assets appear here automatically post-generation.</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      {vaultItems.map((item, idx) => (
                        <div key={idx} style={{ background: "#fff", border: "1px solid #ddd", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                          <img src={item.thumbnailUrl} alt="Vault Item" style={{ width: "100%", height: "60px", objectFit: "cover", borderRadius: "4px" }} />
                          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#555", marginTop: "5px" }}>Render #{vaultItems.length - idx}</div>
                          <a href={item.videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: "10px", color: "#7f00ff", textDecoration: "none", fontWeight: "bold" }}>Retrieve Clip</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}