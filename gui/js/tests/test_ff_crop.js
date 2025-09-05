#!/usr/bin/env node
/**
 * Test runner for ff_crop.js script
 * Tests the ff_crop.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const { comprehensiveCleanup } = require('./test_cleanup');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_crop.js Script\n');

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

// Create test files needed for regex testing
createTestFiles();

// Test 1: Basic command line arguments - center crop
console.log('1️⃣ Testing basic command line arguments (center crop)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const inputSize = getFileSize('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_crop.js -i samples/sample_video.mp4 -o test_crop_output.mp4 -w 640 -h 360', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Basic crop CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_crop_output.mp4');
    const outputDuration = getVideoDuration('test_crop_output.mp4');
    const outputSize = getFileSize('test_crop_output.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    
    // Verify video dimensions are cropped correctly
    if (outputProps && outputProps.width === 640 && outputProps.height === 360) {
        console.log('✅ Video dimensions cropped correctly (640x360)');
    } else {
        console.log(`❌ Video dimensions incorrect: ${outputProps.width}x${outputProps.height}`);
    }
    
    // Verify video codec is maintained
    if (inputProps && outputProps && inputProps.codec === outputProps.codec) {
        console.log('✅ Video codec maintained');
    } else {
        console.log('❌ Video codec changed unexpectedly');
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
    
    // Clean up
    if (fs.existsSync('test_crop_output.mp4')) {
        fs.unlinkSync('test_crop_output.mp4');
    }
} catch (error) {
    console.log('❌ Basic crop CLI test failed:', error.message);
}

// Test 2: Command line arguments - corner crop
console.log('\n2️⃣ Testing command line arguments (corner crop)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_crop.js -i samples/sample_video.mp4 -o test_corner_crop.mp4 -w 400 -h 300 -x 0 -y 0', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Corner crop CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_corner_crop.mp4');
    const outputDuration = getVideoDuration('test_corner_crop.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video dimensions are cropped correctly
    if (outputProps && outputProps.width === 400 && outputProps.height === 300) {
        console.log('✅ Video dimensions cropped correctly (400x300)');
    } else {
        console.log(`❌ Video dimensions incorrect: ${outputProps.width}x${outputProps.height}`);
    }
    
    // Verify video codec is maintained
    if (inputProps && outputProps && inputProps.codec === outputProps.codec) {
        console.log('✅ Video codec maintained');
    } else {
        console.log('❌ Video codec changed unexpectedly');
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
    
    // Clean up
    if (fs.existsSync('test_corner_crop.mp4')) {
        fs.unlinkSync('test_corner_crop.mp4');
    }
} catch (error) {
    console.log('❌ Corner crop CLI test failed:', error.message);
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
    
    execSync('node ../ff_crop.js -i samples -o cli_folder_crop.mp4 -w 500 -h 400', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ CLI with directory test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_cli_folder_crop.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        
        if (outputProps && outputProps.width === 500 && outputProps.height === 400) {
            console.log(`   ✅ ${outputFile} has correct dimensions (500x400)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions: ${outputProps.width}x${outputProps.height}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ CLI with directory test failed:', error.message);
}

// Test 4: JSON config file - center crop
console.log('\n4️⃣ Testing JSON config file (center crop)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_crop.js -C json/test_ff_crop.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config center crop test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('crop_test.mp4');
    const outputDuration = getVideoDuration('crop_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video dimensions are cropped correctly
    if (outputProps && outputProps.width === 640 && outputProps.height === 360) {
        console.log('✅ Video dimensions cropped correctly (640x360)');
    } else {
        console.log(`❌ Video dimensions incorrect: ${outputProps.width}x${outputProps.height}`);
    }
    
    // Verify video codec is maintained
    if (inputProps && outputProps && inputProps.codec === outputProps.codec) {
        console.log('✅ Video codec maintained');
    } else {
        console.log('❌ Video codec changed unexpectedly');
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
    
    // Clean up
    if (fs.existsSync('crop_test.mp4')) {
        fs.unlinkSync('crop_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config center crop test failed:', error.message);
}

// Test 5: JSON config file - corner crop
console.log('\n5️⃣ Testing JSON config file (corner crop)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_crop.js -C json/test_ff_crop_corner.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config corner crop test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('crop_corner_test.mp4');
    const outputDuration = getVideoDuration('crop_corner_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video dimensions are cropped correctly
    if (outputProps && outputProps.width === 400 && outputProps.height === 300) {
        console.log('✅ Video dimensions cropped correctly (400x300)');
    } else {
        console.log(`❌ Video dimensions incorrect: ${outputProps.width}x${outputProps.height}`);
    }
    
    // Verify video codec is maintained
    if (inputProps && outputProps && inputProps.codec === outputProps.codec) {
        console.log('✅ Video codec maintained');
    } else {
        console.log('❌ Video codec changed unexpectedly');
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
    
    // Clean up
    if (fs.existsSync('crop_corner_test.mp4')) {
        fs.unlinkSync('crop_corner_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config corner crop test failed:', error.message);
}

// Test 6: JSON config file - small crop with offset
console.log('\n6️⃣ Testing JSON config file (small crop with offset)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_crop.js -C json/test_ff_crop_small.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config small crop test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('crop_small_test.mp4');
    const outputDuration = getVideoDuration('crop_small_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video dimensions are cropped correctly
    if (outputProps && outputProps.width === 200 && outputProps.height === 150) {
        console.log('✅ Video dimensions cropped correctly (200x150)');
    } else {
        console.log(`❌ Video dimensions incorrect: ${outputProps.width}x${outputProps.height}`);
    }
    
    // Verify video codec is maintained
    if (inputProps && outputProps && inputProps.codec === outputProps.codec) {
        console.log('✅ Video codec maintained');
    } else {
        console.log('❌ Video codec changed unexpectedly');
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
    
    // Clean up
    if (fs.existsSync('crop_small_test.mp4')) {
        fs.unlinkSync('crop_small_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config small crop test failed:', error.message);
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
    
    execSync('node ../ff_crop.js -C json/test_ff_crop_folder.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config directory with grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_crop_folder_test.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        
        if (outputProps && outputProps.width === 500 && outputProps.height === 400) {
            console.log(`   ✅ ${outputFile} has correct dimensions (500x400)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions: ${outputProps.width}x${outputProps.height}`);
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
    
    execSync('node ../ff_crop.js -C json/test_ff_crop_regex.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config directory with regex test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_crop_regex_test.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        
        if (outputProps && outputProps.width === 300 && outputProps.height === 200) {
            console.log(`   ✅ ${outputFile} has correct dimensions (300x200)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions: ${outputProps.width}x${outputProps.height}`);
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
    execSync('node ../ff_crop.js --help', { 
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
    execSync('node ../ff_crop.js -i samples/nonexistent.mp4 -w 300 -h 300', { 
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

// Final cleanup - remove all test output files
const totalCleaned = comprehensiveCleanup(__dirname, { verbose: true });

if (totalCleaned > 0) {
    console.log(`\n🧹 Final cleanup completed: ${totalCleaned} files removed`);
}
