# JavaScript FFMPEG Scripts Tests

This directory contains test files and utilities for the JavaScript versions of the FFMPEG scripts.

## Test Files

### `json/test_ff_concat.json`
Basic test configuration for the `ff_concat.js` script. Concatenates two video files together.

### `json/test_ff_concat_three.json`
Test configuration for the `ff_concat.js` script that concatenates three video files together.

### `json/test_ff_concat_folder.json`
Test configuration for the `ff_concat.js` script that tests concatenating files from a directory with grep filtering.

### `json/test_ff_convert.json`
Basic test configuration for the `ff_convert.js` script. Converts MP4 to MP4 format.

### `json/test_ff_convert_webm.json`
Test configuration for the `ff_convert.js` script that converts MP4 to WebM format.

### `json/test_ff_convert_mov.json`
Test configuration for the `ff_convert.js` script that converts MP4 to MOV format.

### `json/test_ff_convert_folder.json`
Test configuration for the `ff_convert.js` script that tests directory processing with grep filtering.

### `json/test_ff_convert_regex.json`
Test configuration for the `ff_convert.js` script that tests regex patterns in grep.

### `json/test_ff_crop.json`
Basic test configuration for the `ff_crop.js` script. Crops video to 640x360 with center positioning.

### `json/test_ff_crop_corner.json`
Test configuration for the `ff_crop.js` script that crops video to 400x300 at corner position (0,0).

### `json/test_ff_crop_small.json`
Test configuration for the `ff_crop.js` script that crops video to 200x150 with offset positioning (100,100).

### `json/test_ff_crop_folder.json`
Test configuration for the `ff_crop.js` script that tests directory processing with grep filtering.

### `json/test_ff_crop_regex.json`
Test configuration for the `ff_crop.js` script that tests regex patterns in grep (e.g., `\d_.*\.mp4`).

### `test_ff_crop.js`
Automated test runner specifically for the `ff_crop.js` script that tests:
1. **Command line argument parsing** (center crop - 640x360)
2. **Command line argument parsing** (corner crop - 400x300 at 0,0)
3. **CLI with directory input** (directory processing)
4. **JSON config file loading** (center crop - 640x360)
5. **JSON config file loading** (corner crop - 400x300 at 0,0)
6. **JSON config file loading** (small crop with offset - 200x150 at 100,100)
7. **JSON config with directory and grep filtering** (directory processing via config)
8. **JSON config with directory and regex grep filtering** (regex patterns via JSON)
9. Help command functionality
10. Error handling for missing files
11. **FFprobe validation** - Verifies output file properties:
    - Video dimensions are correctly cropped (640x360, 400x300, 200x150)
    - Video codec is preserved (h264)
    - Video duration is maintained
    - File size changes appropriately (crop operation)
    - **Directory processing with grep filtering** (creates numbered output files)
    - **Regex pattern matching** (supports complex regex patterns)

### `json/test_ff_cut.json`
Basic test configuration for the `ff_cut.js` script. Cuts video to first 5 seconds (00:00:00 to 00:00:05).

### `json/test_ff_cut_middle.json`
Test configuration for the `ff_cut.js` script that cuts the middle section (00:00:02 to 00:00:07).

### `json/test_ff_cut_end.json`
Test configuration for the `ff_cut.js` script that cuts the end section (00:00:05 to 00:00:10).

### `json/test_ff_cut_folder.json`
Test configuration for the `ff_cut.js` script that tests directory processing with grep filtering.

### `json/test_ff_cut_regex.json`
Test configuration for the `ff_cut.js` script that tests regex patterns in grep (e.g., `\d_.*\.mp4`).

### `test_ff_cut.js`
Automated test runner specifically for the `ff_cut.js` script that tests:
1. **Command line argument parsing** (cut first 5 seconds)
2. **Command line argument parsing** (cut middle section)
3. **CLI with directory input** (directory processing)
4. **JSON config file loading** (cut first 5 seconds)
5. **JSON config file loading** (cut middle section)
6. **JSON config file loading** (cut end section)
7. **JSON config with directory and grep filtering** (directory processing via config)
8. **JSON config with directory and regex grep filtering** (regex patterns via JSON)
9. Help command functionality
10. Error handling for missing files
11. **FFprobe validation** - Verifies output file properties:
    - Video dimensions are maintained (1280x720)
    - Video codec is preserved (h264)
    - Video duration is correctly cut (5 seconds for various time ranges)
    - File size changes appropriately (cut operation)
    - **Directory processing with grep filtering** (creates numbered output files)
    - **Regex pattern matching** (supports complex regex patterns)

