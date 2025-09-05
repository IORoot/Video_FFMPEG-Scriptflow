#!/usr/bin/env node
/**
 * Test runner for ff_lut.js script
 * Tests the ff_lut.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const { comprehensiveCleanup } = require('./test_cleanup');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_lut.js Script\n');

// Helper function to clean up test files
function cleanupTestFiles() {
    const testFiles = [
        '../../test_lut.mp4',
        '../../lut_test.mp4',
        '../../andromeda_lut.mp4',
        '../../centurus_lut.mp4'
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
    execSync('node ../ff_lut.js -i tests/samples/sample_video.mp4 -t ../../lib/luts/Andromeda.cube -o test_lut.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Basic CLI test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('../../test_lut.mp4');
    const outputSize = getFileSize('../../test_lut.mp4');
    const outputFormat = getFormatInfo('../../test_lut.mp4');
    const outputProps = getVideoProperties('../../test_lut.mp4');
    
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
    console.log('❌ Basic CLI test failed:', error.message);
}

// Test 2: Different LUT file
console.log('\n2️⃣ Testing different LUT file...');
try {
    execSync('node ../ff_lut.js -i tests/samples/sample_video.mp4 -t ../../lib/luts/Centurus.CUBE -o centurus_lut.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Different LUT test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('../../centurus_lut.mp4');
    const outputSize = getFileSize('../../centurus_lut.mp4');
    const outputFormat = getFormatInfo('../../centurus_lut.mp4');
    const outputProps = getVideoProperties('../../centurus_lut.mp4');
    
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
    console.log('❌ Different LUT test failed:', error.message);
}

// Test 3: JSON config file
console.log('\n3️⃣ Testing JSON config file...');
try {
    execSync('node ../ff_lut.js -C json/test_ff_lut.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('../../lut_test.mp4');
    const outputSize = getFileSize('../../lut_test.mp4');
    const outputFormat = getFormatInfo('../../lut_test.mp4');
    const outputProps = getVideoProperties('../../lut_test.mp4');
    
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

// Test 4: Default LUT (no -t parameter)
console.log('\n4️⃣ Testing default LUT...');
try {
    execSync('node ../ff_lut.js -i tests/samples/sample_video.mp4 -o andromeda_lut.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Default LUT test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('../../andromeda_lut.mp4');
    const outputSize = getFileSize('../../andromeda_lut.mp4');
    const outputFormat = getFormatInfo('../../andromeda_lut.mp4');
    const outputProps = getVideoProperties('../../andromeda_lut.mp4');
    
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
    console.log('❌ Default LUT test failed:', error.message);
}

// Test 5: Help command
console.log('\n5️⃣ Testing help command...');
try {
    const output = execSync('node ../ff_lut.js --help', { 
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
    execSync('node ../ff_lut.js -i tests/samples/nonexistent.mp4 -t ../../lib/luts/Andromeda.cube -o test_error.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Error handling test passed - correctly handled missing file gracefully');
} catch (error) {
    console.log('❌ Error handling test failed:', error.message);
}

// Test 7: Error handling - missing LUT file
console.log('\n7️⃣ Testing error handling (missing LUT file)...');
try {
    execSync('node ../ff_lut.js -i tests/samples/sample_video.mp4 -t tests/samples/nonexistent.cube -o test_error.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Error handling test passed - correctly handled missing LUT file gracefully');
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
