const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Test suite for ff_pad.js
 * Tests video padding functionality with various configurations
 */

const TEST_DIR = path.join(__dirname, '..', '..', 'tests');
const SAMPLE_VIDEO = path.join(TEST_DIR, 'sample_video.mp4');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Utility function to run ffprobe and get video info
function getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_streams',
            videoPath
        ]);

        let output = '';
        ffprobe.stdout.on('data', (data) => {
            output += data.toString();
        });

        ffprobe.on('close', (code) => {
            if (code === 0) {
                try {
                    const info = JSON.parse(output);
                    const videoStream = info.streams.find(s => s.codec_type === 'video');
                    resolve({
                        width: parseInt(videoStream.width),
                        height: parseInt(videoStream.height),
                        duration: parseFloat(videoStream.duration),
                        format: videoStream.codec_name
                    });
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(`ffprobe failed with code ${code}`));
            }
        });

        ffprobe.on('error', reject);
    });
}

// Utility function to run the pad script
function runPadScript(args) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', 'ff_pad.js');
        const child = spawn('node', [scriptPath, ...args]);

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Script failed with code ${code}: ${stderr}`));
            }
        });

        child.on('error', reject);
    });
}

// Test cases
async function runTests() {
    console.log('🧪 Starting ff_pad.js tests...\n');

    const tests = [
        {
            name: 'Basic padding - double height',
            args: ['-i', SAMPLE_VIDEO, '-o', path.join(OUTPUT_DIR, 'test_pad_basic.mp4'), '--height', 'ih*2'],
            description: 'Add padding to double the video height'
        },
        {
            name: 'White background padding',
            args: ['-i', SAMPLE_VIDEO, '-o', path.join(OUTPUT_DIR, 'test_pad_white.mp4'), '--height', 'ih*2', '-c', 'white'],
            description: 'Add white padding around the video'
        },
        {
            name: 'Black bars (letterbox)',
            args: ['-i', SAMPLE_VIDEO, '-o', path.join(OUTPUT_DIR, 'test_pad_letterbox.mp4'), '-w', 'iw', '--height', 'ih+100', '-y', '(oh-ih)/2', '-x', '(ow-iw)/2', '-c', '#000000'],
            description: 'Create black letterbox bars'
        },
        {
            name: 'Centered padding with custom color',
            args: ['-i', SAMPLE_VIDEO, '-o', path.join(OUTPUT_DIR, 'test_pad_centered.mp4'), '-w', 'iw*1.5', '--height', 'ih*1.5', '-x', '(ow-iw)/2', '-y', '(oh-ih)/2', '-c', '#fb923c'],
            description: 'Center video with orange padding'
        },
        {
            name: 'Full padding all around',
            args: ['-i', SAMPLE_VIDEO, '-o', path.join(OUTPUT_DIR, 'test_pad_full.mp4'), '-w', 'iw*2', '--height', 'ih*2'],
            description: 'Add padding on all sides'
        },
        {
            name: 'JSON config - Basic padding',
            args: ['-C', path.join(__dirname, 'json', 'test_ff_pad_basic.json')],
            description: 'Test basic padding using JSON configuration'
        },
        {
            name: 'JSON config - White background padding',
            args: ['-C', path.join(__dirname, 'json', 'test_ff_pad_white.json')],
            description: 'Test white background padding using JSON configuration'
        },
        {
            name: 'JSON config - Letterbox padding',
            args: ['-C', path.join(__dirname, 'json', 'test_ff_pad_letterbox.json')],
            description: 'Test letterbox padding using JSON configuration'
        }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        console.log(`📋 Test: ${test.name}`);
        console.log(`📝 Description: ${test.description}`);
        
        try {
            // Get original video info
            const originalInfo = await getVideoInfo(SAMPLE_VIDEO);
            console.log(`📏 Original: ${originalInfo.width}x${originalInfo.height} (${originalInfo.duration}s)`);

            // Run the pad script
            await runPadScript(test.args);
            
            // Get output video info
            const outputPath = test.args.find(arg => arg.endsWith('.mp4') && arg !== SAMPLE_VIDEO);
            const outputInfo = await getVideoInfo(outputPath);
            console.log(`📏 Output: ${outputInfo.width}x${outputInfo.height} (${outputInfo.duration}s)`);

            // Verify duration hasn't changed
            if (Math.abs(outputInfo.duration - originalInfo.duration) < 0.1) {
                console.log(`✅ Duration check passed (${outputInfo.duration}s)`);
                
                // Verify dimensions have changed (except for letterbox test)
                if (test.name.includes('letterbox')) {
                    if (outputInfo.height > originalInfo.height) {
                        console.log(`✅ Height increased as expected`);
                        passedTests++;
                    } else {
                        console.log(`❌ Height should have increased`);
                    }
                } else {
                    if (outputInfo.width !== originalInfo.width || outputInfo.height !== originalInfo.height) {
                        console.log(`✅ Dimensions changed as expected`);
                        passedTests++;
                    } else {
                        console.log(`❌ Dimensions should have changed`);
                    }
                }
            } else {
                console.log(`❌ Duration changed unexpectedly`);
            }

        } catch (error) {
            console.log(`❌ Test failed: ${error.message}`);
        }

        console.log(''); // Empty line for readability
    }

    console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('💥 Some tests failed!');
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, getVideoInfo, runPadScript };
