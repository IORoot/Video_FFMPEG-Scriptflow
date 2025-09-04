# JavaScript FFMPEG Scripts Tests

This directory contains test files and utilities for the JavaScript versions of the FFMPEG scripts.

## Test Files

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
```bash
# Test with command line arguments
node ../ff_append.js -f samples/sample_video.mp4 -s samples/sample_video.mp4 -o test_output.mp4

# Test with JSON config
node ../ff_append.js -C json/test_ff_append.json

# Test help
node ../ff_append.js --help

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