### `test_ff_convert.js`
Automated test runner specifically for the `ff_convert.js` script that tests:
1. **Command line argument parsing** (MP4 to MP4 conversion)
2. **Command line argument parsing** (MP4 to WebM conversion)
3. **CLI with directory input** (directory processing)
4. **JSON config file loading** (MP4 to MP4 conversion)
5. **JSON config file loading** (MP4 to WebM conversion)
6. **JSON config file loading** (MP4 to MOV conversion)
7. **JSON config with directory and grep filtering** (directory processing via config)
8. **JSON config with directory and regex grep filtering** (regex patterns via JSON)
9. Help command functionality
10. Error handling for missing files
11. **FFprobe validation** - Verifies output file properties:
    - Video dimensions are maintained (1280x720)
    - Video codec changes appropriately (h264, vp9)
    - Video duration is maintained
    - File size changes appropriately (format conversion)
    - **Format detection** (MP4, WebM, MOV, AVI, MKV)
    - **Directory processing with grep filtering** (creates numbered output files)
    - **Regex pattern matching** (supports complex regex patterns)

### `json/test_ff_concat_regex.json`
Test configuration for the `ff_concat.js` script that tests regex patterns in grep (e.g., `\d_.*\.mp4`).

### `test_ff_concat.js`
Automated test runner specifically for the `ff_concat.js` script that tests:
1. **Command line argument parsing** (two files concatenation)
2. **Command line argument parsing** (three files concatenation)
3. **CLI with directory input** (directory processing)
4. **JSON config file loading** (two files concatenation)
5. **JSON config file loading** (three files concatenation)
6. **JSON config with directory and grep filtering** (directory processing via config)
7. **JSON config with directory and regex grep filtering** (regex patterns via JSON)
8. Help command functionality
9. Error handling for missing files
10. Error handling for no input files
11. **FFprobe validation** - Verifies output file properties:
    - Video dimensions are maintained (1280x720)
    - Video codec is preserved (h264)
    - Video duration is correctly summed (2x, 3x input duration)
    - File size changes appropriately (concatenation)
    - **Directory processing with grep filtering** (processes multiple files)
    - **Regex pattern matching** (supports complex regex patterns)

### `json/test_ff_colour.json`
Basic test configuration for the `ff_colour.js` script. Applies color adjustments with default values.

### `json/test_ff_colour_adjustments.json`
Test configuration for the `ff_colour.js` script that applies various color adjustments (brightness, contrast, gamma, saturation, weight).

### `json/test_ff_colour_grep.json`
Test configuration for the `ff_colour.js` script that tests grep filtering on directory input.

### `json/test_ff_colour_regex.json`
Test configuration for the `ff_colour.js` script that tests regex patterns in grep (e.g., `\d_.*\.mp4`).

### `test_ff_colour.js`
Automated test runner specifically for the `ff_colour.js` script that tests:
1. **Command line argument parsing** (basic color adjustments)
2. **Command line argument parsing** (various color parameters)
3. **CLI with grep filtering** (directory processing with pattern matching)
4. **CLI with regex grep filtering** (regex patterns via command line)
5. **JSON config file loading** (basic color adjustments)
6. **JSON config file loading** (various color parameters)
7. **JSON config with grep filtering** (directory processing via config)
8. **JSON config with regex grep filtering** (regex patterns via JSON)
9. Help command functionality
10. Error handling for missing files
11. **FFprobe validation** - Verifies output file properties:
    - Video dimensions are maintained (1280x720)
    - Video codec is preserved (h264)
    - Video duration is maintained
    - File size changes appropriately (color adjustments)
    - **Directory processing with grep filtering** (creates numbered output files)
    - **Regex pattern matching** (supports complex regex patterns)

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

### `json/test_ff_pad_basic.json`
Basic test configuration for the `ff_pad.js` script. Adds padding to double the video height with orange background.

### `json/test_ff_pad_white.json`
Test configuration for the `ff_pad.js` script that creates white background padding around the video.

### `json/test_ff_pad_letterbox.json`
Test configuration for the `ff_pad.js` script that creates black letterbox bars around the video.

### `json/test_ff_pad_full.json`
Test configuration for the `ff_pad.js` script that adds full padding on all sides with custom color.

