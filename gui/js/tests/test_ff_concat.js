#!/usr/bin/env node
/**
 * Test runner for ff_concat.js script
 * Tests the ff_concat.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const { comprehensiveCleanup } = require('./test_cleanup');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_concat.js Script\n');

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

// Test 1: Basic command line arguments - two files
console.log('1️⃣ Testing basic command line arguments (two files)...');
try {
    // Get properties of input files
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const inputSize = getFileSize('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    console.log(`   Input file size: ${inputSize} bytes`);
    
    execSync('node ../ff_concat.js -o test_concat_output.mp4 -i samples/sample_video.mp4 -i samples/sample_video.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Basic concat CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_concat_output.mp4');
    const outputDuration = getVideoDuration('test_concat_output.mp4');
    const outputSize = getFileSize('test_concat_output.mp4');
    
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
    
    // Verify duration is doubled (two identical files)
    if (inputDuration && outputDuration) {
        const expectedDuration = inputDuration * 2;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration verification passed - output is approximately 2x input duration');
        } else {
            console.log(`❌ Video duration verification failed - expected ~${expectedDuration}s, got ${outputDuration}s`);
        }
    }
    
    // Clean up
    if (fs.existsSync('test_concat_output.mp4')) {
        fs.unlinkSync('test_concat_output.mp4');
    }
} catch (error) {
    console.log('❌ Basic concat CLI test failed:', error.message);
}

// Test 2: Command line arguments - three files
console.log('\n2️⃣ Testing command line arguments (three files)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_concat.js -o test_concat_three.mp4 -i samples/sample_video.mp4 -i samples/sample_video.mp4 -i samples/sample_video.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Three file concat CLI test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('test_concat_three.mp4');
    const outputDuration = getVideoDuration('test_concat_three.mp4');
    
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
    
    // Verify duration is tripled (three identical files)
    if (inputDuration && outputDuration) {
        const expectedDuration = inputDuration * 3;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration verification passed - output is approximately 3x input duration');
        } else {
            console.log(`❌ Video duration verification failed - expected ~${expectedDuration}s, got ${outputDuration}s`);
        }
    }
    
    // Clean up
    if (fs.existsSync('test_concat_three.mp4')) {
        fs.unlinkSync('test_concat_three.mp4');
    }
} catch (error) {
    console.log('❌ Three file concat CLI test failed:', error.message);
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
    
    execSync('node ../ff_concat.js -o cli_folder_concat.mp4 -i samples', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ CLI with directory test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('cli_folder_concat.mp4');
    const outputDuration = getVideoDuration('cli_folder_concat.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video properties are maintained
    if (outputProps && outputProps.width === 1280 && outputProps.height === 720) {
        console.log('✅ Video dimensions maintained (1280x720)');
    } else {
        console.log(`❌ Video dimensions changed: ${outputProps.width}x${outputProps.height}`);
    }
    
    // Clean up
    if (fs.existsSync('cli_folder_concat.mp4')) {
        fs.unlinkSync('cli_folder_concat.mp4');
    }
} catch (error) {
    console.log('❌ CLI with directory test failed:', error.message);
}

// Test 4: JSON config file - two files
console.log('\n4️⃣ Testing JSON config file (two files)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_concat.js -C json/test_ff_concat.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config two files test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('concat_test.mp4');
    const outputDuration = getVideoDuration('concat_test.mp4');
    
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
    
    // Verify duration is doubled (two identical files)
    if (inputDuration && outputDuration) {
        const expectedDuration = inputDuration * 2;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration verification passed - output is approximately 2x input duration');
        } else {
            console.log(`❌ Video duration verification failed - expected ~${expectedDuration}s, got ${outputDuration}s`);
        }
    }
    
    // Clean up
    if (fs.existsSync('concat_test.mp4')) {
        fs.unlinkSync('concat_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config two files test failed:', error.message);
}

// Test 5: JSON config file - three files
console.log('\n5️⃣ Testing JSON config file (three files)...');
try {
    // Get properties of input file
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input duration: ${inputDuration} seconds`);
    
    execSync('node ../ff_concat.js -C json/test_ff_concat_three.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config three files test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('concat_three_test.mp4');
    const outputDuration = getVideoDuration('concat_three_test.mp4');
    
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
    
    // Verify duration is tripled (three identical files)
    if (inputDuration && outputDuration) {
        const expectedDuration = inputDuration * 3;
        const durationDiff = Math.abs(outputDuration - expectedDuration);
        if (durationDiff < 0.1) {
            console.log('✅ Video duration verification passed - output is approximately 3x input duration');
        } else {
            console.log(`❌ Video duration verification failed - expected ~${expectedDuration}s, got ${outputDuration}s`);
        }
    }
    
    // Clean up
    if (fs.existsSync('concat_three_test.mp4')) {
        fs.unlinkSync('concat_three_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config three files test failed:', error.message);
}

// Test 6: JSON config file - directory with grep
console.log('\n6️⃣ Testing JSON config file (directory with grep)...');
try {
    // Count files that should match the pattern
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && file.includes('test_video');
        });
    
    console.log(`   Found ${files.length} files matching 'test_video' pattern`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_concat.js -C json/test_ff_concat_folder.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config directory with grep test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('concat_folder_test.mp4');
    const outputDuration = getVideoDuration('concat_folder_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video properties are maintained
    if (outputProps && outputProps.width === 1280 && outputProps.height === 720) {
        console.log('✅ Video dimensions maintained (1280x720)');
    } else {
        console.log(`❌ Video dimensions changed: ${outputProps.width}x${outputProps.height}`);
    }
    
    // Clean up
    if (fs.existsSync('concat_folder_test.mp4')) {
        fs.unlinkSync('concat_folder_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config directory with grep test failed:', error.message);
}

// Test 7: JSON config file - directory with regex
console.log('\n7️⃣ Testing JSON config file (directory with regex)...');
try {
    // Count files that should match the regex pattern \d_.*\.mp4
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && /^\d_.*\.mp4$/.test(file);
        });
    
    console.log(`   Found ${files.length} files matching regex pattern '\\d_.*\\.mp4'`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_concat.js -C json/test_ff_concat_regex.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config directory with regex test passed');
    
    // Verify output file properties
    const outputProps = getVideoProperties('concat_regex_test.mp4');
    const outputDuration = getVideoDuration('concat_regex_test.mp4');
    
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output duration: ${outputDuration} seconds`);
    
    // Verify video properties are maintained
    if (outputProps && outputProps.width === 1280 && outputProps.height === 720) {
        console.log('✅ Video dimensions maintained (1280x720)');
    } else {
        console.log(`❌ Video dimensions changed: ${outputProps.width}x${outputProps.height}`);
    }
    
    // Clean up
    if (fs.existsSync('concat_regex_test.mp4')) {
        fs.unlinkSync('concat_regex_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config directory with regex test failed:', error.message);
}

// Test 8: Help command
console.log('\n8️⃣ Testing help command...');
try {
    execSync('node ../ff_concat.js --help', { 
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

// Test 9: Error handling - missing files
console.log('\n9️⃣ Testing error handling (missing files)...');
try {
    execSync('node ../ff_concat.js -o test.mp4 -i samples/nonexistent.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught missing file');
}

// Test 10: Error handling - no input files
console.log('\n🔟 Testing error handling (no input files)...');
try {
    execSync('node ../ff_concat.js -o test.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught no input files');
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
