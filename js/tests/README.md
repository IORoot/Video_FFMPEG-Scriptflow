# JavaScript FFMPEG Scripts Tests

This directory contains test files and utilities for the JavaScript versions of the FFMPEG scripts.

## Test Files

### `json/test_ff_blur.json`
Basic test configuration for the `ff_blur.js` script. Applies Gaussian blur with default settings.

### `json/test_ff_blur_strong.json`
Test configuration for the `ff_blur.js` script that applies strong blur with multiple steps.

### `json/test_ff_blur_grep.json`
Test configuration for the `ff_blur.js` script that tests grep filtering on directory input.

### `json/test_ff_blur_regex.json`
Test configuration for the `ff_blur.js` script that tests regex patterns in grep (e.g., `\d_.*\.mp4`).

### `test_ff_blur.js`
Automated test runner specifically for the `ff_blur.js` script that tests:
1. **Command line argument parsing** (basic blur)
2. **Command line argument parsing** (strong blur with multiple steps)
3. **CLI with grep filtering** (directory processing with pattern matching)
4. **CLI with regex grep filtering** (regex patterns via command line)
5. **JSON config file loading** (basic blur)
6. **JSON config file loading** (strong blur)
7. **JSON config with grep filtering** (directory processing via config)
8. **JSON config with regex grep filtering** (regex patterns via JSON)
9. Help command functionality
10. Error handling for missing files
11. **FFprobe validation** - Verifies output file properties:
    - Video dimensions are maintained (1280x720)
    - Video codec is preserved (h264)
    - Video duration is maintained
    - File size changes appropriately (blur effect)
    - **Directory processing with grep filtering** (creates numbered output files)
    - **Regex pattern matching** (supports complex regex patterns)

### `json/test_ff_audio.json`
Basic test configuration for the `ff_audio.js` script. Overlays audio on video with default settings.

### `json/test_ff_audio_remove.json`
Test configuration for the `ff_audio.js` script that removes audio from video.

### `json/test_ff_audio_delayed.json`
Test configuration for the `ff_audio.js` script that tests delayed audio overlay with speed and shortest options.

### `test_ff_audio.js`
Automated test runner specifically for the `ff_audio.js` script that tests:
1. **Command line argument parsing** (audio overlay)
2. **Command line argument parsing** (audio removal)
3. **Command line argument parsing** (delayed audio with speed)
4. **JSON config file loading** (basic audio overlay)
5. **JSON config file loading** (audio removal)
6. **JSON config file loading** (delayed audio with speed and shortest)
7. Help command functionality
8. Error handling for missing files
9. Error handling for missing audio files
10. **FFprobe validation** - Verifies output file properties:
    - Audio stream presence/absence (overlay/removal)
    - Video dimensions are maintained (1280x720)
    - Codec is preserved (h264)
    - Duration changes appropriately
    - Input files are valid video/audio files

### `json/test_ff_append.json`
Basic test configuration for the `ff_append.js` script. Appends the same video to itself.

### `json/test_ff_append_comprehensive.json`
Comprehensive test configuration with different log level (info).

### `json/test_ff_append_loglevel.json`
Test configuration specifically for loglevel flag testing (verbose logging).

### `json/test_ff_append_custom_output.json`
Test configuration specifically for custom output filename testing.

### `json/test_ff_aspect_ratio.json`
Test configuration for the `ff_aspect_ratio.js` script that changes aspect ratio to 16:9.

### `json/test_ff_aspect_ratio_grep.json`
Test configuration for the `ff_aspect_ratio.js` script that tests grep filtering on directory input.

### `json/test_ff_aspect_ratio_regex.json`
Test configuration for the `ff_aspect_ratio.js` script that tests regex patterns in grep (e.g., `\d_.*\.mp4`).

### `test_ff_aspect_ratio.js`
Automated test runner specifically for the `ff_aspect_ratio.js` script that tests:
1. Command line argument parsing
2. **CLI with grep filtering** (directory processing with pattern matching)
3. JSON config file loading
4. **JSON config with grep filtering** (directory processing via config)
5. **JSON config with regex grep filtering** (regex patterns like `\d_.*\.mp4`)
6. **CLI with regex grep filtering** (regex patterns via command line)
7. **Multiple aspect ratio testing** (4:3, 1:1, 21:9)
8. Help command functionality
9. Error handling for missing files
10. **FFprobe validation** - Verifies output file properties:
    - Aspect ratio is correctly changed (DAR metadata)
    - Video dimensions are maintained (metadata-only change)
    - Codec is preserved (h264)
    - Input file is a valid video file
    - **Handles equivalent ratios** (21:9 ↔ 7:3)
    - **Directory processing with grep filtering** (creates numbered output files)
    - **Regex pattern matching** (supports complex regex patterns)