### `json/test_ff_rotate_90.json`
Test configuration for the `ff_rotate.js` script that rotates video 90 degrees clockwise.

### `json/test_ff_rotate_180.json`
Test configuration for the `ff_rotate.js` script that rotates video 180 degrees (upside down).

### `json/test_ff_rotate_270.json`
Test configuration for the `ff_rotate.js` script that rotates video 270 degrees counter-clockwise.

### `json/test_ff_rotate_multiple.json`
Test configuration for the `ff_rotate.js` script that performs multiple rotation operations on different videos.

### `test_ff_rotate.js`
Automated test runner specifically for the `ff_rotate.js` script that tests:
1. **Command line argument parsing** (90-degree rotation)
2. **Command line argument parsing** (180-degree rotation)
3. **Command line argument parsing** (270-degree rotation)
4. **Custom loglevel** (warning instead of error)
5. **JSON config file loading** (90-degree rotation)
6. **Invalid rotation value handling** (graceful error handling)
7. **Non-existent input file handling** (graceful exit)
8. Help command functionality
9. Error handling for missing files
10. **FFprobe validation** - Verifies output file properties:
    - Video duration is preserved during rotation
    - File size changes appropriately (rotation operation)
    - Output files are created successfully
    - Rotation angles are applied correctly (90°, 180°, 270°)

### `test_ff_pad.js`
Automated test runner specifically for the `ff_pad.js` script that tests:
1. **Basic padding** - Double height with default orange color
2. **White background padding** - White padding around video
3. **Black letterbox bars** - Letterbox effect with black bars
4. **Centered padding with custom color** - Orange padding with 1.5x scaling
5. **Full padding all around** - 2x scaling on all sides
6. **FFprobe validation** - Verifies output file properties:
   - Video dimensions are correctly padded (height doubled, width maintained, etc.)
   - Video codec is preserved (h264)
   - Video duration is maintained (no time changes)
   - File size changes appropriately (padding operation)
   - **Various padding scenarios** (letterbox, full padding, centered)
   - **Color variations** (default orange, white, black, custom colors)

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

### `json/test_ff_proxy.json`
Test configuration for the `ff_proxy.js` script with four different proxy settings:
1. **Standard editing proxy** (1280x720, 30fps, CRF 25, H.264)
2. **Small proxy** (640x480, 24fps, CRF 30, H.264)
3. **High-quality proxy** (1920x1080, 30fps, CRF 20, H.265)
4. **Preview proxy** (480x270, 15fps, CRF 35, H.264)

### `test_ff_proxy.js`
Automated test runner specifically for the `ff_proxy.js` script that tests:
1. **Basic proxy generation** (1280x720, 30fps, CRF 25)
2. **Custom dimensions** (640x480, 24fps, CRF 30)
3. **Different codec** (H.265 with CRF 28)
4. **JSON configuration** (960x540, 25fps, CRF 23)
5. **Folder processing** (batch processing with recursive option)
6. **Error handling** (invalid files, missing inputs)
7. **FFprobe validation** - Verifies output file properties:
    - Video dimensions are correctly scaled (1280x720, 640x480, etc.)
    - Frame rate is correctly changed (30fps, 24fps, 15fps)
    - Video codec is correctly applied (H.264, H.265)
    - File size is significantly reduced (proxy operation)
    - **Aspect ratio preservation** (using -2 for auto-scaling)
    - **Quality control** (CRF values affect file size/quality)
    - **Batch processing** (creates proxy files in folders)

## Test Media Files

Located in `samples/` directory:
- `sample_video.mp4` - Test video file for append operations
- `sample_voice.mp3` - Test audio file
- `sample_subtitle.srt` - Test subtitle file
- `sample_image.jpeg` - Test image file

## Test File Management

### Automatic Test File Creation
Some test scripts automatically create the sample files they need:

- **`test_ff_aspect_ratio.js`**: Creates `sample_video.mp4`, `sample_video.mp4`, `sample_video.mp4`, and `other_file.mp4` for regex testing, then cleans them up after tests complete.

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

#### ff_convert.js
```bash
# Test basic conversion (MP4 to MP4)
node ../ff_convert.js -i samples/sample_video.mp4 -o test_convert -f mp4

# Test conversion to WebM
node ../ff_convert.js -i samples/sample_video.mp4 -o test_webm -f webm

# Test conversion to MOV
node ../ff_convert.js -i samples/sample_video.mp4 -o test_mov -f mov

# Test conversion with directory input
node ../ff_convert.js -i samples -o folder_convert -f avi

# Test conversion with grep filtering
node ../ff_convert.js -i samples -o grep_convert -f mkv -g test_video
```

