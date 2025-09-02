export interface NodeParameter {
  name: string;
  type: 'string' | 'number' | 'file' | 'select' | 'boolean';
  default?: any;
  options?: string[];
  description?: string;
  required?: boolean;
  dynamic?: boolean; // Can this input be dynamically added/removed?
  dynamicPattern?: string; // Pattern for naming dynamic inputs (e.g., "input%d")
  maxDynamic?: number; // Maximum number of dynamic inputs allowed
  transitionOptions?: string[]; // Available transition options for clickable buttons
}

export interface NodeDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  inputs: NodeParameter[];
  outputs: { name: string; type: string }[];
  icon?: string;
  preview?: boolean;
}

// Icon mapping function
export function getNodeIcon(nodeId: string): string | null {
  const iconMap: Record<string, string> = {
    'input': '/svg/input.svg',
    'ff_download': '/svg/download.svg',
    'ff_scale': '/svg/scale.svg',
    'ff_crop': '/svg/crop.svg',
    'ff_pad': '/svg/pad.svg',
    'ff_aspect_ratio': '/svg/aspect-ratio.svg',
    'ff_rotate': '/svg/rotate.svg',
    'ff_flip': '/svg/flip.svg',
    'ff_to_landscape': '/svg/landscape.svg',
    'ff_to_portrait': '/svg/portrait.svg',
    'ff_blur': '/svg/blur.svg',
    'ff_sharpen': '/svg/sharpen.svg',
    'ff_unsharp': '/svg/unsharp-mask.svg',
    'ff_colour': '/svg/colour-adjust.svg',
    'ff_lut': '/svg/lut.svg',
    'ff_overlay': '/svg/overlay.svg',
    'ff_stack': '/svg/stack.svg',
    'ff_watermark': '/svg/watermark.svg',
    'ff_text': '/svg/text.svg',
    'ff_subtitles': '/svg/subtitles.svg',
    'ff_audio': '/svg/audio-overlay.svg',
    'ff_convert': '/svg/convert.svg',
    'ff_transcode': '/svg/transcode.svg',
    'ff_social_media': '/svg/social-media.svg',
    'ff_cut': '/svg/cut.svg',
    'ff_fps': '/svg/fps.svg',
    'ff_middle': '/svg/middle.svg',
    'ff_grouptime': '/svg/group-time.svg',
    'ff_concat': '/svg/concatenate.svg',
    'ff_append': '/svg/append.svg',
    'ff_transition': '/svg/transition.svg',
    'ff_image': '/svg/image-to-video.svg',
    'ff_kenburns': '/svg/ken-burns.svg',
    'ff_thumbnail': '/svg/thumbnail.svg',
    'ff_proxy': '/svg/proxy.svg',
    'ff_custom': '/svg/custom-ffmpeg.svg'
  };
  
  return iconMap[nodeId] || null;
}

export const nodeCategories = [
  { id: 'input', name: 'Input', color: '#22c55e' },
  { id: 'size', name: 'Size & Position', color: '#3b82f6' },
  { id: 'effects', name: 'Effects', color: '#8b5cf6' },
  { id: 'composition', name: 'Composition', color: '#f59e0b' },
  { id: 'format', name: 'Format', color: '#ef4444' },
  { id: 'timing', name: 'Timing', color: '#06b6d4' },
  { id: 'assembly', name: 'Assembly', color: '#84cc16' },
  { id: 'utilities', name: 'Utilities', color: '#6b7280' },
  { id: 'custom', name: 'Custom', color: '#ec4899' }
];