### `test_ff_append.js`
Automated test runner specifically for the `ff_append.js` script that tests:
1. Command line argument parsing
2. JSON config file loading (basic config)
3. **Comprehensive JSON config file loading** (different log level)
4. **Loglevel JSON config file loading** (verbose logging)
5. **Custom output JSON config file loading** (custom filename)
6. Help command functionality
7. Error handling for missing files
8. **FFprobe validation** - Verifies output file properties:
   - Duration is approximately 2x input duration (append operation)
   - Video dimensions are maintained (1280x720)
   - Codec is preserved (h264)
   - Input file is a valid video file

## Test Media Files

Located in `samples/` directory:
- `sample_video.mp4` - Test video file for append operations
- `sample_voice.mp3` - Test audio file
- `sample_subtitle.srt` - Test subtitle file
- `sample_image.jpeg` - Test image file

## Test File Management

### Automatic Test File Creation
Some test scripts automatically create the sample files they need:

- **`test_ff_aspect_ratio.js`**: Creates `1_test_video.mp4`, `2_test_video.mp4`, `3_test_video.mp4`, and `other_file.mp4` for regex testing, then cleans them up after tests complete.

- **`test_ff_append.js`**: Uses existing `sample_video.mp4` and `sample_voice.mp3` files.

### Required Sample Files
The following files must exist in the `samples/` directory:
- `sample_video.mp4` - Base video file for testing
- `sample_voice.mp3` - Audio file for audio-related tests
- `sample_subtitle.srt` - Subtitle file for subtitle tests
- `sample_image.jpeg` - Image file for image overlay tests

## Running Tests

### Manual Testing

#### ff_append.js
```bash
# Test with command line arguments
node ../ff_append.js -f samples/sample_video.mp4 -s samples/sample_video.mp4 -o test_output.mp4

# Test with JSON config
node ../ff_append.js -C json/test_ff_append.json

# Test help
node ../ff_append.js --help
```

#### ff_audio.js
```bash
# Test audio overlay
node ../ff_audio.js -i samples/sample_video.mp4 -a samples/sample_voice.mp3 -o test_audio.mp4

# Test audio removal
node ../ff_audio.js -i samples/sample_video.mp4 -r -o test_no_audio.mp4

# Test delayed audio with speed
node ../ff_audio.js -i samples/sample_video.mp4 -a samples/sample_voice.mp3 -s 2 -p 1.5 -o test_delayed.mp4
```

#### ff_blur.js
```bash
# Test basic blur
node ../ff_blur.js -i samples/sample_video.mp4 -s 0.5 -t 1 -o test_blur.mp4

# Test strong blur with multiple steps
node ../ff_blur.js -i samples/sample_video.mp4 -s 2.0 -t 3 -o test_strong_blur.mp4

# Test blur with grep filtering
node ../ff_blur.js -i samples -s 1.0 -t 2 -o grep_blur.mp4 -g test_video

# Test blur with regex patterns
node ../ff_blur.js -i samples -s 0.8 -t 1 -o regex_blur.mp4 -g "\\d_.*\\.mp4"
```

#### ff_aspect_ratio.js
```bash
# Test aspect ratio with grep filtering
node ../ff_aspect_ratio.js -i samples -a 16:9 -g test_video

# Test aspect ratio with regex patterns
node ../ff_aspect_ratio.js -i samples -a 16:9 -g "\\d_.*\\.mp4"
```
```

### Automated Testing
```bash
# Run ff_append.js tests
node test_ff_append.js

# Run ff_audio.js tests
node test_ff_audio.js

# Run ff_blur.js tests
node test_ff_blur.js

# Run ff_aspect_ratio.js tests
node test_ff_aspect_ratio.js
```

## Expected Behavior

The JavaScript versions should behave identically to their bash counterparts:
- Same command line interface
- Same error handling
- Same output files
- Same FFMPEG commands

## Notes

- All tests clean up after themselves by removing output files
- The help command exits with status 1 (this is expected behavior)
- Error handling tests verify that missing files are properly detected
- **FFprobe validation** ensures output files have correct properties for append operations
- Duration verification allows 0.1 second tolerance for encoding differences
