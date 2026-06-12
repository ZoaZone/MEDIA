const express = require('express');
const router = express.Router();
const { generateUnifiedMedia } = require('../controllers/UnifiedMediaController');
const MediaProject = require('../models/MediaProject');

// Pipeline execution endpoint
router.post('/generate-unified', generateUnifiedMedia);

// Immediate File Download/Streaming endpoint
router.get('/download/:projectId/:assetType', async (req, res) => {
  try {
    const { projectId, assetType } = req.params;
    const project = await MediaProject.findById(projectId);
    
    if (!project || !project.assets[assetType]) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    const assetUrl = project.assets[assetType];
    
    // In production, this streams the file directly from S3/Storage provider
    // For now, we redirect directly to the resource path for instant browser downloading
    res.redirect(assetUrl);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