#### ff_concat.js
```bash
# Test basic concatenation (two files)
node ../ff_concat.js -o test_concat.mp4 -i samples/sample_video.mp4 -i samples/sample_video.mp4

# Test concatenation (three files)
node ../ff_concat.js -o test_concat_three.mp4 -i samples/sample_video.mp4 -i samples/sample_video.mp4 -i samples/sample_video.mp4

# Test concatenation with directory input
node ../ff_concat.js -o folder_concat.mp4 -i samples

# Test concatenation with grep filtering
node ../ff_concat.js -o grep_concat.mp4 -i samples -g test_video
```

#### ff_colour.js
```bash
# Test basic color adjustments
node ../ff_colour.js -i samples/sample_video.mp4 -b 0 -c 1 -m 1 -s 1 -w 1 -o test_colour.mp4

# Test various color adjustments
node ../ff_colour.js -i samples/sample_video.mp4 -b 0.5 -c 1.2 -m 1.5 -s 1.8 -w 0.8 -o test_adjustments.mp4

# Test color with grep filtering
node ../ff_colour.js -i samples -b 0.3 -c 1.1 -m 1.2 -s 1.5 -w 0.9 -o grep_colour.mp4 -g test_video

# Test color with regex patterns
node ../ff_colour.js -i samples -b -0.2 -c 0.8 -m 0.7 -s 0.5 -w 0.6 -o regex_colour.mp4 -g "\\d_.*\\.mp4"
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

#### ff_pad.js
```bash
# Test basic padding - double height
node ../ff_pad.js -i samples/sample_video.mp4 -o test_pad_basic.mp4 --height "ih*2"

# Test white background padding
node ../ff_pad.js -i samples/sample_video.mp4 -o test_pad_white.mp4 --height "ih*2" -c white

# Test black letterbox bars
node ../ff_pad.js -i samples/sample_video.mp4 -o test_pad_letterbox.mp4 -w iw --height "ih+100" -y "(oh-ih)/2" -x "(ow-iw)/2" -c #000000

# Test centered padding with custom color
node ../ff_pad.js -i samples/sample_video.mp4 -o test_pad_centered.mp4 -w "iw*1.5" --height "ih*1.5" -x "(ow-iw)/2" -y "(oh-ih)/2" -c "#fb923c"

# Test full padding all around
node ../ff_pad.js -i samples/sample_video.mp4 -o test_pad_full.mp4 -w "iw*2" --height "ih*2"

# Test with JSON config
node ../ff_pad.js -C json/test_ff_pad_basic.json
```

#### ff_proxy.js
```bash
# Test basic proxy generation (1280x720, 30fps, CRF 25)
node ../ff_proxy.js -i samples/sample_video.mp4 -o test_proxy.mp4

# Test custom dimensions (640x480, 24fps, CRF 30)
node ../ff_proxy.js -i samples/sample_video.mp4 -x 640 -y 480 -f 24 -c 30 -o test_small_proxy.mp4

# Test different codec (H.265 with CRF 28)
node ../ff_proxy.js -i samples/sample_video.mp4 -d libx265 -c 28 -o test_hevc_proxy.mp4

# Test high-quality proxy (1920x1080, 30fps, CRF 20)
node ../ff_proxy.js -i samples/sample_video.mp4 -x 1920 -c 20 -o test_hq_proxy.mp4

# Test preview proxy (480x270, 15fps, CRF 35)
node ../ff_proxy.js -i samples/sample_video.mp4 -x 480 -y 270 -f 15 -c 35 -o test_preview_proxy.mp4

# Test with JSON config file
node ../ff_proxy.js -C json/test_ff_proxy.json

# Test folder processing (batch processing)
node ../ff_proxy.js -i samples -r -x 800 -y 600

# Test folder processing with grep filtering
node ../ff_proxy.js -i samples -r -g test_video -x 640 -y 480

