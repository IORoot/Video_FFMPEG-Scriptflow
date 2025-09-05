#!/usr/bin/env node
/**
 * Test runner for ff_blur.js script
 * Tests the ff_blur.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_blur.js Script\n');

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

// Test 1: Basic command line arguments
console.log('1️⃣ Testing basic command line arguments...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const inputSize = getFileSize('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_blur.js -i samples/sample_video.mp4 -s 0.5 -t 1 -o test_blur_output.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Basic blur CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_blur_output.mp4');
    const outputDuration = getVideoDuration('test_blur_output.mp4');
    const outputSize = getFileSize('test_blur_output.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
        
        if (inputProps.codec === outputProps.codec) {
            console.log('✅ Video codec maintained');
        } else {
            console.log('❌ Video codec changed unexpectedly');
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
    
    // Clean up
    if (fs.existsSync('test_blur_output.mp4')) {
        fs.unlinkSync('test_blur_output.mp4');
    }
} catch (error) {
    console.log('❌ Basic blur CLI test failed:', error.message);
}

// Test 2: Command line arguments - strong blur with multiple steps
console.log('\n2️⃣ Testing command line arguments (strong blur with multiple steps)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputSize = getFileSize('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_blur.js -i samples/sample_video.mp4 -s 2.0 -t 3 -o test_strong_blur.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Strong blur CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_strong_blur.mp4');
    const outputSize = getFileSize('test_strong_blur.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output file size: ${outputSize} bytes`);
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
        
        if (inputProps.codec === outputProps.codec) {
            console.log('✅ Video codec maintained');
        } else {
            console.log('❌ Video codec changed unexpectedly');
        }
    }
    
    // Clean up
    if (fs.existsSync('test_strong_blur.mp4')) {
        fs.unlinkSync('test_strong_blur.mp4');
    }
} catch (error) {
    console.log('❌ Strong blur CLI test failed:', error.message);
}

// Test 3: CLI with grep filtering
console.log('\n3️⃣ Testing CLI with grep filtering...');
try {
    // Count files that should match the pattern
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && file.includes('test_video');
        });
    
    console.log(`   Found ${files.length} files matching 'test_video' pattern`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_blur.js -i samples -s 1.0 -t 2 -o cli_grep_blur.mp4 -g test_video', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ CLI with grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_cli_grep_blur.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        if (outputProps && outputProps.width === 1280 && outputProps.height === 720) {
            console.log(`   ✅ ${outputFile} has correct dimensions (1280x720)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions: ${outputProps.width}x${outputProps.height}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ CLI with grep test failed:', error.message);
}

// Test 4: CLI with regex grep filtering
console.log('\n4️⃣ Testing CLI with regex grep filtering...');
try {
    // Count files that should match the regex pattern \d_.*\.mp4
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && /^\d_.*\.mp4$/.test(file);
        });
    
    console.log(`   Found ${files.length} files matching regex pattern '\\d_.*\\.mp4'`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_blur.js -i samples -s 0.8 -t 1 -o cli_regex_blur.mp4 -g "\\d_.*\\.mp4"', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ CLI with regex grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_cli_regex_blur.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        if (outputProps && outputProps.width === 1280 && outputProps.height === 720) {
            console.log(`   ✅ ${outputFile} has correct dimensions (1280x720)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions: ${outputProps.width}x${outputProps.height}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ CLI with regex grep test failed:', error.message);
}

// Test 5: JSON config file - basic blur
console.log('\n5️⃣ Testing JSON config file (basic blur)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_blur.js -C json/test_ff_blur.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config basic blur test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('blur_test.mp4');
    const outputDuration = getVideoDuration('blur_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
        
        if (inputProps.codec === outputProps.codec) {
            console.log('✅ Video codec maintained');
        } else {
            console.log('❌ Video codec changed unexpectedly');
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
    
    // Clean up
    if (fs.existsSync('blur_test.mp4')) {
        fs.unlinkSync('blur_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config basic blur test failed:', error.message);
}

// Test 6: JSON config file - strong blur
console.log('\n6️⃣ Testing JSON config file (strong blur)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    
    execSync('node ../ff_blur.js -C json/test_ff_blur_strong.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config strong blur test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('strong_blur_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
        
        if (inputProps.codec === outputProps.codec) {
            console.log('✅ Video codec maintained');
        } else {
            console.log('❌ Video codec changed unexpectedly');
        }
    }
    
    // Clean up
    if (fs.existsSync('strong_blur_test.mp4')) {
        fs.unlinkSync('strong_blur_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config strong blur test failed:', error.message);
}

// Test 7: JSON config file - grep filtering
console.log('\n7️⃣ Testing JSON config file (grep filtering)...');
try {
    // Count files that should match the pattern
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && file.includes('test_video');
        });
    
    console.log(`   Found ${files.length} files matching 'test_video' pattern`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_blur.js -C json/test_ff_blur_grep.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_grep_blur_test.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        if (outputProps && outputProps.width === 1280 && outputProps.height === 720) {
            console.log(`   ✅ ${outputFile} has correct dimensions (1280x720)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions: ${outputProps.width}x${outputProps.height}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ JSON config grep test failed:', error.message);
}

// Test 8: JSON config file - regex grep filtering
console.log('\n8️⃣ Testing JSON config file (regex grep filtering)...');
try {
    // Count files that should match the regex pattern \d_.*\.mp4
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && /^\d_.*\.mp4$/.test(file);
        });
    
    console.log(`   Found ${files.length} files matching regex pattern '\\d_.*\\.mp4'`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_blur.js -C json/test_ff_blur_regex.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config regex grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_regex_blur_test.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        if (outputProps && outputProps.width === 1280 && outputProps.height === 720) {
            console.log(`   ✅ ${outputFile} has correct dimensions (1280x720)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions: ${outputProps.width}x${outputProps.height}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ JSON config regex grep test failed:', error.message);
}

// Test 9: Help command
console.log('\n9️⃣ Testing help command...');
try {
    execSync('node ../ff_blur.js --help', { 
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
    execSync('node ../ff_blur.js -i samples/nonexistent.mp4 -s 0.5', { 
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
