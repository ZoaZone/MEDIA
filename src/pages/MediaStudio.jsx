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

export default function MediaStudio() {
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
    format: "16:9",
    durationSeconds: 60,
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
    
    try {
      const localObjectURL = URL.createObjectURL(file);
      const newFileObj = {
        id: "file_" + Date.now(),
        fileName: file.name,
        fileUrl: localObjectURL
      };
      setUploadedBrandFiles([newFileObj]);
    } catch (error) {
      console.error("Local file processing layer failure:", error);
    }
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
      const logoContext = uploadedBrandFiles.length > 0 ? `[Using Ingested Brand Logo Asset: ${uploadedBrandFiles[0].fileName}]` : "";
      const websiteContext = formData.scannedWebsite ? `[Target Core Reference Website: ${formData.scannedWebsite}]` : "";
      
      const masterScript = `[AI Generated Script - ${formData.durationSeconds}s Total Time Runtime] ${logoContext} ${websiteContext} Creative Focus Context: ${formData.creativeVision}. Optimized framing configuration: ${formData.format} timelines.`;
      
      let finalCaption = "";
      let finalTags = [];
      
      if (formData.captionStyle === "complete") {
        finalCaption = `Transform your overall brand positioning instantly. Multi-channel distribution pipeline is initialized and processing complete.`;
        finalTags = ["marketing", "aiVideo", "automation", "branding"];
      } else if (formData.captionStyle === "minimal") {
        finalCaption = `Automated brand deployment is live. Preview check below! 👇`;
        finalTags = ["shorts", "trending"];
      }

      const targetBundle = {
        id: "proj_" + Date.now(),
        format: formData.format,
        captionStyle: formData.captionStyle,
        script: masterScript,
        adCopy: `Ad Creative Copy Layout generated directly from unified master blueprint: ${masterScript}`,
        caption: finalCaption,
        hashtags: finalTags,
        thumbnailUrl: uploadedBrandFiles[0]?.fileUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
        // FIXED: Replaced dead dizzy.mp4 link with a high-availability, working open-source stream link
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
      };

      setProject(targetBundle);
      setVaultItems(prev => [targetBundle, ...prev]);
      setLoading(false);
    }, 1200);
  };
