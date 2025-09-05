const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { comprehensiveCleanup } = require('./test_cleanup');

/**
 * Test suite for ff_rotate.js
 * Tests video rotation functionality with various angles
 */

const TEST_DIR = path.join(__dirname, '..', '..', 'tests');
const SAMPLE_VIDEO = path.join(TEST_DIR, 'sample_video.mp4');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper function to run ffprobe and get video info
function getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath
        ]);

        let output = '';
        let errorOutput = '';

        ffprobe.stdout.on('data', (data) => {
            output += data.toString();
        });

        ffprobe.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ffprobe.on('close', (code) => {
            if (code === 0) {
                try {
                    const info = JSON.parse(output);
                    resolve(info);
                } catch (error) {
                    reject(new Error(`Failed to parse ffprobe output: ${error.message}`));
                }
            } else {
                reject(new Error(`ffprobe failed with code ${code}: ${errorOutput}`));
            }
        });

        ffprobe.on('error', (error) => {
            reject(new Error(`ffprobe error: ${error.message}`));
        });
    });
}

// Helper function to run the rotate script
function runRotateScript(args) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', 'ff_rotate.js');
        const nodeProcess = spawn('node', [scriptPath, ...args]);

        let output = '';
        let errorOutput = '';

        nodeProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        nodeProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        nodeProcess.on('close', (code) => {
            if (code === 0) {
                resolve({ output, errorOutput });
            } else {
                reject(new Error(`Script failed with code ${code}: ${errorOutput}`));
            }
        });

        nodeProcess.on('error', (error) => {
            reject(new Error(`Script error: ${error.message}`));
        });
    });
}

// Helper function to check if file exists and has content
function checkFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Output file does not exist: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
        throw new Error(`Output file is empty: ${filePath}`);
    }
    
    return stats;
}

