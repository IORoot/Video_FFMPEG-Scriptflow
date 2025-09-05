#!/usr/bin/env node
/**
 * Test runner for ff_append.js script
 * Tests the ff_append.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_append.js Script\n');

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

// Test 1: Basic command line arguments
console.log('1️⃣ Testing basic command line arguments...');
try {
    // Get duration of input file
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_append.js -f samples/sample_video.mp4 -s samples/sample_video.mp4 -o test_cli_output.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ CLI test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('test_cli_output.mp4');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const outputProps = getVideoProperties('test_cli_output.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is approximately doubled (allowing for small differences)
    if (outputDuration && inputDuration) {
        const expectedDuration = inputDuration * 2;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) { // Allow 0.1 second tolerance
            console.log('✅ Duration verification passed - output is approximately 2x input duration');
        } else {
            console.log(`❌ Duration verification failed - expected ~${expectedDuration}s, got ${outputDuration}s`);
        }
    }
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Clean up
    if (fs.existsSync('test_cli_output.mp4')) {
        fs.unlinkSync('test_cli_output.mp4');
    }
} catch (error) {
    console.log('❌ CLI test failed:', error.message);
}

// Test 2: JSON config file
console.log('\n2️⃣ Testing JSON config file...');
try {
    // Get duration of input file
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_append.js -C json/test_ff_append.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('js_append_output.mp4');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const outputProps = getVideoProperties('js_append_output.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is approximately doubled
    if (outputDuration && inputDuration) {
        const expectedDuration = inputDuration * 2;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Duration verification passed - output is approximately 2x input duration');
        } else {
            console.log(`❌ Duration verification failed - expected ~${expectedDuration}s, got ${outputDuration}s`);
        }
    }
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Clean up
    if (fs.existsSync('js_append_output.mp4')) {
        fs.unlinkSync('js_append_output.mp4');
    }
} catch (error) {
    console.log('❌ JSON config test failed:', error.message);
}

// Test 2b: Comprehensive JSON config file
console.log('\n2️⃣b Testing comprehensive JSON config file...');
try {
    // Get duration of input file
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_append.js -C json/test_ff_append_comprehensive.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Comprehensive JSON config test passed');
    
    // Verify output file properties (should be the same as basic test)
    const outputDuration = getVideoDuration('comprehensive_append_output.mp4');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const outputProps = getVideoProperties('comprehensive_append_output.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is approximately doubled
    if (outputDuration && inputDuration) {
        const expectedDuration = inputDuration * 2;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Duration verification passed - output is approximately 2x input duration');
        } else {
            console.log(`❌ Duration verification failed - expected ~${expectedDuration}s, got ${outputDuration}s`);
        }
    }
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Clean up
    if (fs.existsSync('comprehensive_append_output.mp4')) {
        fs.unlinkSync('comprehensive_append_output.mp4');
    }
} catch (error) {
    console.log('❌ Comprehensive JSON config test failed:', error.message);
}

// Test 2c: Loglevel JSON config file
console.log('\n2️⃣c Testing loglevel JSON config file...');
try {
    // Get duration of input file
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_append.js -C json/test_ff_append_loglevel.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Loglevel JSON config test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('loglevel_test_output.mp4');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const outputProps = getVideoProperties('loglevel_test_output.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is approximately doubled
    if (outputDuration && inputDuration) {
        const expectedDuration = inputDuration * 2;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Duration verification passed - output is approximately 2x input duration');
        } else {
            console.log(`❌ Duration verification failed - expected ~${expectedDuration}s, got ${outputDuration}s`);
        }
    }
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Clean up
    if (fs.existsSync('loglevel_test_output.mp4')) {
        fs.unlinkSync('loglevel_test_output.mp4');
    }
} catch (error) {
    console.log('❌ Loglevel JSON config test failed:', error.message);
}

// Test 2d: Custom output JSON config file
console.log('\n2️⃣d Testing custom output JSON config file...');
try {
    // Get duration of input file
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_append.js -C json/test_ff_append_custom_output.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Custom output JSON config test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('custom_named_output.mp4');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const outputProps = getVideoProperties('custom_named_output.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify duration is approximately doubled
    if (outputDuration && inputDuration) {
        const expectedDuration = inputDuration * 2;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Duration verification passed - output is approximately 2x input duration');
        } else {
            console.log(`❌ Duration verification failed - expected ~${expectedDuration}s, got ${outputDuration}s`);
        }
    }
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Clean up
    if (fs.existsSync('custom_named_output.mp4')) {
        fs.unlinkSync('custom_named_output.mp4');
    }
} catch (error) {
    console.log('❌ Custom output JSON config test failed:', error.message);
}

// Test 3: Help command
console.log('\n3️⃣ Testing help command...');
try {
    execSync('node ../ff_append.js --help', { 
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

// Test 4: Error handling - missing files
console.log('\n4️⃣ Testing error handling (missing files)...');
try {
    execSync('node ../ff_append.js -f samples/nonexistent.mp4 -s samples/sample_video.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught missing file');
}

// Test 5: Verify input file is valid video
console.log('\n5️⃣ Testing input file validation...');
try {
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    if (inputProps && inputProps.width && inputProps.height && inputProps.codec) {
        console.log(`✅ Input file validation passed - ${inputProps.width}x${inputProps.height} ${inputProps.codec}`);
    } else {
        console.log('❌ Input file validation failed - not a valid video file');
    }
} catch (error) {
    console.log('❌ Input file validation failed:', error.message);
}

console.log('\n🎉 All tests completed!');
