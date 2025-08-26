# Video FFMPEG Scriptflow GUI

A React-based node editor for creating visual FFMPEG pipelines using the Video FFMPEG Scriptflow wrapper scripts.

## Features

- **Node-based Visual Editor**: Drag and drop FFMPEG operations to build complex video processing pipelines
- **Real-time Pipeline Validation**: Validates connections and required parameters before execution
- **JSON Export**: Export pipelines as JSON configuration files compatible with `scriptflow.sh`
- **Pipeline Execution**: Run pipelines directly from the GUI with real-time progress tracking
- **Categorized Node Library**: Organized collection of FFMPEG operations grouped by function
- **Dark Theme**: Clean, modern dark interface optimized for video editing workflows
- **Responsive Design**: Works on desktop and tablet devices

## Tech Stack

- **React 18** with TypeScript
- **Rete.js v2** for the node editor
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- FFMPEG installed and available in PATH
- JQ installed for JSON processing

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view the GUI

### Building for Production

```bash
npm run build
```

## Usage

### Creating a Pipeline

1. **Open the Node Library**: Click the "Nodes" button in the toolbar to open the sidebar
2. **Browse Categories**: Explore different categories of FFMPEG operations:
   - **Input**: Download videos, file inputs
   - **Size & Position**: Scale, crop, rotate, aspect ratio adjustments
   - **Effects**: Blur, sharpen, color correction, LUT application
   - **Composition**: Overlay, watermark, text, subtitles
   - **Format**: Convert, transcode, social media optimization
   - **Timing**: Cut, FPS changes, duration adjustments
   - **Assembly**: Concatenate, append, transitions
   - **Utilities**: Proxy generation, thumbnails, Ken Burns effects

3. **Add Nodes**: Drag nodes from the sidebar onto the canvas
4. **Connect Nodes**: Click and drag from output sockets to input sockets to create connections
5. **Configure Parameters**: Select nodes to view and edit their parameters in the inspector panel

### Exporting and Running

1. **Validate Pipeline**: The system automatically validates your pipeline and shows any errors
2. **Export JSON**: Click "Export JSON" to download a configuration file
3. **Run Pipeline**: Click "Run Pipeline" to execute the pipeline using `scriptflow.sh`
4. **Monitor Progress**: View real-time logs and progress in the log viewer

### Keyboard Shortcuts

- **Delete/Backspace**: Remove selected nodes
- **Ctrl/Cmd + A**: Select all nodes
- **Drag**: Move nodes around the canvas
- **Mouse wheel**: Zoom in/out
- **Middle mouse drag**: Pan the canvas

## Node Types

### Input Nodes
- **Download**: Download videos from URLs
- **File Input**: Reference local video files

### Size & Position
- **Scale**: Change video dimensions with aspect ratio control
- **Crop**: Extract portions of video
- **Pad**: Add padding/borders around video
- **Rotate**: Rotate video by 90/180/270 degrees
- **Flip**: Mirror video horizontally or vertically
- **Aspect Ratio**: Convert between aspect ratios (16:9, 4:3, 1:1, etc.)

### Effects
- **Blur**: Apply gaussian blur
- **Sharpen**: Enhance video sharpness
- **Color**: Adjust brightness, contrast, saturation
- **LUT**: Apply color grading lookup tables

### Composition
- **Overlay**: Composite videos together
- **Watermark**: Add logo/watermark overlays
- **Text**: Add text overlays with positioning
- **Subtitles**: Burn-in subtitle files
- **Audio**: Overlay or replace audio tracks

### Format & Timing
- **Convert**: Change video formats (MP4, MOV, etc.)
- **Transcode**: Re-encode with different codecs
- **Cut**: Extract time-based segments
- **FPS**: Change frame rates
- **Social Media**: Optimize for platforms (Instagram, TikTok, etc.)

### Assembly
- **Concatenate**: Join multiple videos sequentially
- **Transition**: Add transitions between clips
- **Stack**: Arrange videos side-by-side or vertically

## Configuration

The GUI generates JSON configuration files that are compatible with the main `scriptflow.sh` runner. Example output:

```json
{
  "ff_download": {
    "description": "Download a video from URL",
    "url": "https://example.com/video.mp4",
    "output": "downloaded_video.mp4"
  },
  "ff_scale": {
    "description": "Change the scale of the video",
    "input": "downloaded_video.mp4",
    "width": "1920",
    "height": "1080",
    "output": "scaled_video.mp4"
  }
}
```

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── NodeEditor.tsx   # Main Rete.js editor component
│   ├── Sidebar.tsx      # Node library sidebar
│   ├── Toolbar.tsx      # Bottom toolbar with actions
│   └── LogViewer.tsx    # Pipeline execution logs
├── lib/                 # Core logic
│   ├── nodeDefinitions.ts  # FFMPEG script definitions
│   ├── reteConfig.ts       # Rete.js configuration
│   ├── jsonExporter.ts     # Pipeline export logic
│   └── pipelineRunner.ts   # Pipeline execution
└── App.tsx             # Main application component
```

### Adding New Nodes

1. Add the node definition to `src/lib/nodeDefinitions.ts`
2. Define inputs, outputs, and parameter types
3. The node will automatically appear in the appropriate category

### Customizing Themes

Modify the CSS custom properties in `src/index.css` to change colors and styling.

## Troubleshooting

### Common Issues

1. **Node connections not working**: Ensure socket types are compatible (video → video, audio → audio)
2. **Export validation fails**: Check that all required parameters are filled or connected
3. **Pipeline execution fails**: Verify FFMPEG and JQ are installed and accessible
4. **Performance issues**: Try clearing the browser cache and reloading

### Debug Mode

Set `DEBUG=1` environment variable to enable verbose logging:

```bash
DEBUG=1 npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Video FFMPEG Scriptflow toolkit. See the main project README for license information.