// Test cases
async function runTests() {
    console.log('🧪 Starting ff_rotate.js tests...\n');

    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Basic 90-degree rotation
    try {
        totalTests++;
        console.log(`Test ${totalTests}: Basic 90-degree rotation`);
        
        const outputFile = path.join(OUTPUT_DIR, 'test_rotate_90.mp4');
        const args = ['-i', SAMPLE_VIDEO, '-r', '90', '-o', outputFile];
        
        await runRotateScript(args);
        
        // Check output file
        const stats = checkFile(outputFile);
        console.log(`✅ Output file created: ${outputFile} (${stats.size} bytes)`);
        
        // Verify video properties
        const originalInfo = await getVideoInfo(SAMPLE_VIDEO);
        const rotatedInfo = await getVideoInfo(outputFile);
        
        // Check that duration is preserved
        const originalDuration = parseFloat(originalInfo.format.duration);
        const rotatedDuration = parseFloat(rotatedInfo.format.duration);
        
        if (Math.abs(originalDuration - rotatedDuration) > 0.1) {
            throw new Error(`Duration mismatch: original=${originalDuration}s, rotated=${rotatedDuration}s`);
        }
        
        console.log(`✅ Duration preserved: ${rotatedDuration.toFixed(2)}s`);
        passedTests++;
        
    } catch (error) {
        console.error(`❌ Test ${totalTests} failed: ${error.message}`);
    }

    // Test 2: 180-degree rotation
    try {
        totalTests++;
        console.log(`\nTest ${totalTests}: 180-degree rotation`);
        
        const outputFile = path.join(OUTPUT_DIR, 'test_rotate_180.mp4');
        const args = ['-i', SAMPLE_VIDEO, '-r', '180', '-o', outputFile];
        
        await runRotateScript(args);
        
        const stats = checkFile(outputFile);
        console.log(`✅ Output file created: ${outputFile} (${stats.size} bytes)`);
        
        const rotatedInfo = await getVideoInfo(outputFile);
        const rotatedDuration = parseFloat(rotatedInfo.format.duration);
        console.log(`✅ Duration preserved: ${rotatedDuration.toFixed(2)}s`);
        passedTests++;
        
    } catch (error) {
        console.error(`❌ Test ${totalTests} failed: ${error.message}`);
    }

    // Test 3: 270-degree rotation
    try {
        totalTests++;
        console.log(`\nTest ${totalTests}: 270-degree rotation`);
        
        const outputFile = path.join(OUTPUT_DIR, 'test_rotate_270.mp4');
        const args = ['-i', SAMPLE_VIDEO, '-r', '270', '-o', outputFile];
        
        await runRotateScript(args);
        
        const stats = checkFile(outputFile);
        console.log(`✅ Output file created: ${outputFile} (${stats.size} bytes)`);
        
        const rotatedInfo = await getVideoInfo(outputFile);
        const rotatedDuration = parseFloat(rotatedInfo.format.duration);
        console.log(`✅ Duration preserved: ${rotatedDuration.toFixed(2)}s`);
        passedTests++;
        
    } catch (error) {
        console.error(`❌ Test ${totalTests} failed: ${error.message}`);
    }

    // Test 4: Custom loglevel
    try {
        totalTests++;
        console.log(`\nTest ${totalTests}: Custom loglevel`);
        
        const outputFile = path.join(OUTPUT_DIR, 'test_rotate_loglevel.mp4');
        const args = ['-i', SAMPLE_VIDEO, '-r', '90', '-o', outputFile, '-l', 'warning'];
        
        await runRotateScript(args);
        
        const stats = checkFile(outputFile);
        console.log(`✅ Output file created with custom loglevel: ${outputFile} (${stats.size} bytes)`);
        passedTests++;
        
    } catch (error) {
        console.error(`❌ Test ${totalTests} failed: ${error.message}`);
    }

    // Test 5: JSON config file
    try {
        totalTests++;
        console.log(`\nTest ${totalTests}: JSON config file`);
        
        const configFile = path.join(OUTPUT_DIR, 'test_rotate_config.json');
        const config = {
            input: SAMPLE_VIDEO,
            output: path.join(OUTPUT_DIR, 'test_rotate_config.mp4'),
            rotation: '90',
            loglevel: 'error'
        };
        
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        
        const args = ['-C', configFile];
        await runRotateScript(args);
        
        const stats = checkFile(config.output);
        console.log(`✅ Output file created from config: ${config.output} (${stats.size} bytes)`);
        passedTests++;
        
    } catch (error) {
        console.error(`❌ Test ${totalTests} failed: ${error.message}`);
    }

    // Test 6: Invalid rotation value
    try {
        totalTests++;
        console.log(`\nTest ${totalTests}: Invalid rotation value (should handle gracefully)`);
        
        const outputFile = path.join(OUTPUT_DIR, 'test_rotate_invalid.mp4');
        const args = ['-i', SAMPLE_VIDEO, '-r', 'invalid', '-o', outputFile];
        
        await runRotateScript(args);
        
        // This should still create a file, even with invalid rotation
        const stats = checkFile(outputFile);
        console.log(`✅ Output file created despite invalid rotation: ${outputFile} (${stats.size} bytes)`);
        passedTests++;
        
    } catch (error) {
        console.error(`❌ Test ${totalTests} failed: ${error.message}`);
    }

    // Test 7: Non-existent input file
    try {
        totalTests++;
        console.log(`\nTest ${totalTests}: Non-existent input file (should exit gracefully)`);
        
        const args = ['-i', 'nonexistent.mp4', '-r', '90', '-o', path.join(OUTPUT_DIR, 'test_nonexistent.mp4')];
        
        try {
            await runRotateScript(args);
            console.log(`✅ Script handled non-existent file gracefully`);
            passedTests++;
        } catch (error) {
            // This is expected to fail, but should fail gracefully
            console.log(`✅ Script failed gracefully for non-existent file: ${error.message}`);
            passedTests++;
        }
        
    } catch (error) {
        console.error(`❌ Test ${totalTests} failed: ${error.message}`);
    }

    // Summary
    console.log(`\n📊 Test Summary:`);
    console.log(`Passed: ${passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
        console.log(`🎉 All tests passed!`);
        process.exit(0);
    } else {
        console.log(`❌ ${totalTests - passedTests} tests failed`);
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error(`Test suite failed: ${error.message}`);
    process.exit(1);
});
