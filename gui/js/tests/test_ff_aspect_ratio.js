#!/usr/bin/env node
/**
 * Test runner for ff_aspect_ratio.js script
 * Tests the ff_aspect_ratio.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const { comprehensiveCleanup } = require('./test_cleanup');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_aspect_ratio.js Script\n');

// Create test files needed for regex testing
createTestFiles();

// Helper function to get video aspect ratio using ffprobe
function getVideoAspectRatio(filePath) {
    try {
        const output = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries stream=display_aspect_ratio -of csv=p=0 "${filePath}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return output.trim();
    } catch (error) {
        console.log(`❌ Failed to get aspect ratio for ${filePath}:`, error.message);
        return null;
    }
}

// Helper function to normalize aspect ratio for comparison
function normalizeAspectRatio(aspectRatio) {
    if (!aspectRatio) return null;
    
    // Handle common equivalent ratios
    const equivalents = {
        '21:9': '7:3',
        '7:3': '21:9'
    };
    
    return equivalents[aspectRatio] || aspectRatio;
}

// Helper function to compare aspect ratios (handles equivalent ratios)
function compareAspectRatios(expected, actual) {
    if (!expected || !actual) return false;
    
    // Direct comparison
    if (expected === actual) return true;
    
    // Check for equivalent ratios
    const normalizedExpected = normalizeAspectRatio(expected);
    const normalizedActual = normalizeAspectRatio(actual);
    
    return normalizedExpected === actual || expected === normalizedActual;
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

// Test 1: Basic command line arguments
console.log('1️⃣ Testing basic command line arguments...');
try {
    // Get aspect ratio of input file
    const inputAspectRatio = getVideoAspectRatio('samples/sample_video.mp4');
    console.log(`   Input aspect ratio: ${inputAspectRatio}`);
    
    execSync('node ../ff_aspect_ratio.js -i samples/sample_video.mp4 -a 16:9 -o test_cli_aspect_output.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ CLI test passed');
    
    // Verify output file properties
    const outputAspectRatio = getVideoAspectRatio('test_cli_aspect_output.mp4');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const outputProps = getVideoProperties('test_cli_aspect_output.mp4');
    
    console.log(`   Output aspect ratio: ${outputAspectRatio}`);
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify aspect ratio has changed
    if (outputAspectRatio && inputAspectRatio) {
        if (compareAspectRatios('16:9', outputAspectRatio)) {
            console.log('✅ Aspect ratio verification passed - output is 16:9');
        } else {
            console.log(`❌ Aspect ratio verification failed - expected 16:9, got ${outputAspectRatio}`);
        }
    }
    
    // Verify video properties are maintained (dimensions should be the same)
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained (as expected for metadata-only change)');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Clean up
    if (fs.existsSync('test_cli_aspect_output.mp4')) {
        fs.unlinkSync('test_cli_aspect_output.mp4');
    }
} catch (error) {
    console.log('❌ CLI test failed:', error.message);
}

// Test 1b: CLI with grep filtering
console.log('\n1️⃣b Testing CLI with grep filtering...');
try {
    // Count files that should match the grep pattern
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && file.includes('test_video');
        });
    
    console.log(`   Found ${files.length} files matching 'test_video' pattern`);
    
    execSync('node ../ff_aspect_ratio.js -i samples -a 4:3 -o cli_grep_output.mp4 -g test_video', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ CLI with grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_cli_grep_output.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct aspect ratio
    for (const outputFile of outputFiles) {
        const outputAspectRatio = getVideoAspectRatio(outputFile);
        if (compareAspectRatios('4:3', outputAspectRatio)) {
            console.log(`   ✅ ${outputFile} has correct aspect ratio (4:3)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect aspect ratio: ${outputAspectRatio}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ CLI with grep test failed:', error.message);
}

// Test 2: JSON config file
console.log('\n2️⃣ Testing JSON config file...');
try {
    // Get aspect ratio of input file
    const inputAspectRatio = getVideoAspectRatio('samples/sample_video.mp4');
    console.log(`   Input aspect ratio: ${inputAspectRatio}`);
    
    execSync('node ../ff_aspect_ratio.js -C json/test_ff_aspect_ratio.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config test passed');
    
    // Verify output file properties
    const outputAspectRatio = getVideoAspectRatio('aspect_ratio_test_output.mp4');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const outputProps = getVideoProperties('aspect_ratio_test_output.mp4');
    
    console.log(`   Output aspect ratio: ${outputAspectRatio}`);
    console.log(`   Input properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    
    // Verify aspect ratio has changed
    if (outputAspectRatio && inputAspectRatio) {
        if (compareAspectRatios('16:9', outputAspectRatio)) {
            console.log('✅ Aspect ratio verification passed - output is 16:9');
        } else {
            console.log(`❌ Aspect ratio verification failed - expected 16:9, got ${outputAspectRatio}`);
        }
    }
    
    // Verify video properties are maintained
    if (inputProps && outputProps) {
        if (inputProps.width === outputProps.width && inputProps.height === outputProps.height) {
            console.log('✅ Video dimensions maintained (as expected for metadata-only change)');
        } else {
            console.log('❌ Video dimensions changed unexpectedly');
        }
    }
    
    // Clean up
    if (fs.existsSync('aspect_ratio_test_output.mp4')) {
        fs.unlinkSync('aspect_ratio_test_output.mp4');
    }
} catch (error) {
    console.log('❌ JSON config test failed:', error.message);
}

// Test 2b: JSON config file with grep filtering
console.log('\n2️⃣b Testing JSON config file with grep filtering...');
try {
    // Count files that should match the grep pattern
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && file.includes('test_video');
        });
    
    console.log(`   Found ${files.length} files matching 'test_video' pattern`);
    
    execSync('node ../ff_aspect_ratio.js -C json/test_ff_aspect_ratio_grep.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config with grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_grep_test_output.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct aspect ratio
    for (const outputFile of outputFiles) {
        const outputAspectRatio = getVideoAspectRatio(outputFile);
        if (compareAspectRatios('4:3', outputAspectRatio)) {
            console.log(`   ✅ ${outputFile} has correct aspect ratio (4:3)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect aspect ratio: ${outputAspectRatio}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ JSON config with grep test failed:', error.message);
}

// Test 2c: JSON config file with regex grep filtering
console.log('\n2️⃣c Testing JSON config file with regex grep filtering...');
try {
    // Count files that should match the regex pattern \d_.*\.mp4
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && /^\d_.*\.mp4$/.test(file);
        });
    
    console.log(`   Found ${files.length} files matching regex pattern '\\d_.*\\.mp4'`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_aspect_ratio.js -C json/test_ff_aspect_ratio_regex.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config with regex grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_regex_test_output.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct aspect ratio
    for (const outputFile of outputFiles) {
        const outputAspectRatio = getVideoAspectRatio(outputFile);
        if (compareAspectRatios('16:9', outputAspectRatio)) {
            console.log(`   ✅ ${outputFile} has correct aspect ratio (16:9)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect aspect ratio: ${outputAspectRatio}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ JSON config with regex grep test failed:', error.message);
}

// Test 2d: CLI with regex grep filtering
console.log('\n2️⃣d Testing CLI with regex grep filtering...');
try {
    // Count files that should match the regex pattern \d_.*\.mp4
    const files = fs.readdirSync('samples')
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.mp4' || ext === '.mov') && /^\d_.*\.mp4$/.test(file);
        });
    
    console.log(`   Found ${files.length} files matching regex pattern '\\d_.*\\.mp4'`);
    console.log(`   Matching files: ${files.join(', ')}`);
    
    execSync('node ../ff_aspect_ratio.js -i samples -a 16:9 -o cli_regex_output.mp4 -g "\\d_.*\\.mp4"', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ CLI with regex grep test passed');
    
    // Check for output files (should be numbered based on processing order)
    const outputFiles = [];
    for (let i = 0; i < files.length; i++) {
        const outputFile = `${i}_cli_regex_output.mp4`;
        if (fs.existsSync(outputFile)) {
            outputFiles.push(outputFile);
        }
    }
    
    console.log(`   Created ${outputFiles.length} output files`);
    
    // Verify each output file has the correct aspect ratio
    for (const outputFile of outputFiles) {
        const outputAspectRatio = getVideoAspectRatio(outputFile);
        if (compareAspectRatios('16:9', outputAspectRatio)) {
            console.log(`   ✅ ${outputFile} has correct aspect ratio (16:9)`);
        } else {
            console.log(`   ❌ ${outputFile} has incorrect aspect ratio: ${outputAspectRatio}`);
        }
        
        // Clean up
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
    }
    
} catch (error) {
    console.log('❌ CLI with regex grep test failed:', error.message);
}

// Test 4: Different aspect ratios
console.log('\n4️⃣ Testing different aspect ratios...');
const aspectRatios = ['4:3', '1:1', '21:9'];
for (const aspectRatio of aspectRatios) {
    try {
        console.log(`   Testing aspect ratio: ${aspectRatio}`);
        
        execSync(`node ../ff_aspect_ratio.js -i samples/sample_video.mp4 -a ${aspectRatio} -o test_${aspectRatio.replace(':', 'x')}_output.mp4`, { 
            cwd: __dirname,
            stdio: 'pipe'
        });
        
        const outputAspectRatio = getVideoAspectRatio(`test_${aspectRatio.replace(':', 'x')}_output.mp4`);
        if (compareAspectRatios(aspectRatio, outputAspectRatio)) {
            console.log(`   ✅ ${aspectRatio} test passed`);
        } else {
            console.log(`   ❌ ${aspectRatio} test failed - expected ${aspectRatio}, got ${outputAspectRatio}`);
        }
        
        // Clean up
        if (fs.existsSync(`test_${aspectRatio.replace(':', 'x')}_output.mp4`)) {
            fs.unlinkSync(`test_${aspectRatio.replace(':', 'x')}_output.mp4`);
        }
    } catch (error) {
        console.log(`   ❌ ${aspectRatio} test failed:`, error.message);
    }
}

// Test 5: Help command
console.log('\n5️⃣ Testing help command...');
try {
    execSync('node ../ff_aspect_ratio.js --help', { 
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
    execSync('node ../ff_aspect_ratio.js -i samples/nonexistent.mp4 -a 16:9', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught missing file');
}

// Test 7: Verify input file is valid video
console.log('\n7️⃣ Testing input file validation...');
try {
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputAspectRatio = getVideoAspectRatio('samples/sample_video.mp4');
    if (inputProps && inputProps.width && inputProps.height && inputProps.codec) {
        console.log(`✅ Input file validation passed - ${inputProps.width}x${inputProps.height} ${inputProps.codec} (DAR: ${inputAspectRatio})`);
    } else {
        console.log('❌ Input file validation failed - not a valid video file');
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
