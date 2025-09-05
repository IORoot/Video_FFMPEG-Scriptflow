const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { comprehensiveCleanup } = require('./test_cleanup');

/**
 * Test suite for ff_proxy.js
 * Tests video proxy generation with various parameters
 */

const TEST_DIR = path.join(__dirname, '..', '..', 'tests');
const SAMPLE_VIDEO = path.join(TEST_DIR, 'sample_video.mp4');
const OUTPUT_DIR = __dirname;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Utility function to run ffprobe and get video info
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
        ffprobe.stdout.on('data', (data) => {
            output += data.toString();
        });

        ffprobe.on('close', (code) => {
            if (code === 0) {
                try {
                    const info = JSON.parse(output);
                    resolve(info);
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(`FFprobe failed with code ${code}`));
            }
        });

        ffprobe.on('error', (error) => {
            reject(error);
        });
    });
}

// Utility function to run the proxy script
function runProxyScript(args) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', 'ff_proxy.js');
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
                resolve({ stdout, stderr, code });
            } else {
                reject({ stdout, stderr, code });
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}

// Test function
async function runTest(testName, testFunction) {
    console.log(`\n🧪 Running test: ${testName}`);
    try {
        await testFunction();
        console.log(`✅ ${testName} passed`);
    } catch (error) {
        console.error(`❌ ${testName} failed:`, error.message);
        throw error;
    }
}

// Cleanup function
function cleanup() {
    const files = fs.readdirSync(OUTPUT_DIR);
    files.forEach(file => {
        if (file.startsWith('ff_proxy') || file.startsWith('proxy_')) {
            fs.unlinkSync(path.join(OUTPUT_DIR, file));
        }
    });
}

// Test cases
async function testBasicProxyGeneration() {
    const outputFile = path.join(OUTPUT_DIR, 'ff_proxy.mp4');
    
    // Run proxy script
    await runProxyScript([
        '-i', SAMPLE_VIDEO,
        '-o', outputFile,
        '-x', '1280',
        '-y', '-2',
        '-f', '30',
        '-c', '25'
    ]);

    // Verify output file exists
    if (!fs.existsSync(outputFile)) {
        throw new Error('Output file was not created');
    }

    // Get video info
    const originalInfo = await getVideoInfo(SAMPLE_VIDEO);
    const proxyInfo = await getVideoInfo(outputFile);

    // Verify dimensions
    const videoStream = proxyInfo.streams.find(s => s.codec_type === 'video');
    if (!videoStream) {
        throw new Error('No video stream found in proxy');
    }

    if (videoStream.width !== 1280) {
        throw new Error(`Expected width 1280, got ${videoStream.width}`);
    }

    // Verify FPS
    const fps = eval(videoStream.r_frame_rate);
    if (Math.abs(fps - 30) > 1) {
        throw new Error(`Expected FPS ~30, got ${fps}`);
    }

    console.log(`   Original: ${originalInfo.format.duration}s, ${originalInfo.streams[0].width}x${originalInfo.streams[0].height}`);
    console.log(`   Proxy: ${proxyInfo.format.duration}s, ${videoStream.width}x${videoStream.height}, ${fps}fps`);
}

async function testCustomDimensions() {
    const outputFile = path.join(OUTPUT_DIR, 'ff_proxy_custom.mp4');
    
    await runProxyScript([
        '-i', SAMPLE_VIDEO,
        '-o', outputFile,
        '-x', '640',
        '-y', '480',
        '-f', '24',
        '-c', '30'
    ]);

    if (!fs.existsSync(outputFile)) {
        throw new Error('Output file was not created');
    }

    const proxyInfo = await getVideoInfo(outputFile);
    const videoStream = proxyInfo.streams.find(s => s.codec_type === 'video');

    if (videoStream.width !== 640 || videoStream.height !== 480) {
        throw new Error(`Expected 640x480, got ${videoStream.width}x${videoStream.height}`);
    }

    const fps = eval(videoStream.r_frame_rate);
    if (Math.abs(fps - 24) > 1) {
        throw new Error(`Expected FPS ~24, got ${fps}`);
    }
}

async function testDifferentCodec() {
    const outputFile = path.join(OUTPUT_DIR, 'ff_proxy_codec.mp4');
    
    await runProxyScript([
        '-i', SAMPLE_VIDEO,
        '-o', outputFile,
        '-d', 'libx265',
        '-c', '28'
    ]);

    if (!fs.existsSync(outputFile)) {
        throw new Error('Output file was not created');
    }

    const proxyInfo = await getVideoInfo(outputFile);
    const videoStream = proxyInfo.streams.find(s => s.codec_type === 'video');

    if (videoStream.codec_name !== 'hevc') {
        throw new Error(`Expected HEVC codec, got ${videoStream.codec_name}`);
    }
}