export const nodeDefinitions: NodeDefinition[] = [
  // Input nodes
  {
    id: 'input',
    name: 'Input',
    category: 'input',
    description: 'Manual file input - enter a file path',
    preview: true,
    inputs: [
      { name: 'filepath', type: 'string', required: true, description: 'Path to input file' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_download',
    name: 'Download',
    category: 'input',
    description: 'Download a video from URL',
    preview: true,
    inputs: [
      { name: 'input', type: 'string', required: true, description: 'URL to download video from' },
      { name: 'urlsource', type: 'string', description: 'URL of a txt file with list of URLs to download' },
      { name: 'strategy', type: 'string', default: '1', description: 'Download strategy (number or ~number for random)' },
      { name: 'output', type: 'string', default: 'ff_download.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  // Size & Position nodes
  {
    id: 'ff_scale',
    name: 'Scale',
    category: 'size',
    description: 'Change the scale (physical dimensions) of the video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'width', type: 'string', default: '1920', description: 'Width in pixels (supports expressions like iw*.5, -1 for aspect ratio)' },
      { name: 'height', type: 'string', default: '1080', description: 'Height in pixels (supports expressions like ih*.5, -1 for aspect ratio)' },
      { name: 'dar', type: 'string', description: 'Display Aspect Ratio' },
      { name: 'sar', type: 'string', description: 'Sample Aspect Ratio' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_scale.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_crop',
    name: 'Crop',
    category: 'size',
    description: 'Crop the video to specified dimensions',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'width', type: 'string', default: '300', description: 'Width of crop area' },
      { name: 'height', type: 'string', default: '300', description: 'Height of crop area' },
      { name: 'xpixels', type: 'string', default: '(iw-ow)/2', description: 'X position (from left)' },
      { name: 'ypixels', type: 'string', default: '(ih-oh)/2', description: 'Y position (from top)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_crop.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_pad',
    name: 'Pad',
    category: 'size',
    description: 'Add padding around the video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'width', type: 'string', default: '0', description: 'Output width (0 uses input width)' },
      { name: 'height', type: 'string', default: '2*ih', description: 'Output height (0 uses input height)' },
      { name: 'xpixels', type: 'string', default: '(ow-iw)/2', description: 'X position of video in frame' },
      { name: 'ypixels', type: 'string', default: '(oh-ih)/2', description: 'Y position of video in frame' },
      { name: 'colour', type: 'string', default: 'black', description: 'Padding color' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_pad.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_aspect_ratio',
    name: 'Aspect Ratio',
    category: 'size',
    description: 'Change aspect ratio of video (alters container metadata DAR)',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'aspect', type: 'string', default: '1:1', description: 'Target aspect ratio (X:Y format)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_aspect_ratio.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_rotate',
    name: 'Rotate',
    category: 'size',
    description: 'Rotate video by specified angle',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'rotation', type: 'number', default: 90, description: 'Rotation angle in degrees' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_rotate.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_flip',
    name: 'Flip',
    category: 'size',
    description: 'Flip video horizontally and/or vertically',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'horizontal', type: 'boolean', default: false, description: 'Flip video horizontally' },
      { name: 'vertical', type: 'boolean', default: false, description: 'Flip video vertically' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_flip.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_to_landscape',
    name: 'To Landscape',
    category: 'size',
    description: 'Convert video to landscape orientation',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'rotate', type: 'select', options: ['0', '1', '2', '3'], default: '2', description: 'Rotation method (0=90CCW+VFlip, 1=90CW, 2=90CCW, 3=90CW+VFlip)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_to_landscape.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_to_portrait',
    name: 'To Portrait',
    category: 'size',
    description: 'Convert video to portrait orientation',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'rotate', type: 'select', options: ['0', '1', '2', '3'], default: '1', description: 'Rotation method (0=90CCW+VFlip, 1=90CW, 2=90CCW, 3=90CW+VFlip)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_to_portrait.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  // Effects nodes
  {
    id: 'ff_blur',
    name: 'Blur',
    category: 'effects',
    description: 'Apply blur effect to video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'strength', type: 'number', default: 0.5, description: 'Blur strength (standard deviation of Gaussian blur)' },
      { name: 'steps', type: 'number', default: 1, description: 'Number of times to apply blur' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_blur.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_sharpen',
    name: 'Sharpen',
    category: 'effects',
    description: 'Apply sharpen effect to video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'pixel', type: 'number', default: 5, description: 'Matrix size (odd integer 3-23)' },
      { name: 'sharpen', type: 'number', default: 1.0, description: 'Sharpen strength (-2.0 to 5.0)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_sharpen.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_unsharp',
    name: 'Unsharp Mask',
    category: 'effects',
    description: 'Apply unsharp mask filter',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'luma_x', type: 'number', default: 5, description: 'Luma matrix horizontal size (odd integer 3-23)' },
      { name: 'luma_y', type: 'number', default: 5, description: 'Luma matrix vertical size (odd integer 3-23)' },
      { name: 'luma_amount', type: 'number', default: 1.0, description: 'Luma effect strength (-2.0 to 5.0)' },
      { name: 'chroma_x', type: 'number', default: 5, description: 'Chroma matrix horizontal size (odd integer 3-23)' },
      { name: 'chroma_y', type: 'number', default: 5, description: 'Chroma matrix vertical size (odd integer 3-23)' },
      { name: 'chroma_amount', type: 'number', default: 0.5, description: 'Chroma effect strength (-2.0 to 5.0)' },
      { name: 'alpha_x', type: 'number', default: 5, description: 'Alpha matrix horizontal size (odd integer 3-23)' },
      { name: 'alpha_y', type: 'number', default: 5, description: 'Alpha matrix vertical size (odd integer 3-23)' },
      { name: 'alpha_amount', type: 'number', default: 0.5, description: 'Alpha effect strength (-2.0 to 5.0)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_unsharp.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_colour',
    name: 'Color Adjust',
    category: 'effects',
    description: 'Adjust color properties of video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'brightness', type: 'number', default: 0, description: 'Brightness adjustment (-1.0 to 1.0)' },
      { name: 'contrast', type: 'number', default: 1, description: 'Contrast adjustment (-1000.0 to 1000.0)' },
      { name: 'gamma', type: 'number', default: 1, description: 'Gamma adjustment (0.1 to 10.0)' },
      { name: 'saturation', type: 'number', default: 1, description: 'Saturation adjustment (0.0 to 3.0)' },
      { name: 'weight', type: 'number', description: 'Gamma weight adjustment' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_colour.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_lut',
    name: 'LUT',
    category: 'effects',
    description: 'Apply Look-Up Table color grading',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'lut', type: 'file', default: './lib/lut/Andromeda.cube', description: 'LUT file path (3DL/Cube format)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_lut.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  // Composition nodes
  {
    id: 'ff_overlay',
    name: 'Overlay',
    category: 'composition',
    description: 'Overlay one video on top of another',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Background video' },
      { name: 'overlay', type: 'file', required: true, description: 'Overlay video/image' },
      { name: 'start', type: 'number', description: 'Start time in seconds to show overlay' },
      { name: 'end', type: 'number', description: 'End time in seconds to show overlay' },
      { name: 'fit', type: 'boolean', default: false, description: 'Scale overlay to fit input video' },
      { name: 'output', type: 'string', default: 'ff_overlay.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_stack',
    name: 'Stack',
    category: 'composition',
    description: 'Stack multiple videos together',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video files (folder or multiple files)', dynamic: true, dynamicPattern: 'input%d', maxDynamic: 8 },
      { name: 'vertical', type: 'boolean', default: false, description: 'Create vertical stack (2 inputs)' },
      { name: 'horizontal', type: 'boolean', default: false, description: 'Create horizontal stack (2 inputs)' },
      { name: 'grid', type: 'boolean', default: false, description: 'Create 2x2 grid (4 inputs)' },
      { name: 'output', type: 'string', default: 'ff_stack.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_watermark',
    name: 'Watermark',
    category: 'composition',
    description: 'Add watermark to video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'watermark', type: 'file', required: true, description: 'Watermark image/video' },
      { name: 'xpixels', type: 'string', default: '10', description: 'X position (supports expressions like W-w-10)' },
      { name: 'ypixels', type: 'string', default: '10', description: 'Y position (supports expressions like H-h-10)' },
      { name: 'scale', type: 'number', description: 'Scale factor for watermark' },
      { name: 'alpha', type: 'number', description: 'Alpha transparency (0-1)' },
      { name: 'start', type: 'number', description: 'Start time in seconds' },
      { name: 'end', type: 'number', description: 'End time in seconds' },
      { name: 'duration', type: 'number', description: 'Duration in seconds' },
      { name: 'output', type: 'string', default: 'ff_watermark.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_text',
    name: 'Text',
    category: 'composition',
    description: 'Add text overlay to video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'text', type: 'string', description: 'Text to display (overrides textfile)' },
      { name: 'textfile', type: 'file', description: 'File containing text to display' },
      { name: 'font', type: 'string', default: '/System/Library/Fonts/HelveticaNeue.ttc', description: 'Path to font file' },
      { name: 'colour', type: 'string', default: 'white', description: 'Font color (hex RRGGBB or name, can include alpha with @0.5)' },
      { name: 'size', type: 'number', default: 24, description: 'Font size' },
      { name: 'reduction', type: 'number', default: 8, description: 'Font size reduction per line' },
      { name: 'box', type: 'boolean', default: true, description: 'Show background box' },
      { name: 'boxcolour', type: 'string', default: 'black', description: 'Background box color' },
      { name: 'boxborder', type: 'number', default: 5, description: 'Background box border width' },
      { name: 'xpixels', type: 'string', default: '(w-tw)/2', description: 'X position (from left)' },
      { name: 'ypixels', type: 'string', default: '(h-th)/2', description: 'Y position (from top)' },
      { name: 'output', type: 'string', default: 'ff_text.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_subtitles',
    name: 'Subtitles',
    category: 'composition',
    description: 'Hard embed subtitles on video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'subtitles', type: 'file', required: true, description: 'Subtitle SRT file' },
      { name: 'styles', type: 'string', description: 'Forced style for subtitles' },
      { name: 'removedupes', type: 'boolean', default: false, description: 'Remove duplicate lines in subtitles' },
      { name: 'dynamictext', type: 'boolean', default: false, description: 'Convert subtitles to dynamic text (split words)' },
      { name: 'output', type: 'string', default: 'ff_subtitles.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  // Audio
  {
    id: 'ff_audio',
    name: 'Audio Overlay',
    category: 'composition',
    description: 'Overlay audio track on video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'audio', type: 'file', description: 'Audio file to overlay' },
      { name: 'remove', type: 'boolean', default: false, description: 'Remove existing audio instead of overlaying' },
      { name: 'start', type: 'number', default: 0, description: 'Start time in seconds' },
      { name: 'speed', type: 'number', default: 1.0, description: 'Audio playback speed' },
      { name: 'shortest', type: 'boolean', default: false, description: 'End when shortest input ends' },
      { name: 'output', type: 'string', default: 'ff_audio.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  // Format nodes
  {
    id: 'ff_convert',
    name: 'Convert',
    category: 'format',
    description: 'Convert video format with optimal codec settings',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'format', type: 'select', options: ['mp4', 'mov', 'avi', 'webm', 'mkv'], default: 'mp4', description: 'Output format (mp4 defaults to h264/aac)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_convert.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_transcode',
    name: 'Transcode',
    category: 'format',
    description: 'Transcode video with specific codec settings',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file', dynamic: true, dynamicPattern: 'input%d', maxDynamic: 10 },
      { name: 'video', type: 'string', default: 'libx264', description: 'Video codec' },
      { name: 'audio', type: 'string', default: 'aac', description: 'Audio codec' },
      { name: 'fps', type: 'number', default: 30, description: 'Frames per second' },
      { name: 'sar', type: 'string', description: 'Sample Aspect Ratio' },
      { name: 'width', type: 'number', default: 1920, description: 'Video width' },
      { name: 'height', type: 'number', description: 'Video height' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_transcode.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_social_media',
    name: 'Social Media',
    category: 'format',
    description: 'Convert ready for Social Media (pix_fmt=yuv420p)',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'instagram', type: 'boolean', default: false, description: 'Convert ready for Instagram' },
      { name: 'output', type: 'string', default: 'ff_social_media.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  // Timing nodes
  {
    id: 'ff_cut',
    name: 'Cut',
    category: 'timing',
    description: 'Cut a section from video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'start', type: 'string', default: '00:00:00', description: 'Start time (HH:MM:SS)' },
      { name: 'end', type: 'string', default: '00:00:10', description: 'End time (HH:MM:SS)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_cut.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_fps',
    name: 'FPS',
    category: 'timing',
    description: 'Change frame rate of video without changing length',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'fps', type: 'number', default: 30, description: 'Target frame rate (frames added/removed, length unchanged)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_fps.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_middle',
    name: 'Middle',
    category: 'timing',
    description: 'Trim video from start and end by specified seconds',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'trim', type: 'number', default: 1, description: 'Seconds to remove from start and end' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_middle.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_grouptime',
    name: 'Group Time',
    category: 'timing',
    description: 'Trim input videos by percentage to get correct duration',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file/folder', dynamic: true, dynamicPattern: 'input%d', maxDynamic: 10 },
      { name: 'duration', type: 'number', description: 'Target duration' },
      { name: 'arrangement', type: 'select', options: ['standard', 'reversed', 'skip1', 'skip1reversed'], default: 'standard', description: 'Order to read input files' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_grouptime.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  // Assembly nodes
  {
    id: 'ff_concat',
    name: 'Concatenate',
    category: 'assembly',
    description: 'Concatenate multiple videos',
    preview: true,
    inputs: [
      { name: 'input1', type: 'file', required: true, description: 'First video' },
      { name: 'input2', type: 'file', required: true, description: 'Second video' },
      { name: 'input3', type: 'file', description: 'Third video (optional)', dynamic: true, dynamicPattern: 'input%d', maxDynamic: 10 },
      { name: 'output', type: 'string', default: 'ff_concat.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_append',
    name: 'Append',
    category: 'assembly',
    description: 'Append two files together while re-encoding to same codec',
    preview: true,
    inputs: [
      { name: 'first', type: 'file', required: true, description: 'First input file' },
      { name: 'second', type: 'file', required: true, description: 'Second input file' },
      { name: 'output', type: 'string', default: 'ff_append.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_transition',
    name: 'Transition',
    category: 'assembly',
    description: 'Concat videos with transition effects between each',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video files/folder', dynamic: true, dynamicPattern: 'input%d', maxDynamic: 10 },
      { name: 'duration', type: 'number', description: 'Transition duration' },
      { name: 'sort', type: 'string', description: 'Sort flags for file input order (e.g. "--reverse --random-sort")' },
      { name: 'effects', type: 'string', description: 'CSV string of effects to use between clips', 
        transitionOptions: ['fade', 'fadeblack', 'fadewhite', 'distance', 'wipeleft', 'wiperight', 'wipeup', 'wipedown', 'slideleft', 'slideright', 'slideup', 'slidedown', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown', 'circlecrop', 'rectcrop', 'circleclose', 'circleopen', 'horzclose', 'horzopen', 'vertclose', 'vertopen', 'diagbl', 'diagbr', 'diagtl', 'diagtr', 'hlslice', 'hrslice', 'vuslice', 'vdslice', 'dissolve', 'pixelize', 'radial', 'hblur', 'wipetl', 'wipetr', 'wipebl', 'wipebr', 'fadegrays', 'squeezev', 'squeezeh', 'zoomin', 'hlwind', 'hrwind', 'vuwind', 'vdwind', 'coverleft', 'coverright', 'coverup', 'coverdown', 'revealleft', 'revealright', 'revealup', 'revealdown'] },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_transition.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  // Generation nodes
  {
    id: 'ff_image',
    name: 'Image to Video',
    category: 'utilities',
    description: 'Convert image to video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input image file' },
      { name: 'duration', type: 'number', default: 5, description: 'Duration in seconds' },
      { name: 'output', type: 'string', default: 'ff_image.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_kenburns',
    name: 'Ken Burns',
    category: 'utilities',
    description: 'Generate video from image with ken-burns effect',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input image file or folder' },
      { name: 'target', type: 'select', options: ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight', 'Random'], description: 'Target of the zoom' },
      { name: 'fps', type: 'number', description: 'Frames per second' },
      { name: 'width', type: 'number', description: 'Output width' },
      { name: 'height', type: 'number', description: 'Output height' },
      { name: 'duration', type: 'number', description: 'Duration in seconds' },
      { name: 'speed', type: 'number', description: 'Zoom speed' },
      { name: 'bitrate', type: 'string', default: '5000k', description: 'Output bitrate (e.g., 5000k, 2M)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_kenburns.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_thumbnail',
    name: 'Thumbnail',
    category: 'utilities',
    description: 'Create thumbnails representative of the video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'count', type: 'number', description: 'Number of thumbnails to generate' },
      { name: 'sample', type: 'string', description: 'Sample method for thumbnail generation' },
      { name: 'output', type: 'string', default: 'thumbnail.jpg', description: 'Output filename' }
    ],
    outputs: [{ name: 'image', type: 'image' }]
  },

  // Utilities
  {
    id: 'ff_proxy',
    name: 'Proxy',
    category: 'utilities',
    description: 'Generate low-resolution proxy by scaling video',
    preview: true,
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file/folder' },
      { name: 'scalex', type: 'number', description: 'X scale factor' },
      { name: 'scaley', type: 'number', description: 'Y scale factor' },
      { name: 'recursive', type: 'boolean', default: false, description: 'Process folder recursively' },
      { name: 'fps', type: 'number', description: 'Frames per second' },
      { name: 'crf', type: 'number', default: 25, description: 'Constant Rate Factor (0-51, lower = better quality)' },
      { name: 'codec', type: 'string', default: 'libx264', description: 'Video codec (libx264, libx265, libvpx, etc.)' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_proxy.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  // Custom
  {
    id: 'ff_custom',
    name: 'Custom FFMPEG',
    category: 'custom',
    description: 'Custom FFMPEG processing with any parameters',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'params', type: 'string', required: true, description: 'FFMPEG parameters string (e.g., "-c:v libx264 -c:a aac -strict experimental")' },
      { name: 'grep', type: 'string', description: 'Filter files by pattern when input is a folder' },
      { name: 'output', type: 'string', default: 'ff_custom.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  }
];

export function getNodeDefinition(id: string): NodeDefinition | undefined {
  return nodeDefinitions.find(node => node.id === id);
}

export function getNodesByCategory(category: string): NodeDefinition[] {
  return nodeDefinitions.filter(node => node.category === category);
}
