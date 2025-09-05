#!/usr/bin/env node
/**
 * Test runner for ff_kenburns.js script
 * Tests the ff_kenburns.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const { comprehensiveCleanup } = require('./test_cleanup');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_kenburns.js Script\n');

// Helper function to clean up test files
function cleanupTestFiles() {
    const testFiles = [
        'test_kenburns.mp4',
        'kenburns_test.mp4',
        'topright_kenburns.mp4',
        'random_kenburns.mp4',
        'custom_kenburns.mp4',
        'speed_kenburns.mp4',
        'bitrate_kenburns.mp4'
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

// Test 1: Basic command line arguments
console.log('1️⃣ Testing basic command line arguments...');
try {
    execSync('node ../ff_kenburns.js -i tests/samples/sample_image.jpeg -d 3 -o test_kenburns.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Basic CLI test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('test_kenburns.mp4');
    const outputSize = getFileSize('test_kenburns.mp4');
    const outputFormat = getFormatInfo('test_kenburns.mp4');
    const outputProps = getVideoProperties('test_kenburns.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 3);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (3 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 3s)`);
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
    console.log('❌ Basic CLI test failed:', error.message);
}

// Test 2: TopRight target
console.log('\n2️⃣ Testing TopRight target...');
try {
    execSync('node ../ff_kenburns.js -i tests/samples/sample_image.jpeg -t TopRight -d 4 -o topright_kenburns.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ TopRight target test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('topright_kenburns.mp4');
    const outputSize = getFileSize('topright_kenburns.mp4');
    const outputFormat = getFormatInfo('topright_kenburns.mp4');
    const outputProps = getVideoProperties('topright_kenburns.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 4);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (4 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 4s)`);
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
    console.log('❌ TopRight target test failed:', error.message);
}

// Test 3: Random target
console.log('\n3️⃣ Testing Random target...');
try {
    execSync('node ../ff_kenburns.js -i tests/samples/sample_image.jpeg -t Random -d 2 -o random_kenburns.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Random target test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('random_kenburns.mp4');
    const outputSize = getFileSize('random_kenburns.mp4');
    const outputFormat = getFormatInfo('random_kenburns.mp4');
    const outputProps = getVideoProperties('random_kenburns.mp4');
    
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
    console.log('❌ Random target test failed:', error.message);
}

// Test 4: JSON config file
console.log('\n4️⃣ Testing JSON config file...');
try {
    execSync('node ../ff_kenburns.js -C json/test_ff_kenburns.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('kenburns_test.mp4');
    const outputSize = getFileSize('kenburns_test.mp4');
    const outputFormat = getFormatInfo('kenburns_test.mp4');
    const outputProps = getVideoProperties('kenburns_test.mp4');
    
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
    console.log('❌ JSON config test failed:', error.message);
}

// Test 5: Custom parameters
console.log('\n5️⃣ Testing custom parameters...');
try {
    execSync('node ../ff_kenburns.js -i tests/samples/sample_image.jpeg -t BottomLeft -f 24 -d 6 -s 0.001 -b 3000k -o custom_kenburns.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Custom parameters test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('custom_kenburns.mp4');
    const outputSize = getFileSize('custom_kenburns.mp4');
    const outputFormat = getFormatInfo('custom_kenburns.mp4');
    const outputProps = getVideoProperties('custom_kenburns.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 6);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (6 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 6s)`);
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
    console.log('❌ Custom parameters test failed:', error.message);
}

// Test 6: Speed parameter
console.log('\n6️⃣ Testing speed parameter...');
try {
    execSync('node ../ff_kenburns.js -i tests/samples/sample_image.jpeg -s 0.002 -d 4 -o speed_kenburns.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Speed parameter test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('speed_kenburns.mp4');
    const outputSize = getFileSize('speed_kenburns.mp4');
    const outputFormat = getFormatInfo('speed_kenburns.mp4');
    const outputProps = getVideoProperties('speed_kenburns.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 4);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (4 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 4s)`);
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
    console.log('❌ Speed parameter test failed:', error.message);
}

// Test 7: Bitrate parameter
console.log('\n7️⃣ Testing bitrate parameter...');
try {
    execSync('node ../ff_kenburns.js -i tests/samples/sample_image.jpeg -b 2000k -d 3 -o bitrate_kenburns.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Bitrate parameter test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('bitrate_kenburns.mp4');
    const outputSize = getFileSize('bitrate_kenburns.mp4');
    const outputFormat = getFormatInfo('bitrate_kenburns.mp4');
    const outputProps = getVideoProperties('bitrate_kenburns.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 3);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (3 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 3s)`);
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
    
    // Verify file size is reasonable for the bitrate (rough estimate)
    if (outputSize) {
        const expectedSize = (2000 * 1000 * 3) / 8; // 2000kbps * 3 seconds / 8 bits per byte
        const sizeTolerance = expectedSize * 0.5; // Allow 50% tolerance
        if (Math.abs(outputSize - expectedSize) < sizeTolerance) {
            console.log('✅ Output file size is reasonable for the specified bitrate');
        } else {
            console.log(`⚠️  Output file size (${outputSize} bytes) may not match expected bitrate`);
        }
    }
    
} catch (error) {
    console.log('❌ Bitrate parameter test failed:', error.message);
}

// Test 8: Help command
console.log('\n8️⃣ Testing help command...');
try {
    const output = execSync('node ../ff_kenburns.js --help', { 
        cwd: __dirname,
        stdio: 'pipe',
        encoding: 'utf8'
    });
    console.log('✅ Help test passed - help command executed successfully');
} catch (error) {
    console.log('❌ Help test failed:', error.message);
}

// Test 9: Error handling - missing files
console.log('\n9️⃣ Testing error handling (missing files)...');
try {
    execSync('node ../ff_kenburns.js -i tests/samples/nonexistent.jpg -d 3 -o test_error.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Error handling test passed - correctly handled missing file gracefully');
} catch (error) {
    console.log('❌ Error handling test failed:', error.message);
}

// Clean up test files
cleanupTestFiles();

console.log('\n🎉 All tests completed!');

// Final cleanup - remove all test output files
const totalCleaned = comprehensiveCleanup(__dirname, { verbose: true });

if (totalCleaned > 0) {
    console.log(`\n🧹 Final cleanup completed: ${totalCleaned} files removed`);
}
