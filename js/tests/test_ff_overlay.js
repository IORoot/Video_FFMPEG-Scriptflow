#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🧪 Testing ff_overlay.js Script\n');

// Helper functions for testing
function getVideoDuration(filename) {
    try {
        const output = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filename}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return parseFloat(output.trim());
    } catch (error) {
        console.log(`❌ Failed to get duration for ${filename}: ${error.message}`);
        return null;
    }
}

function getFileSize(filename) {
    try {
        const stats = fs.statSync(filename);
        return stats.size;
    } catch (error) {
        console.log(`❌ Failed to get file size for ${filename}: ${error.message}`);
        return null;
    }
}

function getFormatInfo(filename) {
    try {
        const output = execSync(`ffprobe -v quiet -show_entries format=format_name -of csv=p=0 "${filename}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return output.trim();
    } catch (error) {
        console.log(`❌ Failed to get format for ${filename}: ${error.message}`);
        return null;
    }
}

function getVideoProperties(filename) {
    try {
        const output = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height,codec_name,r_frame_rate -of csv=p=0 "${filename}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        const parts = output.trim().split(',');
        if (parts.length >= 4) {
            const [codec, width, height, frameRate] = parts;
            return { width: parseInt(width), height: parseInt(height), codec, frameRate };
        } else {
            return null;
        }
    } catch (error) {
        console.log(`❌ Failed to get properties for ${filename}: ${error.message}`);
        return null;
    }
}

// Helper function to clean up test files
function cleanupTestFiles() {
    const testFiles = [
        'test_overlay.mp4',
        'video_overlay.mp4',
        'image_overlay.mp4',
        'fit_overlay.mp4',
        'timed_overlay.mp4',
        'overlay_test.mp4',
        'ff_resized_overlay.mp4'
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

// Test 1: Basic video overlay (video over video)
console.log('1️⃣ Testing basic video overlay (video over video)...');
try {
    execSync('node ../ff_overlay.js -i samples/sample_video.mp4 -v samples/sample_video2.mp4 -o test_overlay.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Basic video overlay test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('test_overlay.mp4');
    const outputSize = getFileSize('test_overlay.mp4');
    const outputFormat = getFormatInfo('test_overlay.mp4');
    const outputProps = getVideoProperties('test_overlay.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
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
    console.log('❌ Basic video overlay test failed:', error.message);
}

// Test 2: Image overlay (image over video)
console.log('\n2️⃣ Testing image overlay (image over video)...');
try {
    execSync('node ../ff_overlay.js -i samples/sample_video.mp4 -v samples/sample_image.jpeg -o image_overlay.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Image overlay test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('image_overlay.mp4');
    const outputSize = getFileSize('image_overlay.mp4');
    const outputFormat = getFormatInfo('image_overlay.mp4');
    const outputProps = getVideoProperties('image_overlay.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
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
    console.log('❌ Image overlay test failed:', error.message);
}

// Test 3: Fit flag (scale overlay to fit)
console.log('\n3️⃣ Testing fit flag (scale overlay to fit)...');
try {
    execSync('node ../ff_overlay.js -i samples/sample_video.mp4 -v samples/sample_image.jpeg -f -o fit_overlay.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Fit flag test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('fit_overlay.mp4');
    const outputSize = getFileSize('fit_overlay.mp4');
    const outputFormat = getFormatInfo('fit_overlay.mp4');
    const outputProps = getVideoProperties('fit_overlay.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
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
    console.log('❌ Fit flag test failed:', error.message);
}

// Test 4: Timed overlay (start and end times)
console.log('\n4️⃣ Testing timed overlay (start and end times)...');
try {
    execSync('node ../ff_overlay.js -i samples/sample_video.mp4 -v samples/sample_image.jpeg -S 2 -E 5 -o timed_overlay.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Timed overlay test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('timed_overlay.mp4');
    const outputSize = getFileSize('timed_overlay.mp4');
    const outputFormat = getFormatInfo('timed_overlay.mp4');
    const outputProps = getVideoProperties('timed_overlay.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
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
    console.log('❌ Timed overlay test failed:', error.message);
}

// Test 5: JSON config file
console.log('\n5️⃣ Testing JSON config file...');
try {
    execSync('node ../ff_overlay.js -C json/test_ff_overlay.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('overlay_test.mp4');
    const outputSize = getFileSize('overlay_test.mp4');
    const outputFormat = getFormatInfo('overlay_test.mp4');
    const outputProps = getVideoProperties('overlay_test.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
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

// Test 6: Help command
console.log('\n6️⃣ Testing help command...');
try {
    const output = execSync('node ../ff_overlay.js --help', { 
        cwd: __dirname,
        stdio: 'pipe',
        encoding: 'utf8'
    });
    console.log('✅ Help test passed - help command executed successfully');
} catch (error) {
    console.log('❌ Help test failed:', error.message);
}

// Test 7: Error handling (missing files)
console.log('\n7️⃣ Testing error handling (missing files)...');
try {
    execSync('node ../ff_overlay.js -i samples/nonexistent.mp4 -v samples/sample_image.jpeg -o test_error.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have handled missing file gracefully');
} catch (error) {
    console.log('✅ Error handling test passed - correctly handled missing file gracefully');
}

// Test 8: Error handling (missing overlay)
console.log('\n8️⃣ Testing error handling (missing overlay)...');
try {
    execSync('node ../ff_overlay.js -i samples/sample_video.mp4 -v samples/nonexistent.jpeg -o test_error.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have handled missing overlay gracefully');
} catch (error) {
    console.log('✅ Error handling test passed - correctly handled missing overlay gracefully');
}

// Clean up test files
cleanupTestFiles();

console.log('\n🎉 All tests completed!');
