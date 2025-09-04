#!/usr/bin/env node
/**
 * Test runner for ff_grouptime.js script
 * Tests the ff_grouptime.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_grouptime.js Script\n');

// Helper function to create test video files if they don't exist
function createTestFiles() {
    const testFiles = [
        '1_test_video.mp4',
        '2_test_video.mp4', 
        '3_test_video.mp4',
        '4_test_video.mp4'
    ];
    
    console.log('📁 Creating test files for group time testing...');
    
    testFiles.forEach(file => {
        const filePath = path.join('samples', file);
        if (!fs.existsSync(filePath)) {
            // Copy the base sample video to create test files
            execSync(`cp ../../tests/sample_video.mp4 ${filePath}`, { stdio: 'pipe' });
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
        '4_test_video.mp4',
        'test_grouptime.mp4',
        'grouptime_test.mp4',
        'short_grouptime.mp4',
        'reversed_grouptime.mp4'
    ];
    
    console.log('🧹 Cleaning up test files...');
    
    testFiles.forEach(file => {
        const filePath = path.join('samples', file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`   Removed: ${file}`);
        }
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

// Test 1: Basic command line arguments - multiple files
console.log('1️⃣ Testing basic command line arguments (multiple files)...');
try {
    // Get properties of input files
    const input1Duration = getVideoDuration('samples/1_test_video.mp4');
    const input2Duration = getVideoDuration('samples/2_test_video.mp4');
    const input3Duration = getVideoDuration('samples/3_test_video.mp4');
    const totalInputDuration = input1Duration + input2Duration + input3Duration;
    
    console.log(`   Input 1 duration: ${input1Duration} seconds`);
    console.log(`   Input 2 duration: ${input2Duration} seconds`);
    console.log(`   Input 3 duration: ${input3Duration} seconds`);
    console.log(`   Total input duration: ${totalInputDuration} seconds`);
    
    execSync('node ../ff_grouptime.js -i samples/1_test_video.mp4 -i samples/2_test_video.mp4 -i samples/3_test_video.mp4 -d 30 -o test_grouptime.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Multiple files CLI test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('test_grouptime.mp4');
    const outputSize = getFileSize('test_grouptime.mp4');
    const outputFormat = getFormatInfo('test_grouptime.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 30);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (30 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 30s)`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mp4')) {
        console.log('✅ Output format is correct (MP4)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
} catch (error) {
    console.log('❌ Multiple files CLI test failed:', error.message);
}

// Test 2: JSON config file - multiple files
console.log('\n2️⃣ Testing JSON config file (multiple files)...');
try {
    // Get properties of input files
    const input1Duration = getVideoDuration('samples/1_test_video.mp4');
    const input2Duration = getVideoDuration('samples/2_test_video.mp4');
    const input3Duration = getVideoDuration('samples/3_test_video.mp4');
    const input4Duration = getVideoDuration('samples/4_test_video.mp4');
    const totalInputDuration = input1Duration + input2Duration + input3Duration + input4Duration;
    
    console.log(`   Input 1 duration: ${input1Duration} seconds`);
    console.log(`   Input 2 duration: ${input2Duration} seconds`);
    console.log(`   Input 3 duration: ${input3Duration} seconds`);
    console.log(`   Input 4 duration: ${input4Duration} seconds`);
    console.log(`   Total input duration: ${totalInputDuration} seconds`);
    
    execSync('node ../ff_grouptime.js -C json/test_ff_grouptime.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config multiple files test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('grouptime_test.mp4');
    const outputSize = getFileSize('grouptime_test.mp4');
    const outputFormat = getFormatInfo('grouptime_test.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    console.log(`   Output format: ${outputFormat}`);
    
    // Verify duration is close to target (allow 0.5 second tolerance)
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 40);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (40 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 40s)`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mp4')) {
        console.log('✅ Output format is correct (MP4)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
} catch (error) {
    console.log('❌ JSON config multiple files test failed:', error.message);
}

// Test 3: Arrangement test - reversed order
console.log('\n3️⃣ Testing arrangement (reversed order)...');
try {
    execSync('node ../ff_grouptime.js -i samples/1_test_video.mp4 -i samples/2_test_video.mp4 -i samples/3_test_video.mp4 -a reversed -d 20 -o reversed_grouptime.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Reversed arrangement test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('reversed_grouptime.mp4');
    const outputFormat = getFormatInfo('reversed_grouptime.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output format: ${outputFormat}`);
    
    // Verify duration is close to target
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 20);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (20 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 20s)`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mp4')) {
        console.log('✅ Output format is correct (MP4)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
} catch (error) {
    console.log('❌ Reversed arrangement test failed:', error.message);
}

// Test 4: Directory input with grep filtering
console.log('\n4️⃣ Testing directory input with grep filtering...');
try {
    execSync('node ../ff_grouptime.js -i samples -g "\\d_test_video" -d 15 -o short_grouptime.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Directory with grep filtering test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('short_grouptime.mp4');
    const outputFormat = getFormatInfo('short_grouptime.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output format: ${outputFormat}`);
    
    // Verify duration is close to target
    if (outputDuration) {
        const durationDiff = Math.abs(outputDuration - 15);
        if (durationDiff < 0.5) {
            console.log('✅ Output duration is correct (15 seconds)');
        } else {
            console.log(`❌ Output duration is incorrect: ${outputDuration}s (expected 15s)`);
        }
    }
    
    // Verify format is correct
    if (outputFormat && outputFormat.includes('mp4')) {
        console.log('✅ Output format is correct (MP4)');
    } else {
        console.log(`❌ Output format is incorrect: ${outputFormat}`);
    }
    
} catch (error) {
    console.log('❌ Directory with grep filtering test failed:', error.message);
}

// Test 5: Help command
console.log('\n5️⃣ Testing help command...');
try {
    execSync('node ../ff_grouptime.js --help', { 
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

// Test 6: Error handling - missing files
console.log('\n6️⃣ Testing error handling (missing files)...');
try {
    execSync('node ../ff_grouptime.js -i samples/nonexistent.mp4 -d 30 -o test_error.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught missing file');
}

// Test 7: Verify input files are valid videos
console.log('\n7️⃣ Testing input file validation...');
try {
    const video1Duration = getVideoDuration('samples/1_test_video.mp4');
    const video2Duration = getVideoDuration('samples/2_test_video.mp4');
    const video3Duration = getVideoDuration('samples/3_test_video.mp4');
    const video4Duration = getVideoDuration('samples/4_test_video.mp4');
    
    if (video1Duration && video2Duration && video3Duration && video4Duration) {
        console.log(`✅ Video file validation passed - All files are valid videos`);
        console.log(`   File 1: ${video1Duration}s`);
        console.log(`   File 2: ${video2Duration}s`);
        console.log(`   File 3: ${video3Duration}s`);
        console.log(`   File 4: ${video4Duration}s`);
    } else {
        console.log('❌ Video file validation failed - not all files are valid videos');
    }
} catch (error) {
    console.log('❌ Input file validation failed:', error.message);
}

// Clean up test files
cleanupTestFiles();

console.log('\n🎉 All tests completed!');