#### ff_crop.js
```bash
# Test basic center crop
node ../ff_crop.js -i samples/sample_video.mp4 -o test_crop.mp4 -w 640 -h 360

# Test corner crop
node ../ff_crop.js -i samples/sample_video.mp4 -o test_corner_crop.mp4 -w 400 -h 300 -x 0 -y 0

# Test small crop with offset
node ../ff_crop.js -i samples/sample_video.mp4 -o test_small_crop.mp4 -w 200 -h 150 -x 100 -y 100

# Test crop with directory input
node ../ff_crop.js -i samples -o folder_crop.mp4 -w 500 -h 400

# Test crop with grep filtering
node ../ff_crop.js -i samples -o grep_crop.mp4 -w 500 -h 400 -g test_video

# Test crop with regex patterns
node ../ff_crop.js -i samples -o regex_crop.mp4 -w 300 -h 200 -g "\\d_.*\\.mp4"
```

#### ff_download.js
```bash
# Test basic download (single URL)
node ../ff_download.js -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4 -o test_download.mp4

# Test multiple URLs with strategy limit
node ../ff_download.js -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4 -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4 -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4 -s 2 -o test_download.mp4

# Test random strategy with tilde
node ../ff_download.js -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4 -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4 -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4 -s ~2 -o test_random.mp4

# Test with JSON config file
node ../ff_download.js -C json/test_ff_download.json

# Test with JSON config and multiple URLs
node ../ff_download.js -C json/test_ff_download_multiple.json

# Test URL source file
node ../ff_download.js -u test_url_list.txt -s 2 -o test_urlsource
```

#### ff_cut.js
```bash
# Test basic cut (first 5 seconds)
node ../ff_cut.js -i samples/sample_video.mp4 -o test_cut.mp4 -s 00:00:00 -e 00:00:05

# Test cut middle section
node ../ff_cut.js -i samples/sample_video.mp4 -o test_middle_cut.mp4 -s 00:00:02 -e 00:00:07

# Test cut end section
node ../ff_cut.js -i samples/sample_video.mp4 -o test_end_cut.mp4 -s 00:00:05 -e 00:00:10

# Test cut with directory input
node ../ff_cut.js -i samples -o folder_cut.mp4 -s 00:00:01 -e 00:00:06

# Test cut with grep filtering
node ../ff_cut.js -i samples -o grep_cut.mp4 -s 00:00:01 -e 00:00:06 -g test_video

# Test cut with regex patterns
node ../ff_cut.js -i samples -o regex_cut.mp4 -s 00:00:03 -e 00:00:08 -g "\\d_.*\\.mp4"
```

#### ff_custom.js
```bash
# Test basic codec conversion
node ../ff_custom.js -i samples/sample_video.mp4 -o test_custom -p "-c:v libx264 -c:a aac -strict experimental"

# Test with video filter (text overlay)
node ../ff_custom.js -i samples/sample_video.mp4 -o test_text -p "-vf \"drawtext=text='Hello World':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2\" -c:v libx264 -c:a aac"

# Test with video filter (blur effect)
node ../ff_custom.js -i samples/sample_video.mp4 -o test_blur -p "-vf \"boxblur=5:5\" -c:v libx264 -c:a aac"

# Test with JSON config file
node ../ff_custom.js -C json/test_ff_custom.json

# Test with JSON config and video filter
node ../ff_custom.js -C json/test_ff_custom_filter.json

# Test directory processing with regex
node ../ff_custom.js -C json/test_ff_custom_regex.json
```

#### ff_flip.js
```bash
# Test horizontal flip
node ../ff_flip.js -i samples/sample_video.mp4 -h -o test_horizontal.mp4

# Test vertical flip
node ../ff_flip.js -i samples/sample_video.mp4 -v -o test_vertical.mp4

# Test both horizontal and vertical flip
node ../ff_flip.js -i samples/sample_video.mp4 -h -v -o test_both.mp4

# Test with JSON config file (horizontal flip)
node ../ff_flip.js -C json/test_ff_flip.json

# Test with JSON config file (vertical flip)
node ../ff_flip.js -C json/test_ff_flip_vertical.json

# Test directory processing with regex
node ../ff_flip.js -C json/test_ff_flip_regex.json
```

#### ff_fps.js
```bash
# Test 30 FPS conversion
node ../ff_fps.js -i samples/sample_video.mp4 -f 30 -o test_30fps.mp4

# Test 60 FPS conversion
node ../ff_fps.js -i samples/sample_video.mp4 -f 60 -o test_60fps.mp4

# Test 24 FPS conversion
node ../ff_fps.js -i samples/sample_video.mp4 -f 24 -o test_24fps.mp4

# Test with JSON config file (30 FPS)
node ../ff_fps.js -C json/test_ff_fps.json

# Test with JSON config file (60 FPS)
node ../ff_fps.js -C json/test_ff_fps_high.json

# Test directory processing with regex
node ../ff_fps.js -C json/test_ff_fps_regex.json
```

