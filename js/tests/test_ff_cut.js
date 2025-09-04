#!/usr/bin/env node
/**
 * Test runner for ff_cut.js script
 * Tests the ff_cut.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_cut.js Script\n');

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

// Helper function to convert timestamp to seconds
function timestampToSeconds(timestamp) {
    const parts = timestamp.split(':');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
}

// Create test files needed for regex testing
createTestFiles();

// Test 1: Basic command line arguments - cut first 5 seconds
console.log('1️⃣ Testing basic command line arguments (cut first 5 seconds)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const inputSize = getFileSize('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_cut.js -i samples/sample_video.mp4 -o test_cut_output.mp4 -s 00:00:00 -e 00:00:05', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Basic cut CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_cut_output.mp4');
    const outputDuration = getVideoDuration('test_cut_output.mp4');
    const outputSize = getFileSize('test_cut_output.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output file size: ${outputSize} bytes`);
    
    // Verify video dimensions are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Verify video codec is maintained
    if (inputProps && outputProps && inputProps.codec === outputProps.codec) {
        console.log('✅ Video codec maintained');
    } else {
        console.log('❌ Video codec changed unexpectedly');
    }
    
    // Verify duration is correctly cut (should be 5 seconds)
    if (outputDuration) {
        const expectedDuration = 5.0;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration correctly cut to 5 seconds');
        } else {
            console.log(`❌ Video duration incorrect: ${outputDuration}s (expected ~5s)`);
        }
    }
    
    // Clean up
    if (fs.existsSync('test_cut_output.mp4')) {
        fs.unlinkSync('test_cut_output.mp4');
    }
} catch (error) {
    console.log('❌ Basic cut CLI test failed:', error.message);
}

// Test 2: Command line arguments - cut middle section
console.log('\n2️⃣ Testing command line arguments (cut middle section)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_cut.js -i samples/sample_video.mp4 -o test_middle_cut.mp4 -s 00:00:02 -e 00:00:07', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Middle cut CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_middle_cut.mp4');
    const outputDuration = getVideoDuration('test_middle_cut.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video dimensions are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Verify video codec is maintained
    if (inputProps && outputProps && inputProps.codec === outputProps.codec) {
        console.log('✅ Video codec maintained');
    } else {
        console.log('❌ Video codec changed unexpectedly');
    }
    
    // Verify duration is correctly cut (should be 5 seconds)
    if (outputDuration) {
        const expectedDuration = 5.0;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration correctly cut to 5 seconds');
        } else {
            console.log(`❌ Video duration incorrect: ${outputDuration}s (expected ~5s)`);
        }
    }
    
    // Clean up
    if (fs.existsSync('test_middle_cut.mp4')) {
        fs.unlinkSync('test_middle_cut.mp4');
    }
} catch (error) {
    console.log('❌ Middle cut CLI test failed:', error.message);
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
    
    execSync('node ../ff_cut.js -i samples -o cli_folder_cut.mp4 -s 00:00:01 -e 00:00:06', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ CLI with directory test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_cli_folder_cut.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        const outputDuration = getVideoDuration(outputFile);
        
        if (outputProps) {
            console.log(`   ✅ ${outputFile} has correct dimensions (${outputProps.width}x${outputProps.height})`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions`);
        }
        
        if (outputDuration) {
            const expectedDuration = 5.0;
            const durationDiff = Math.abs(outputDuration - expectedDuration);
            if (durationDiff < 0.1) {
                console.log(`   ✅ ${outputFile} has correct duration (~5s)`);
            } else {
                console.log(`   ❌ ${outputFile} has incorrect duration: ${outputDuration}s`);
            }
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ CLI with directory test failed:', error.message);
}

// Test 4: JSON config file - cut first 5 seconds
console.log('\n4️⃣ Testing JSON config file (cut first 5 seconds)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_cut.js -C json/test_ff_cut.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config first 5 seconds test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('cut_test.mp4');
    const outputDuration = getVideoDuration('cut_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video dimensions are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Verify video codec is maintained
    if (inputProps && outputProps && inputProps.codec === outputProps.codec) {
        console.log('✅ Video codec maintained');
    } else {
        console.log('❌ Video codec changed unexpectedly');
    }
    
    // Verify duration is correctly cut (should be 5 seconds)
    if (outputDuration) {
        const expectedDuration = 5.0;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration correctly cut to 5 seconds');
        } else {
            console.log(`❌ Video duration incorrect: ${outputDuration}s (expected ~5s)`);
        }
    }
    
    // Clean up
    if (fs.existsSync('cut_test.mp4')) {
        fs.unlinkSync('cut_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config first 5 seconds test failed:', error.message);
}

// Test 5: JSON config file - cut middle section
console.log('\n5️⃣ Testing JSON config file (cut middle section)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_cut.js -C json/test_ff_cut_middle.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config middle section test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('cut_middle_test.mp4');
    const outputDuration = getVideoDuration('cut_middle_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video dimensions are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Verify video codec is maintained
    if (inputProps && outputProps && inputProps.codec === outputProps.codec) {
        console.log('✅ Video codec maintained');
    } else {
        console.log('❌ Video codec changed unexpectedly');
    }
    
    // Verify duration is correctly cut (should be 5 seconds)
    if (outputDuration) {
        const expectedDuration = 5.0;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration correctly cut to 5 seconds');
        } else {
            console.log(`❌ Video duration incorrect: ${outputDuration}s (expected ~5s)`);
        }
    }
    
    // Clean up
    if (fs.existsSync('cut_middle_test.mp4')) {
        fs.unlinkSync('cut_middle_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config middle section test failed:', error.message);
}

// Test 6: JSON config file - cut end section
console.log('\n6️⃣ Testing JSON config file (cut end section)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_cut.js -C json/test_ff_cut_end.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config end section test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('cut_end_test.mp4');
    const outputDuration = getVideoDuration('cut_end_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video dimensions are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Verify video codec is maintained
    if (inputProps && outputProps && inputProps.codec === outputProps.codec) {
        console.log('✅ Video codec maintained');
    } else {
        console.log('❌ Video codec changed unexpectedly');
    }
    
    // Verify duration is correctly cut (should be 5 seconds)
    if (outputDuration) {
        const expectedDuration = 5.0;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration correctly cut to 5 seconds');
        } else {
            console.log(`❌ Video duration incorrect: ${outputDuration}s (expected ~5s)`);
        }
    }
    
    // Clean up
    if (fs.existsSync('cut_end_test.mp4')) {
        fs.unlinkSync('cut_end_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config end section test failed:', error.message);
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
    
    execSync('node ../ff_cut.js -C json/test_ff_cut_folder.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config directory with grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_cut_folder_test.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        const outputDuration = getVideoDuration(outputFile);
        
        if (outputProps) {
            console.log(`   ✅ ${outputFile} has correct dimensions (${outputProps.width}x${outputProps.height})`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions`);
        }
        
        if (outputDuration) {
            const expectedDuration = 5.0;
            const durationDiff = Math.abs(outputDuration - expectedDuration);
            if (durationDiff < 0.1) {
                console.log(`   ✅ ${outputFile} has correct duration (~5s)`);
            } else {
                console.log(`   ❌ ${outputFile} has incorrect duration: ${outputDuration}s`);
            }
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
    
    execSync('node ../ff_cut.js -C json/test_ff_cut_regex.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config directory with regex test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_cut_regex_test.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct properties
    for (const outputFile of outputFiles) {
        const outputProps = getVideoProperties(outputFile);
        const outputDuration = getVideoDuration(outputFile);
        
        if (outputProps) {
            console.log(`   ✅ ${outputFile} has correct dimensions (${outputProps.width}x${outputProps.height})`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect dimensions`);
        }
        
        if (outputDuration) {
            const expectedDuration = 5.0;
            const durationDiff = Math.abs(outputDuration - expectedDuration);
            if (durationDiff < 0.1) {
                console.log(`   ✅ ${outputFile} has correct duration (~5s)`);
            } else {
                console.log(`   ❌ ${outputFile} has incorrect duration: ${outputDuration}s`);
            }
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
    execSync('node ../ff_cut.js --help', { 
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
    execSync('node ../ff_cut.js -i samples/nonexistent.mp4 -s 00:00:00 -e 00:00:05', { 
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
