#!/usr/bin/env node
/**
 * Test runner for ff_image.js script
 * Tests the ff_image.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const { comprehensiveCleanup } = require('./test_cleanup');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_image.js Script\n');

// Helper function to create test image files if they don't exist
function createTestFiles() {
    console.log('📁 Using existing sample files...');
    console.log('✅ Test files ready\n');
}

// Helper function to clean up test files
function cleanupTestFiles() {
    const testFiles = [
        'test_image.mp4',
        'image_test.mp4',
        'short_image.mp4',
        'long_image.mp4'
    ];
    
    console.log('🧹 Cleaning up test files...');
    
    testFiles.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`   Removed: ${file}`);
        }
    });
    
    console.log('✅ Cleanup complete\n');
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

// Helper function to get video properties using ffprobe
function getVideoProperties(filePath) {
    try {
        const output = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height,codec_name,r_frame_rate -of csv=p=0 "${filePath}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        const [codec, width, height, frameRate] = output.trim().split(',');
        return { width: parseInt(width), height: parseInt(height), codec: codec, frameRate: frameRate };
    } catch (error) {
        console.log(`❌ Failed to get properties for ${filePath}:`, error.message);
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

// Create test files needed for testing
createTestFiles();

// Test 1: Basic command line arguments - JPG image
console.log('1️⃣ Testing basic command line arguments (JPG image)...');
try {
    // Get properties of input file
    const inputSize = getFileSize('samples/sample_image.jpeg');
    
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_image.js -i samples/sample_image.jpeg -d 5 -o test_image.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JPG image CLI test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('test_image.mp4');
    const outputSize = getFileSize('test_image.mp4');
    const outputFormat = getFormatInfo('test_image.mp4');
    const outputProps = getVideoProperties('test_image.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 5);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (5 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 5s)`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mp4')) {
        console.log('✅ Output format is correct (MP4)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
    // Verify video properties are reasonable
    if (outputProps && outputProps.width && outputProps.height) {
        console.log('✅ Output video has valid dimensions');
    } else {
        console.log('❌ Output video has invalid dimensions');
    }
    
} catch (error) {
    console.log('❌ JPG image CLI test failed:', error.message);
}

// Test 2: PNG image with different duration
console.log('\n2️⃣ Testing PNG image with different duration...');
try {
    // Get properties of input file
    const inputSize = getFileSize('samples/sample_image.png');
    
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_image.js -i samples/sample_image.png -d 10 -o long_image.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ PNG image CLI test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('long_image.mp4');
    const outputSize = getFileSize('long_image.mp4');
    const outputFormat = getFormatInfo('long_image.mp4');
    const outputProps = getVideoProperties('long_image.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 10);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (10 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 10s)`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mp4')) {
        console.log('✅ Output format is correct (MP4)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
    // Verify video properties are reasonable
    if (outputProps && outputProps.width && outputProps.height) {
        console.log('✅ Output video has valid dimensions');
    } else {
        console.log('❌ Output video has invalid dimensions');
    }
    
} catch (error) {
    console.log('❌ PNG image CLI test failed:', error.message);
}

// Test 3: GIF image with short duration
console.log('\n3️⃣ Testing GIF image with short duration...');
try {
    // Get properties of input file
    const inputSize = getFileSize('samples/sample_image.gif');
    
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_image.js -i samples/sample_image.gif -d 2 -o short_image.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ GIF image CLI test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('short_image.mp4');
    const outputSize = getFileSize('short_image.mp4');
    const outputFormat = getFormatInfo('short_image.mp4');
    const outputProps = getVideoProperties('short_image.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 2);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (2 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 2s)`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mp4')) {
        console.log('✅ Output format is correct (MP4)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
    // Verify video properties are reasonable
    if (outputProps && outputProps.width && outputProps.height) {
        console.log('✅ Output video has valid dimensions');
    } else {
        console.log('❌ Output video has invalid dimensions');
    }
    
} catch (error) {
    console.log('❌ GIF image CLI test failed:', error.message);
}

// Test 4: JSON config file
console.log('\n4️⃣ Testing JSON config file...');
try {
    // Get properties of input file
    const inputSize = getFileSize('samples/sample_image.jpeg');
    
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_image.js -C json/test_ff_image.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('image_test.mp4');
    const outputSize = getFileSize('image_test.mp4');
    const outputFormat = getFormatInfo('image_test.mp4');
    const outputProps = getVideoProperties('image_test.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 7);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (7 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 7s)`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mp4')) {
        console.log('✅ Output format is correct (MP4)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
    // Verify video properties are reasonable
    if (outputProps && outputProps.width && outputProps.height) {
        console.log('✅ Output video has valid dimensions');
    } else {
        console.log('❌ Output video has invalid dimensions');
    }
    
} catch (error) {
    console.log('❌ JSON config test failed:', error.message);
}

// Test 5: Help command
console.log('\n5️⃣ Testing help command...');
try {
    const output = execSync('node ../ff_image.js --help', { 
        cwd: __dirname,
        stdio: 'pipe',
        encoding: 'utf8'
    });
    console.log('✅ Help test passed - help command executed successfully');
} catch (error) {
    console.log('❌ Help test failed:', error.message);
}

// Test 6: Error handling - missing files
console.log('\n6️⃣ Testing error handling (missing files)...');
try {
    execSync('node ../ff_image.js -i samples/nonexistent.jpg -d 5 -o test_error.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Error handling test passed - correctly handled missing file gracefully');
} catch (error) {
    console.log('❌ Error handling test failed:', error.message);
}

// Test 7: Verify input files are valid images
console.log('\n7️⃣ Testing input file validation...');
try {
    const image1Size = getFileSize('samples/sample_image.jpeg');
    const image2Size = getFileSize('samples/sample_image.png');
    const image3Size = getFileSize('samples/sample_image.gif');
    
    if (image1Size && image2Size && image3Size) {
        console.log(`✅ Image file validation passed - All files are valid images`);
        console.log(`   JPG: ${image1Size} bytes`);
        console.log(`   PNG: ${image2Size} bytes`);
        console.log(`   GIF: ${image3Size} bytes`);
    } else {
        console.log('❌ Image file validation failed - not all files are valid images');
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