#### ff_grouptime.js
```bash
# Test multiple files with 30 second target
node ../ff_grouptime.js -i samples/sample_video.mp4 -i samples/sample_video2.mp4 -i samples/sample_video.mp4 -d 30 -o test_grouptime.mp4

# Test multiple files with reversed arrangement
node ../ff_grouptime.js -i samples/sample_video.mp4 -i samples/sample_video2.mp4 -i samples/sample_video.mp4 -a reversed -d 20 -o reversed_grouptime.mp4

# Test directory input with grep filtering
node ../ff_grouptime.js -i samples -g ".*_video" -d 5 -o short_grouptime.mp4

# Test with JSON config file (multiple files)
node ../ff_grouptime.js -C json/test_ff_grouptime.json

# Test with random arrangement
node ../ff_grouptime.js -i samples/sample_video.mp4 -i samples/sample_video2.mp4 -i samples/sample_video.mp4 -a random -d 25 -o random_grouptime.mp4

# Test with even/odd arrangement
node ../ff_grouptime.js -i samples/sample_video.mp4 -i samples/sample_video2.mp4 -i samples/sample_video.mp4 -i samples/sample_video2.mp4 -a even -d 30 -o even_grouptime.mp4
```

#### ff_image.js
```bash
# Test JPG image to video (5 seconds)
node ../ff_image.js -i samples/sample_image.jpeg -d 5 -o sample_image.mp4

# Test PNG image to video (10 seconds)
node ../ff_image.js -i samples/sample_image.png -d 10 -o long_image.mp4

# Test GIF image to video (2 seconds)
node ../ff_image.js -i samples/sample_image.gif -d 2 -o short_image.mp4

# Test with JSON config file
node ../ff_image.js -C json/test_ff_image.json

# Test with different duration
node ../ff_image.js -i samples/sample_image.jpeg -d 15 -o long_video.mp4

# Test with custom output name
node ../ff_image.js -i samples/sample_image.png -d 8 -o custom_name.mp4
```

#### ff_kenburns.js
```bash
# Test basic Ken Burns effect (TopLeft)
node ../ff_kenburns.js -i samples/sample_image.jpeg -d 3 -o test_kenburns.mp4

# Test TopRight target
node ../ff_kenburns.js -i samples/sample_image.jpeg -t TopRight -d 4 -o topright_kenburns.mp4

# Test Random target
node ../ff_kenburns.js -i samples/sample_image.jpeg -t Random -d 2 -o random_kenburns.mp4

# Test with JSON config file
node ../ff_kenburns.js -C json/test_ff_kenburns.json

# Test custom parameters (BottomLeft, 24fps, 6s, custom speed/bitrate)
node ../ff_kenburns.js -i samples/sample_image.jpeg -t BottomLeft -f 24 -d 6 -s 0.001 -b 100k -o custom_kenburns.mp4

# Test with custom dimensions
node ../ff_kenburns.js -i samples/sample_image.jpeg -w 1920 -h 1080 -d 5 -o hd_kenburns.mp4

# Test speed parameter (faster zoom)
node ../ff_kenburns.js -i samples/sample_image.jpeg -s 0.002 -d 4 -o speed_kenburns.mp4

# Test bitrate parameter (lower quality)
node ../ff_kenburns.js -i samples/sample_image.jpeg -b 2000k -d 3 -o bitrate_kenburns.mp4
```

#### ff_overlay.js
```bash
# Test basic video overlay (video over video)
node ../ff_overlay.js -i samples/sample_video.mp4 -v samples/sample_video2.mp4 -o test_overlay.mp4

# Test image overlay (image over video)
node ../ff_overlay.js -i samples/sample_video.mp4 -v samples/sample_image.jpeg -o image_overlay.mp4

# Test fit flag (scale overlay to fit video dimensions)
node ../ff_overlay.js -i samples/sample_video.mp4 -v samples/sample_image.jpeg -f -o fit_overlay.mp4

# Test timed overlay (show overlay from 2-5 seconds)
node ../ff_overlay.js -i samples/sample_video.mp4 -v samples/sample_image.jpeg -S 2 -E 5 -o timed_overlay.mp4

# Test with JSON config file
node ../ff_overlay.js -C json/test_ff_overlay.json

# Test with custom output name
node ../ff_overlay.js -i samples/sample_video.mp4 -v samples/sample_image.png -o custom_overlay.mp4
```