async function testConfigFile() {
    const configFile = path.join(OUTPUT_DIR, 'proxy_config.json');
    const outputFile = path.join(OUTPUT_DIR, 'ff_proxy_config.mp4');
    
    // Create config file
    const config = {
        input: SAMPLE_VIDEO,
        output: outputFile,
        scalex: "960",
        scaley: "-2",
        fps: "25",
        crf: "23",
        codec: "libx264"
    };

    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    await runProxyScript([
        '-C', configFile
    ]);

    if (!fs.existsSync(outputFile)) {
        throw new Error('Output file was not created');
    }

    const proxyInfo = await getVideoInfo(outputFile);
    const videoStream = proxyInfo.streams.find(s => s.codec_type === 'video');

    if (videoStream.width !== 960) {
        throw new Error(`Expected width 960, got ${videoStream.width}`);
    }

    const fps = eval(videoStream.r_frame_rate);
    if (Math.abs(fps - 25) > 1) {
        throw new Error(`Expected FPS ~25, got ${fps}`);
    }

    // Cleanup config file
    fs.unlinkSync(configFile);
}

async function testJSONConfigFile() {
    const jsonConfigFile = path.join(__dirname, 'json', 'test_ff_proxy.json');
    const outputFile = path.join(OUTPUT_DIR, 'ff_proxy_json.mp4');
    
    // Check if JSON config file exists
    if (!fs.existsSync(jsonConfigFile)) {
        throw new Error(`JSON config file not found: ${jsonConfigFile}`);
    }

    await runProxyScript([
        '-C', jsonConfigFile
    ]);

    // The output file name should be determined by the JSON config
    // Let's check if any proxy file was created
    const files = fs.readdirSync(OUTPUT_DIR);
    const proxyFiles = files.filter(file => file.startsWith('ff_proxy') && file.endsWith('.mp4'));
    
    if (proxyFiles.length === 0) {
        throw new Error('No proxy file was created from JSON config');
    }

    const latestProxyFile = path.join(OUTPUT_DIR, proxyFiles[proxyFiles.length - 1]);
    const proxyInfo = await getVideoInfo(latestProxyFile);
    const videoStream = proxyInfo.streams.find(s => s.codec_type === 'video');

    if (!videoStream) {
        throw new Error('No video stream found in proxy');
    }

    console.log(`   JSON Config Proxy: ${videoStream.width}x${videoStream.height}, ${videoStream.codec_name}`);
}

async function testFolderProcessing() {
    // Create a test folder with sample videos
    const testFolder = path.join(OUTPUT_DIR, 'test_folder');
    if (!fs.existsSync(testFolder)) {
        fs.mkdirSync(testFolder, { recursive: true });
    }

    // Copy sample video to test folder
    const testVideo1 = path.join(testFolder, 'test1.mp4');
    const testVideo2 = path.join(testFolder, 'test2.mp4');
    fs.copyFileSync(SAMPLE_VIDEO, testVideo1);
    fs.copyFileSync(SAMPLE_VIDEO, testVideo2);

    await runProxyScript([
        '-i', testFolder,
        '-x', '800',
        '-y', '600'
    ]);

    // Check if proxy files were created
    const proxy1 = path.join(testFolder, 'proxy_test1.mp4');
    const proxy2 = path.join(testFolder, 'proxy_test2.mp4');

    if (!fs.existsSync(proxy1) || !fs.existsSync(proxy2)) {
        throw new Error('Proxy files were not created in folder');
    }

    // Verify dimensions
    const proxyInfo = await getVideoInfo(proxy1);
    const videoStream = proxyInfo.streams.find(s => s.codec_type === 'video');

    if (videoStream.width !== 800 || videoStream.height !== 600) {
        throw new Error(`Expected 800x600, got ${videoStream.width}x${videoStream.height}`);
    }

    // Cleanup test folder
    fs.rmSync(testFolder, { recursive: true, force: true });
}

async function testErrorHandling() {
    // Test with non-existent file
    try {
        await runProxyScript([
            '-i', 'nonexistent.mp4',
            '-o', path.join(OUTPUT_DIR, 'error_test.mp4')
        ]);
        throw new Error('Should have failed with non-existent file');
    } catch (error) {
        if (error.code === 0) {
            throw new Error('Expected error but got success');
        }
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting ff_proxy.js test suite...\n');

    try {
        await runTest('Basic proxy generation', testBasicProxyGeneration);
        await runTest('Custom dimensions', testCustomDimensions);
        await runTest('Different codec', testDifferentCodec);
        await runTest('Config file', testConfigFile);
        await runTest('JSON config file', testJSONConfigFile);
        await runTest('Folder processing', testFolderProcessing);
        await runTest('Error handling', testErrorHandling);

        console.log('\n🎉 All tests passed!');
    } catch (error) {
        console.error('\n💥 Test suite failed:', error.message);
        process.exit(1);
    } finally {
        // Final cleanup - remove all test output files
        const totalCleaned = comprehensiveCleanup(__dirname, { verbose: true });
        
        if (totalCleaned > 0) {
            console.log(`\n🧹 Final cleanup completed: ${totalCleaned} files removed`);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests,
    runTest,
    runProxyScript,
    getVideoInfo
};
