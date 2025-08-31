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
}

export interface NodeDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  inputs: NodeParameter[];
  outputs: { name: string; type: string }[];
  icon?: string;
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
    inputs: [
      { name: 'url', type: 'string', required: true, description: 'URL to download video from' },
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
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'width', type: 'string', default: '1920', description: 'Width in pixels (supports expressions like iw*.5)' },
      { name: 'height', type: 'string', default: '1080', description: 'Height in pixels (supports expressions like ih*.5)' },
      { name: 'dar', type: 'string', default: '16/9', description: 'Display Aspect Ratio' },
      { name: 'sar', type: 'string', default: '1/1', description: 'Sample Aspect Ratio' },
      { name: 'output', type: 'string', default: 'ff_scale.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_crop',
    name: 'Crop',
    category: 'size',
    description: 'Crop the video to specified dimensions',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'width', type: 'string', default: '300', description: 'Width of crop area' },
      { name: 'height', type: 'string', default: '300', description: 'Height of crop area' },
      { name: 'xpixels', type: 'string', default: '(iw-ow)/2', description: 'X position (from left)' },
      { name: 'ypixels', type: 'string', default: '(ih-oh)/2', description: 'Y position (from top)' },
      { name: 'output', type: 'string', default: 'ff_crop.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_pad',
    name: 'Pad',
    category: 'size',
    description: 'Add padding around the video',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'width', type: 'string', default: '1920', description: 'Output width' },
      { name: 'height', type: 'string', default: '1080', description: 'Output height' },
      { name: 'xpixels', type: 'string', default: '(ow-iw)/2', description: 'X position of video' },
      { name: 'ypixels', type: 'string', default: '(oh-ih)/2', description: 'Y position of video' },
      { name: 'colour', type: 'string', default: 'black', description: 'Padding color' },
      { name: 'output', type: 'string', default: 'ff_pad.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_aspect_ratio',
    name: 'Aspect Ratio',
    category: 'size',
    description: 'Change aspect ratio of video',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'aspect', type: 'select', options: ['16:9', '4:3', '1:1', '9:16', '21:9'], default: '16:9', description: 'Target aspect ratio' },
      { name: 'method', type: 'select', options: ['pad', 'crop', 'stretch'], default: 'pad', description: 'How to achieve aspect ratio' },
      { name: 'output', type: 'string', default: 'ff_aspect_ratio.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_rotate',
    name: 'Rotate',
    category: 'size',
    description: 'Rotate video by specified angle',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'angle', type: 'select', options: ['90', '180', '270'], default: '90', description: 'Rotation angle in degrees' },
      { name: 'output', type: 'string', default: 'ff_rotate.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_flip',
    name: 'Flip',
    category: 'size',
    description: 'Flip video horizontally or vertically',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'direction', type: 'select', options: ['horizontal', 'vertical'], default: 'horizontal', description: 'Flip direction' },
      { name: 'output', type: 'string', default: 'ff_flip.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_to_landscape',
    name: 'To Landscape',
    category: 'size',
    description: 'Convert video to landscape orientation',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'output', type: 'string', default: 'ff_to_landscape.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_to_portrait',
    name: 'To Portrait',
    category: 'size',
    description: 'Convert video to portrait orientation',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
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
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'strength', type: 'number', default: 5, description: 'Blur strength' },
      { name: 'output', type: 'string', default: 'ff_blur.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_sharpen',
    name: 'Sharpen',
    category: 'effects',
    description: 'Apply sharpen effect to video',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'strength', type: 'number', default: 1.0, description: 'Sharpen strength' },
      { name: 'output', type: 'string', default: 'ff_sharpen.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_unsharp',
    name: 'Unsharp Mask',
    category: 'effects',
    description: 'Apply unsharp mask filter',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'luma_strength', type: 'number', default: 1.0, description: 'Luma strength' },
      { name: 'chroma_strength', type: 'number', default: 0.5, description: 'Chroma strength' },
      { name: 'output', type: 'string', default: 'ff_unsharp.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_colour',
    name: 'Color Adjust',
    category: 'effects',
    description: 'Adjust color properties of video',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'brightness', type: 'number', default: 0, description: 'Brightness adjustment' },
      { name: 'contrast', type: 'number', default: 1, description: 'Contrast adjustment' },
      { name: 'saturation', type: 'number', default: 1, description: 'Saturation adjustment' },
      { name: 'output', type: 'string', default: 'ff_colour.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_lut',
    name: 'LUT',
    category: 'effects',
    description: 'Apply Look-Up Table color grading',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'lut', type: 'select', options: ['Andromeda', 'Centurus', 'Circinus', 'Holmberg', 'Lacertae', 'Lundmark', 'Magellanic', 'Triangulum'], default: 'Andromeda', description: 'LUT file to apply' },
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
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Background video' },
      { name: 'overlay', type: 'file', required: true, description: 'Overlay video' },
      { name: 'x', type: 'string', default: '0', description: 'X position' },
      { name: 'y', type: 'string', default: '0', description: 'Y position' },
      { name: 'output', type: 'string', default: 'ff_overlay.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_stack',
    name: 'Stack',
    category: 'composition',
    description: 'Stack multiple videos together',
    inputs: [
      { name: 'input1', type: 'file', required: true, description: 'First video' },
      { name: 'input2', type: 'file', required: true, description: 'Second video' },
      { name: 'input3', type: 'file', description: 'Third video (optional)', dynamic: true, dynamicPattern: 'input%d', maxDynamic: 8 },
      { name: 'direction', type: 'select', options: ['horizontal', 'vertical'], default: 'horizontal', description: 'Stack direction' },
      { name: 'output', type: 'string', default: 'ff_stack.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_watermark',
    name: 'Watermark',
    category: 'composition',
    description: 'Add watermark to video',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'watermark', type: 'file', required: true, description: 'Watermark image' },
      { name: 'position', type: 'select', options: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'], default: 'bottom-right', description: 'Watermark position' },
      { name: 'opacity', type: 'number', default: 0.5, description: 'Watermark opacity' },
      { name: 'output', type: 'string', default: 'ff_watermark.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_text',
    name: 'Text',
    category: 'composition',
    description: 'Add text overlay to video',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'text', type: 'string', required: true, description: 'Text to display' },
      { name: 'x', type: 'string', default: '50', description: 'X position' },
      { name: 'y', type: 'string', default: '50', description: 'Y position' },
      { name: 'fontsize', type: 'number', default: 24, description: 'Font size' },
      { name: 'color', type: 'string', default: 'white', description: 'Text color' },
      { name: 'output', type: 'string', default: 'ff_text.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_subtitles',
    name: 'Subtitles',
    category: 'composition',
    description: 'Add subtitles to video',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'subtitles', type: 'file', required: true, description: 'Subtitle file (.srt)' },
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
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'audio', type: 'file', required: true, description: 'Audio file to overlay' },
      { name: 'start', type: 'number', default: 0, description: 'Start time in seconds' },
      { name: 'speed', type: 'number', default: 1.0, description: 'Audio playback speed' },
      { name: 'output', type: 'string', default: 'ff_audio.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  // Format nodes
  {
    id: 'ff_convert',
    name: 'Convert',
    category: 'format',
    description: 'Convert video format',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'format', type: 'select', options: ['mp4', 'mov', 'avi', 'webm'], default: 'mp4', description: 'Output format' },
      { name: 'output', type: 'string', default: 'ff_convert.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_transcode',
    name: 'Transcode',
    category: 'format',
    description: 'Transcode video with specific codec settings',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'codec', type: 'select', options: ['h264', 'h265', 'vp9'], default: 'h264', description: 'Video codec' },
      { name: 'bitrate', type: 'string', default: '2M', description: 'Video bitrate' },
      { name: 'output', type: 'string', default: 'ff_transcode.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_social_media',
    name: 'Social Media',
    category: 'format',
    description: 'Optimize for social media platforms',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'platform', type: 'select', options: ['instagram', 'tiktok', 'youtube', 'twitter'], default: 'instagram', description: 'Target platform' },
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
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'start', type: 'string', default: '00:00:00', description: 'Start time (HH:MM:SS)' },
      { name: 'duration', type: 'string', default: '00:00:10', description: 'Duration (HH:MM:SS)' },
      { name: 'output', type: 'string', default: 'ff_cut.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_fps',
    name: 'FPS',
    category: 'timing',
    description: 'Change frame rate of video',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'fps', type: 'select', options: ['24', '25', '30', '60'], default: '30', description: 'Target frame rate' },
      { name: 'output', type: 'string', default: 'ff_fps.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_middle',
    name: 'Middle',
    category: 'timing',
    description: 'Extract middle section of video',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'duration', type: 'number', default: 10, description: 'Duration in seconds' },
      { name: 'output', type: 'string', default: 'ff_middle.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_grouptime',
    name: 'Group Time',
    category: 'timing',
    description: 'Group multiple clips with timing',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'segments', type: 'number', default: 4, description: 'Number of segments' },
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
    description: 'Append videos with transitions',
    inputs: [
      { name: 'input1', type: 'file', required: true, description: 'First video' },
      { name: 'input2', type: 'file', required: true, description: 'Second video' },
      { name: 'transition', type: 'select', options: ['fade','fadeblack','fadewhite','distance','wipeleft','wiperight','wipeup','wipedown','slideleft','slideright','slideup','slidedown','smoothleft','smoothright','smoothup','smoothdown','circlecrop','rectcrop','circleclose','circleopen','horzclose','horzopen','vertclose','vertopen','diagbl','diagbr','diagtl','diagtr','hlslice','hrslice','vuslice','vdslice','dissolve','pixelize','radial','hblur','wipetl','wipetr','wipebl','wipebr','fadegrays','squeezev','squeezeh','zoomin','hlwind','hrwind','vuwind','vdwind','coverleft','coverright','coverup','coverdown','revealleft','revealright','revealup','revealdown'], default: 'fade', description: 'Transition type' },
      { name: 'output', type: 'string', default: 'ff_append.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_transition',
    name: 'Transition',
    category: 'assembly',
    description: 'Add transitions between clips',
    inputs: [
      { name: 'input1', type: 'file', required: true, description: 'First video' },
      { name: 'input2', type: 'file', required: true, description: 'Second video' },
      { name: 'effects', type: 'select', options: ['fade','fadeblack','fadewhite','distance','wipeleft','wiperight','wipeup','wipedown','slideleft','slideright','slideup','slidedown','smoothleft','smoothright','smoothup','smoothdown','circlecrop','rectcrop','circleclose','circleopen','horzclose','horzopen','vertclose','vertopen','diagbl','diagbr','diagtl','diagtr','hlslice','hrslice','vuslice','vdslice','dissolve','pixelize','radial','hblur','wipetl','wipetr','wipebl','wipebr','fadegrays','squeezev','squeezeh','zoomin','hlwind','hrwind','vuwind','vdwind','coverleft','coverright','coverup','coverdown','revealleft','revealright','revealup','revealdown'], default: 'fade', description: 'Transition type' },
      { name: 'duration', type: 'number', default: 1, description: 'Transition duration in seconds' },
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
    description: 'Apply Ken Burns effect to image',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input image file' },
      { name: 'duration', type: 'number', default: 5, description: 'Duration in seconds' },
      { name: 'zoom', type: 'number', default: 1.2, description: 'Zoom factor' },
      { name: 'output', type: 'string', default: 'ff_kenburns.mp4', description: 'Output filename' }
    ],
    outputs: [{ name: 'video', type: 'video' }]
  },

  {
    id: 'ff_thumbnail',
    name: 'Thumbnail',
    category: 'utilities',
    description: 'Generate thumbnail from video',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'time', type: 'string', default: '00:00:01', description: 'Time to capture thumbnail' },
      { name: 'output', type: 'string', default: 'thumbnail.jpg', description: 'Output filename' }
    ],
    outputs: [{ name: 'image', type: 'image' }]
  },

  // Utilities
  {
    id: 'ff_proxy',
    name: 'Proxy',
    category: 'utilities',
    description: 'Generate low-resolution proxy',
    inputs: [
      { name: 'input', type: 'file', required: true, description: 'Input video file' },
      { name: 'scale', type: 'select', options: ['quarter', 'half', 'proxy'], default: 'half', description: 'Proxy scale' },
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
