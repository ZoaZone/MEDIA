const mongoose = require('mongoose');

const MediaProjectSchema = new mongoose.Schema({
  creativeVision: { type: String, required: true },
  platformTarget: { type: String, default: 'General' },
  brandTone: { type: String, default: 'Professional' },
  
  // Restored Missing Input Configurations
  videoSettings: {
    format: { type: String, enum: ['9:16', '16:9', '1:1'], default: '9:16' },
    durationSeconds: { type: Number, default: 30 },
    captionLength: { type: String, enum: ['minimal', 'complete'], default: 'complete' }
  },

  // Synchronized Linked Assets
  assets: {
    videoScript: { type: String, default: '' },
    storyboard: { type: Array, default: [] },
    thumbnailUrl: { type: String, default: '' },
    adCopy: { type: String, default: '' },
    caption: { type: String, default: '' }
  },
  
  status: { type: String, enum: ['Draft', 'Generating', 'Ready', 'Published'], default: 'Draft' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MediaProject', MediaProjectSchema);
