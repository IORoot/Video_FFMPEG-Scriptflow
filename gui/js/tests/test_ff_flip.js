#!/usr/bin/env node
/**
 * Test runner for ff_flip.js script
 * Tests the ff_flip.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const { comprehensiveCleanup } = require('./test_cleanup');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_flip.js Script\n');

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
        'other_file.mp4',
        'test_horizontal.mp4',
        'test_vertical.mp4',
        'test_both.mp4',
        'flip_test.mp4',
        'horizontal_test.mp4',
        'vertical_test.mp4',
        'both_test.mp4',
        '0_flip_test.mp4',
        '1_flip_test.mp4',
        '2_flip_test.mp4'
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

// Test 1: Basic command line arguments - horizontal flip
console.log('1️⃣ Testing basic command line arguments (horizontal flip)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const inputSize = getFileSize('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_flip.js -i samples/sample_video.mp4 -h -o test_horizontal.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Horizontal flip CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_horizontal.mp4');
    const outputDuration = getVideoDuration('test_horizontal.mp4');
    const outputSize = getFileSize('test_horizontal.mp4');
    const outputFormat = getFormatInfo('test_horizontal.mp4');
    
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
    
} catch (error) {
    console.log('❌ Horizontal flip CLI test failed:', error.message);
}

// Test 2: Command line arguments - vertical flip
console.log('\n2️⃣ Testing command line arguments (vertical flip)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_flip.js -i samples/sample_video.mp4 -v -o test_vertical.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Vertical flip CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_vertical.mp4');
    const outputDuration = getVideoDuration('test_vertical.mp4');
    const outputFormat = getFormatInfo('test_vertical.mp4');
    
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
    
} catch (error) {
    console.log('❌ Vertical flip CLI test failed:', error.message);
}

// Test 3: Command line arguments - both horizontal and vertical flip
console.log('\n3️⃣ Testing command line arguments (both flips)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_flip.js -i samples/sample_video.mp4 -h -v -o test_both.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Both flips CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_both.mp4');
    const outputDuration = getVideoDuration('test_both.mp4');
    const outputFormat = getFormatInfo('test_both.mp4');
    
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
    
} catch (error) {
    console.log('❌ Both flips CLI test failed:', error.message);
}

// Test 4: JSON config file - horizontal flip
console.log('\n4️⃣ Testing JSON config file (horizontal flip)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_flip.js -C json/test_ff_flip.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config horizontal flip test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('flip_test.mp4');
    const outputDuration = getVideoDuration('flip_test.mp4');
    const outputFormat = getFormatInfo('flip_test.mp4');
    
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
    
} catch (error) {
    console.log('❌ JSON config horizontal flip test failed:', error.message);
}

// Test 5: JSON config file - vertical flip
console.log('\n5️⃣ Testing JSON config file (vertical flip)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_flip.js -C json/test_ff_flip_vertical.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config vertical flip test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('vertical_test.mp4');
    const outputDuration = getVideoDuration('vertical_test.mp4');
    const outputFormat = getFormatInfo('vertical_test.mp4');
    
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
    
} catch (error) {
    console.log('❌ JSON config vertical flip test failed:', error.message);
}

// Test 6: Directory processing with regex
console.log('\n6️⃣ Testing directory processing with regex...');
try {
    // Check what files exist in samples directory
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && /^\d_.*\.mp4$/.test(file);
        });
    
    console.log(`   Found ${files.length} files matching regex pattern '\\d_.*\\.mp4'`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_flip.js -C json/test_ff_flip_regex.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config directory with regex test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_flip_test.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        const outputFormat = getFormatInfo(outputFile);
        
        if (outputProps && outputProps.width && outputProps.height) {
            console.log(`   ✅ ${outputFile} has valid dimensions (${outputProps.width}x${outputProps.height})`);
        } else {
            console.log(`   ❌ ${outputFile} has invalid dimensions`);
        }
        
        if (outputFormat && outputFormat.includes('mp4')) {
            console.log(`   ✅ ${outputFile} has correct format (MP4)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect format: ${outputFormat}`);
        }
    }
    
} catch (error) {
    console.log('❌ JSON config directory with regex test failed:', error.message);
}

// Test 7: Help command
console.log('\n7️⃣ Testing help command...');
try {
    execSync('node ../ff_flip.js --help', { 
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

// Test 8: Error handling - missing files
console.log('\n8️⃣ Testing error handling (missing files)...');
try {
    execSync('node ../ff_flip.js -i samples/nonexistent.mp4 -h -o test_error.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught missing file');
}

// Test 9: Verify input file is valid video
console.log('\n9️⃣ Testing input file validation...');
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