#### ff_rotate.js
```bash
# Test basic 90-degree rotation
node ../ff_rotate.js -i samples/sample_video.mp4 -r 90 -o test_rotate_90.mp4

# Test 180-degree rotation (upside down)
node ../ff_rotate.js -i samples/sample_video.mp4 -r 180 -o test_rotate_180.mp4

# Test 270-degree rotation (counter-clockwise)
node ../ff_rotate.js -i samples/sample_video.mp4 -r 270 -o test_rotate_270.mp4

# Test with custom loglevel
node ../ff_rotate.js -i samples/sample_video.mp4 -r 90 -l warning -o test_rotate_warning.mp4

# Test with JSON config file
node ../ff_rotate.js -C json/test_ff_rotate_90.json

# Test with JSON config file (180 degrees)
node ../ff_rotate.js -C json/test_ff_rotate_180.json

# Test with JSON config file (270 degrees)
node ../ff_rotate.js -C json/test_ff_rotate_270.json

# Test help command
node ../ff_rotate.js --help
```

#### ff_lut.js
```bash
# Test basic LUT application (Andromeda)
node ../ff_lut.js -i samples/sample_video.mp4 -t ../../lib/luts/Andromeda.cube -o test_lut.mp4

# Test different LUT file (Centurus)
node ../ff_lut.js -i samples/sample_video.mp4 -t ../../lib/luts/Centurus.CUBE -o centurus_lut.mp4

# Test with JSON config file
node ../ff_lut.js -C json/test_ff_lut.json

# Test default LUT (no -t parameter)
node ../ff_lut.js -i samples/sample_video.mp4 -o andromeda_lut.mp4

# Test with custom output name
node ../ff_lut.js -i samples/sample_video.mp4 -t ../../lib/luts/Holmberg.CUBE -o holmberg_lut.mp4
```

#### ff_middle.js
```bash
# Test basic middle trim (2 seconds from start/end)
node ../ff_middle.js -i samples/sample_video.mp4 -t 2 -o test_middle.mp4

# Test longer trim (5 seconds from start/end)
node ../ff_middle.js -i samples/sample_video.mp4 -t 5 -o long_middle.mp4

# Test short trim (0.5 seconds from start/end)
node ../ff_middle.js -i samples/sample_video.mp4 -t 0.5 -o short_middle.mp4

# Test with JSON config file
node ../ff_middle.js -C json/test_ff_middle.json

# Test default trim (1 second from start/end)
node ../ff_middle.js -i samples/sample_video.mp4 -o default_middle.mp4

# Test with custom output name
node ../ff_middle.js -i samples/sample_video.mp4 -t 3 -o custom_middle.mp4
```

### Automated Testing
```bash
# Run ff_append.js tests
node test_ff_append.js

# Run ff_audio.js tests
node test_ff_audio.js

# Run ff_blur.js tests
node test_ff_blur.js

# Run ff_colour.js tests
node test_ff_colour.js

# Run ff_convert.js tests
node test_ff_convert.js

# Run ff_crop.js tests
node test_ff_crop.js

# Run ff_download.js tests
node test_ff_download.js

# Run ff_cut.js tests
node test_ff_cut.js

# Run ff_concat.js tests
node test_ff_concat.js

# Run ff_aspect_ratio.js tests
node test_ff_aspect_ratio.js

# Run ff_custom.js tests
node test_ff_custom.js

# Run ff_flip.js tests
node test_ff_flip.js

# Run ff_fps.js tests
node test_ff_fps.js

# Run ff_grouptime.js tests
node test_ff_grouptime.js

# Run ff_image.js tests
node test_ff_image.js

# Run ff_kenburns.js tests
node test_ff_kenburns.js

# Run ff_lut.js tests
node test_ff_lut.js

# Run ff_middle.js tests
node test_ff_middle.js

# Run ff_overlay.js tests
node test_ff_overlay.js

# Run ff_pad.js tests
node test_ff_pad.js

# Run ff_proxy.js tests
node test_ff_proxy.js

# Run ff_rotate.js tests
node test_ff_rotate.js
```
```
```
```
```
```
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
