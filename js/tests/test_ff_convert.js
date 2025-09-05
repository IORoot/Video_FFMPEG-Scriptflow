#!/usr/bin/env node
/**
 * Test runner for ff_convert.js script
 * Tests the ff_convert.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_convert.js Script\n');

// Helper function to create test video files if they don't exist
function createTestFiles() {
    const testFiles = [
        '1_test_video.mp4',
        '2_test_video.mp4', 
        '3_test_video.mp4',
        'other_file.mp4'
    ];
    
    console.log('📁 Creating test files for regex testing...');
    
    testFiles.forEach(file => {
        const filePath = path.join('samples', file);
        if (!fs.existsSync(filePath)) {
            // Copy the base sample video to create test files
            execSync(`cp samples/sample_video.mp4 ${filePath}`, { stdio: 'pipe' });
            console.log(`   Created: ${file}`);
        }
    });
    
    console.log('✅ Test files ready\n');
}

// Helper function to clean up test files
function cleanupTestFiles() {
    const testFiles = [
        '1_test_video.mp4',
        '2_test_video.mp4', 
        '3_test_video.mp4',
        'other_file.mp4'
    ];
    
    console.log('🧹 Cleaning up test files...');
    
    testFiles.forEach(file => {
        const filePath = path.join('samples', file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`   Removed: ${file}`);
        }
    });
    
    console.log('✅ Cleanup complete\n');
}

// Helper function to get video properties using ffprobe
function getVideoProperties(filePath) {
    try {
        const output = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height,codec_name -of csv=p=0 "${filePath}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        const [codec, width, height] = output.trim().split(',');
        return { width: parseInt(width), height: parseInt(height), codec: codec };
    } catch (error) {
        console.log(`❌ Failed to get properties for ${filePath}:`, error.message);
        return null;
    }
}

// Helper function to get video duration using ffprobe
function getVideoDuration(filePath) {
    try {
        const output = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return parseFloat(output.trim());
    } catch (error) {
        console.log(`❌ Failed to get duration for ${filePath}:`, error.message);
        return null;
    }
}

// Helper function to get file size
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        return null;
    }
}

// Helper function to get format info using ffprobe
function getFormatInfo(filePath) {
    try {
        const output = execSync(`ffprobe -v quiet -show_entries format=format_name -of csv=p=0 "${filePath}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return output.trim();
    } catch (error) {
        console.log(`❌ Failed to get format for ${filePath}:`, error.message);
        return null;
    }
}

// Create test files needed for regex testing
createTestFiles();

// Test 1: Basic command line arguments - MP4 to MP4
console.log('1️⃣ Testing basic command line arguments (MP4 to MP4)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const inputSize = getFileSize('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_convert.js -i samples/sample_video.mp4 -o test_convert_output -f mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Basic convert CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_convert_output.mp4');
    const outputDuration = getVideoDuration('test_convert_output.mp4');
    const outputSize = getFileSize('test_convert_output.mp4');
    const outputFormat = getFormatInfo('test_convert_output.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Verify duration is maintained
    if (inputDuration && outputDuration) {
        const durationDiff = Math.abs(inputDuration - outputDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration maintained');
        } else {
            console.log(`❌ Video duration changed: ${inputDuration}s → ${outputDuration}s`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mp4')) {
        console.log('✅ Output format is correct (MP4)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
    // Clean up
    if (fs.existsSync('test_convert_output.mp4')) {
        fs.unlinkSync('test_convert_output.mp4');
    }
} catch (error) {
    console.log('❌ Basic convert CLI test failed:', error.message);
}

// Test 2: Command line arguments - MP4 to WebM
console.log('\n2️⃣ Testing command line arguments (MP4 to WebM)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_convert.js -i samples/sample_video.mp4 -o test_convert_webm -f webm', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ WebM convert CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_convert_webm.webm');
    const outputDuration = getVideoDuration('test_convert_webm.webm');
    const outputFormat = getFormatInfo('test_convert_webm.webm');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output format: ${outputFormat}`);
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Verify duration is maintained
    if (inputDuration && outputDuration) {
        const durationDiff = Math.abs(inputDuration - outputDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration maintained');
        } else {
            console.log(`❌ Video duration changed: ${inputDuration}s → ${outputDuration}s`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('webm')) {
        console.log('✅ Output format is correct (WebM)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
    // Clean up
    if (fs.existsSync('test_convert_webm.webm')) {
        fs.unlinkSync('test_convert_webm.webm');
    }
} catch (error) {
    console.log('❌ WebM convert CLI test failed:', error.message);
}

// Test 3: CLI with directory input
console.log('\n3️⃣ Testing CLI with directory input...');
try {
    // Count files that should be processed
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && file.includes('test_video');
        });
    
    console.log(`   Found ${files.length} files matching 'test_video' pattern`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_convert.js -i samples -o cli_folder_convert -f mov', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ CLI with directory test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_cli_folder_convert.mov`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        const outputFormat = getFormatInfo(outputFile);
        
        if (outputProps && outputProps.width === 1280 && outputProps.height === 720) {
            console.log(`   ✅ ${outputFile} has correct dimensions (1280x720)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions: ${outputProps.width}x${outputProps.height}`);
        }
        
        if (outputFormat && outputFormat.includes('mov')) {
            console.log(`   ✅ ${outputFile} has correct format (MOV)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect format: ${outputFormat}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ CLI with directory test failed:', error.message);
}

// Test 4: JSON config file - MP4 to MP4
console.log('\n4️⃣ Testing JSON config file (MP4 to MP4)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_convert.js -C json/test_ff_convert.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config MP4 test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('convert_test.mp4');
    const outputDuration = getVideoDuration('convert_test.mp4');
    const outputFormat = getFormatInfo('convert_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output format: ${outputFormat}`);
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Verify duration is maintained
    if (inputDuration && outputDuration) {
        const durationDiff = Math.abs(inputDuration - outputDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration maintained');
        } else {
            console.log(`❌ Video duration changed: ${inputDuration}s → ${outputDuration}s`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mp4')) {
        console.log('✅ Output format is correct (MP4)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
    // Clean up
    if (fs.existsSync('convert_test.mp4')) {
        fs.unlinkSync('convert_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config MP4 test failed:', error.message);
}

// Test 5: JSON config file - MP4 to WebM
console.log('\n5️⃣ Testing JSON config file (MP4 to WebM)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_convert.js -C json/test_ff_convert_webm.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config WebM test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('convert_webm_test.webm');
    const outputDuration = getVideoDuration('convert_webm_test.webm');
    const outputFormat = getFormatInfo('convert_webm_test.webm');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output format: ${outputFormat}`);
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Verify duration is maintained
    if (inputDuration && outputDuration) {
        const durationDiff = Math.abs(inputDuration - outputDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration maintained');
        } else {
            console.log(`❌ Video duration changed: ${inputDuration}s → ${outputDuration}s`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('webm')) {
        console.log('✅ Output format is correct (WebM)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
    // Clean up
    if (fs.existsSync('convert_webm_test.webm')) {
        fs.unlinkSync('convert_webm_test.webm');
    }
} catch (error) {
    console.log('❌ JSON config WebM test failed:', error.message);
}

// Test 6: JSON config file - MP4 to MOV
console.log('\n6️⃣ Testing JSON config file (MP4 to MOV)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_convert.js -C json/test_ff_convert_mov.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config MOV test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('convert_mov_test.mov');
    const outputDuration = getVideoDuration('convert_mov_test.mov');
    const outputFormat = getFormatInfo('convert_mov_test.mov');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output format: ${outputFormat}`);
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Verify duration is maintained
    if (inputDuration && outputDuration) {
        const durationDiff = Math.abs(inputDuration - outputDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration maintained');
        } else {
            console.log(`❌ Video duration changed: ${inputDuration}s → ${outputDuration}s`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mov')) {
        console.log('✅ Output format is correct (MOV)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
    // Clean up
    if (fs.existsSync('convert_mov_test.mov')) {
        fs.unlinkSync('convert_mov_test.mov');
    }
} catch (error) {
    console.log('❌ JSON config MOV test failed:', error.message);
}

// Test 7: JSON config file - directory with grep
console.log('\n7️⃣ Testing JSON config file (directory with grep)...');
try {
    // Count files that should match the pattern
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && file.includes('test_video');
        });
    
    console.log(`   Found ${files.length} files matching 'test_video' pattern`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_convert.js -C json/test_ff_convert_folder.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config directory with grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_convert_folder_test.avi`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        const outputFormat = getFormatInfo(outputFile);
        
        if (outputProps && outputProps.width === 1280 && outputProps.height === 720) {
            console.log(`   ✅ ${outputFile} has correct dimensions (1280x720)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions: ${outputProps.width}x${outputProps.height}`);
        }
        
        if (outputFormat && outputFormat.includes('avi')) {
            console.log(`   ✅ ${outputFile} has correct format (AVI)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect format: ${outputFormat}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ JSON config directory with grep test failed:', error.message);
}

// Test 8: JSON config file - directory with regex
console.log('\n8️⃣ Testing JSON config file (directory with regex)...');
try {
    // Count files that should match the regex pattern \d_.*\.mp4
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && /^\d_.*\.mp4$/.test(file);
        });
    
    console.log(`   Found ${files.length} files matching regex pattern '\\d_.*\\.mp4'`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_convert.js -C json/test_ff_convert_regex.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config directory with regex test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_convert_regex_test.mkv`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        const outputFormat = getFormatInfo(outputFile);
        
        if (outputProps && outputProps.width === 1280 && outputProps.height === 720) {
            console.log(`   ✅ ${outputFile} has correct dimensions (1280x720)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions: ${outputProps.width}x${outputProps.height}`);
        }
        
        if (outputFormat && outputFormat.includes('matroska')) {
            console.log(`   ✅ ${outputFile} has correct format (MKV)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect format: ${outputFormat}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ JSON config directory with regex test failed:', error.message);
}

// Test 9: Help command
console.log('\n9️⃣ Testing help command...');
try {
    execSync('node ../ff_convert.js --help', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Help test failed - should have exited');
} catch (error) {
    if (error.status === 1) {
        console.log('✅ Help test passed - correctly exited with status 1');
    } else {
        console.log('❌ Help test failed:', error.message);
    }
}

// Test 10: Error handling - missing files
console.log('\n🔟 Testing error handling (missing files)...');
try {
    execSync('node ../ff_convert.js -i samples/nonexistent.mp4 -f mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught missing file');
}

// Test 11: Verify input file is valid video
console.log('\n1️⃣1️⃣ Testing input file validation...');
try {
    const videoProps = getVideoProperties('samples/sample_video.mp4');
    const videoDuration = getVideoDuration('samples/sample_video.mp4');
    
    if (videoProps && videoProps.width && videoProps.height && videoProps.codec) {
        console.log(`✅ Video file validation passed - ${videoProps.width}x${videoProps.height} ${videoProps.codec} (duration: ${videoDuration}s)`);
    } else {
        console.log('❌ Video file validation failed - not a valid video file');
    }
} catch (error) {
    console.log('❌ Input file validation failed:', error.message);
}

// Clean up test files
cleanupTestFiles();

console.log('\n🎉 All tests completed!');