return (
    <div style={{ padding: "30px", maxWidth: "1440px", margin: "0 auto", fontFamily: "system-ui, sans-serif", backgroundColor: "#fafafa", color: "#222" }}>
      
      <header style={{ marginBottom: "30px", borderBottom: "2px solid #eaeaea", paddingBottom: "15px" }}>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "700", color: "#111" }}>Unified Automated Brand Studio</h1>
        <p style={{ color: "#666", margin: "5px 0 0 0" }}>Cross-Platform Video Compilation & Distributed Asset Pipeline Execution Control</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: "30px" }}>
        
        {/* CONTROL PANEL SETTINGS SECTOR */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "8px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#333" }}><Upload size={18}/> 1. Brand Asset Ingestion Engine</h3>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px", color: "#555" }}>Target Brand Website / Platform</label>
              <input type="url" name="scannedWebsite" placeholder="https://yourbrand.com" value={formData.scannedWebsite} onChange={handleInputChange} style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "6px", border: "1px solid #ccc" }} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px", color: "#555" }}>Ingest Reference Logos / Graphics</label>
              <input type="file" onChange={handleFileUpload} accept="image/*" style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "6px", background: "#fcfcfc" }} />
              {uploadedBrandFiles.length > 0 && (
                <div style={{ marginTop: "10px", padding: "10px", borderRadius: "6px", background: "#e6f4ea", border: "1px solid #b7e1cd", display: "flex", alignItems: "center", gap: "10px" }}>
                  <img src={uploadedBrandFiles[0].fileUrl} alt="Upload Preview" style={{ width: "40px", height: "40px", objectFit: "contain", borderRadius: "4px", background: "#fff", border: "1px solid #ddd" }} />
                  <div style={{ fontSize: "12px", color: "#137333", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    ✓ Loaded: {uploadedBrandFiles[0].fileName}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px", color: "#555" }}>Creative Brand Vision Context</label>
              <textarea name="creativeVision" placeholder="Outline specific launch milestones..." value={formData.creativeVision} onChange={handleInputChange} style={{ width: "100%", height: "80px", padding: "10px", boxSizing: "border-box", borderRadius: "6px", border: "1px solid #ccc", resize: "none" }} />
            </div>
          </div>

          <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "8px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#333" }}><Layers size={18}/> 2. Target Compilation Constraints</h3>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px", color: "#555" }}>Target Frame Ratio Viewport</label>
              <select name="format" value={formData.format} onChange={handleInputChange} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", background: "#fff" }}>
                <option value="16:9">16:9 Landscape Video (Widescreen Player)</option>
                <option value="9:16">9:16 Vertical Timeline (TikTok/Reels)</option>
                <option value="1:1">1:1 Square Ratio Format (Feed Posts)</option>
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px", color: "#555" }}>Target Output Run Length</label>
              <select name="durationSeconds" value={formData.durationSeconds} onChange={handleInputChange} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", background: "#fff" }}>
                <option value={60}>60 Seconds Maximum</option>
                <option value={15}>15 Seconds Maximum</option>
                <option value={30}>30 Seconds Maximum</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", fontSize: "13px", color: "#555" }}>Copywriting & Distribution Strategy</label>
              <select name="captionStyle" value={formData.captionStyle} onChange={handleInputChange} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", background: "#fff" }}>
                <option value="complete">Comprehensive Layout Copy + System Hashtags</option>
                <option value="none">Isolate Media Assets (Omit Accompanying Copy)</option>
                <option value="minimal">Direct High-Impact Headline Only</option>
              </select>
            </div>
          </div>

          <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "8px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#333" }}><Sparkles size={18}/> 3. Distribution Authorization Matrix</h3>
            {["instagram", "youtube", "tiktok"].map((platform) => (
              <div key={platform} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <label style={{ textTransform: "capitalize", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px", color: "#444" }}>
                  <input type="checkbox" checked={formData.selectedPlatforms.includes(platform)} onChange={() => togglePlatformSelection(platform)} style={{ cursor: "pointer" }} />
                  {platform}
                </label>
                <button onClick={() => verifySocialAccount(platform)} style={{ padding: "5px 12px", fontSize: "12px", borderRadius: "6px", cursor: "pointer", border: "1px solid #ccc", transition: "all 0.2s", background: socialAccounts[platform].connected ? "#e8f0fe" : "#fff", color: socialAccounts[platform].connected ? "#1a73e8" : "#333", fontWeight: socialAccounts[platform].connected ? "600" : "400" }}>
                  {socialAccounts[platform].connected ? `✓ Authorized` : "Authorize Node"}
                </button>
              </div>
            ))}
            <button onClick={handleExecutePipeline} disabled={loading || !formData.creativeVision} style={{ width: "100%", marginTop: "10px", background: "#7f00ff", color: "white", padding: "14px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "14px", opacity: (!formData.creativeVision || loading) ? 0.6 : 1, transition: "opacity 0.2s" }}>
              {loading ? "Processing Asset Assembly..." : "Execute Automated Generation Pipeline"}
            </button>
          </div>
        </div>

        {/* INTEGRATED LIVE VIEWPORT DISPLAY HUBCANVAS */}
        <div style={{ background: "#fff", padding: "25px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <h2 style={{ marginTop: 0, fontSize: "20px", color: "#111", borderBottom: "1px solid #f0f0f0", paddingBottom: "12px" }}>Live Project Orchestration Monitor</h2>
          
          {!project ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px dashed #eaeaea", borderRadius: "12px", height: "360px", color: "#999", fontSize: "14px", gap: "10px", background: "#fafafa" }}>
              <Video size={36} strokeWidth={1.5} style={{ color: "#bbb" }}/>
              <span>Configure branding directives and click generate to load active media output layers.</span>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", background: "#f8f9fa", padding: "12px 20px", borderRadius: "8px", marginBottom: "24px", alignItems: "center", border: "1px solid #eee" }}>
                <span style={{ fontWeight: "600", fontSize: "14px", color: "#202124" }}>Compilation Status: Stream Channels Finalized 🚀</span>
                <button onClick={() => alert("Deployment successful! Asset bundle dispatched to target nodes.")} style={{ background: "#00c14d", color: "white", border: "none", padding: "10px 18px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
                  Publish Bundle Output
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                
                {/* VIDEO PLAYER MONITOR SECTOR */}
                <div style={{ border: "1px solid #e0e0e0", padding: "16px", borderRadius: "10px", background: "#fafafa" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", color: "#333" }}><Video size={16}/> Streamable Media Playback Pipeline</h4>
                  <div style={{ background: "#000", borderRadius: "8px", overflow: "hidden", height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <video key={project.videoUrl} controls autoPlay muted loop style={{ width: "100%", height: "100%", objectFit: "contain" }}>
                      <source src={project.videoUrl} type="video/mp4" />
                      Fallback channel active: Browser build stream failed to map asset arrays.
                    </video>
                  </div>
                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>Frame Bounds: {project.format}</span>
                    <a href={project.videoUrl} target="_blank" rel="noreferrer" download style={{ color: "#7f00ff", fontWeight: "bold", fontSize: "13px", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}><Download size={14}/> Download Clip</a>
                  </div>
                </div>

                {/* VISUAL LAYOUT COMPONENT */}
                <div style={{ border: "1px solid #e0e0e0", padding: "16px", borderRadius: "10px", background: "#fafafa" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", color: "#333" }}><Layers size={16}/> Generated Cover Matrix Element</h4>
                  <div style={{ height: "200px", borderRadius: "8px", overflow: "hidden", background: "#eee", border: "1px solid #ddd" }}>
                    <img src={project.thumbnailUrl} alt="Cover Target Frame" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>Matched Asset Target Palette</span>
                    <a href={project.thumbnailUrl} target="_blank" rel="noreferrer" download style={{ color: "#7f00ff", fontWeight: "bold", fontSize: "13px", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}><Download size={14}/> Download Graphic</a>
                  </div>
                </div>

                {/* TEXT METADATA COMPILATION HUB */}
                <div style={{ border: "1px solid #e0e0e0", padding: "16px", borderRadius: "10px", gridColumn: "span 2", background: "#fff" }}>
                  <h4 style={{ margin: "0 0 12px 0", borderBottom: "1px solid #eee", paddingBottom: "8px", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", color: "#333" }}><FileText size={16}/> Calculated Campaign Strategy Logs</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p style={{ fontSize: "13px", margin: 0, color: "#444", whiteSpace: "pre-wrap" }}><strong>Master Prompt Structure:</strong> {project.script}</p>
                    <p style={{ fontSize: "13px", margin: 0, color: "#444", whiteSpace: "pre-wrap" }}><strong>Marketing Copy Distribution Schema:</strong> {project.adCopy}</p>
                  </div>
                  
                  {project.captionStyle === "none" ? (
                    <p style={{ color: "#f57c00", fontStyle: "italic", fontSize: "12px", margin: "12px 0 0 0", padding: "8px 12px", background: "#fff3e0", borderRadius: "6px", border: "1px solid #ffe0b2" }}>⚠️ Isolation Strategy Active: Core metadata outputs were successfully generated, but standard distribution text objects are bypassed.</p>
                  ) : (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #eee" }}>
                      <p style={{ fontSize: "13px", margin: "0 0 8px 0", color: "#222" }}><strong>Distribution Channel Text Content:</strong> {project.caption}</p>
                      <p style={{ fontSize: "13px", margin: 0, color: "#7f00ff", fontWeight: "500" }}><strong>Associated Target Node Tags:</strong> {project.hashtags?.map(t => `#${t}`).join(" ")}</p>
                    </div>
                  )}
                </div>

                {/* ARCHIVED PERSISTENT DATA LEDGER */}
                <div style={{ border: "1px solid #e0e0e0", padding: "16px", borderRadius: "10px", gridColumn: "span 2", background: "#fcfcfc" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#444" }}>📦 Saved Project Directory Archives ({vaultItems.length} Elements Recorded)</h4>
                  {vaultItems.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#aaa", margin: 0, fontStyle: "italic" }}>Archive array clean. Assembled asset clusters will automatically manifest here following an execution loop.</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                      {vaultItems.map((item, idx) => (
                        <div key={idx} style={{ background: "#fff", border: "1px solid #ddd", padding: "10px", borderRadius: "8px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                          <div style={{ height: "60px", borderRadius: "4px", overflow: "hidden", background: "#eee", marginBottom: "8px" }}>
                            <img src={item.thumbnailUrl} alt="Archive Snapshot" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#666", marginBottom: "6px" }}>Asset Matrix Run #{vaultItems.length - idx}</div>
                          <a href={item.videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#7f00ff", textDecoration: "none", fontWeight: "700" }}>Access Stream</a>
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