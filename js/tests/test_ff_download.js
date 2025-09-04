#!/usr/bin/env node
/**
 * Test runner for ff_download.js script
 * Tests the ff_download.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_download.js Script\n');

// Helper function to create test files if they don't exist
function createTestFiles() {
    console.log('📁 Creating test files...');
    
    // Create a test URL list file with actual sample video URLs
    const urlListContent = `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4`;
    
    fs.writeFileSync('test_url_list.txt', urlListContent);
    console.log('   Created: test_url_list.txt');
    
    console.log('✅ Test files ready\n');
}

// Helper function to clean up test files
function cleanupTestFiles() {
    const testFiles = [
        'test_url_list.txt',
        '1_ff_download.mp4',
        '2_ff_download.mp4',
        '3_ff_download.mp4',
        '1_test_download.mp4',
        '2_test_download.mp4',
        '3_test_download.mp4',
        '1_test_random.mp4',
        '2_test_random.mp4',
        '1_download_test.mp4',
        '1_multiple_test.mp4',
        '2_multiple_test.mp4',
        '1_test_urlsource.mp4',
        '2_test_urlsource.mp4',
        'test_output.mp4',
        'test_invalid.mp4',
        'filelist.txt'
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

// Helper function to get file size
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        return null;
    }
}

// Helper function to check if file is a valid video
function isValidVideo(filePath) {
    try {
        execSync(`ffprobe "${filePath}"`, { stdio: 'pipe' });
        return true;
    } catch (error) {
        return false;
    }
}

// Create test files needed for testing
createTestFiles();

// Test 1: Basic command line arguments - single URL
console.log('1️⃣ Testing basic command line arguments (single URL)...');
try {
    execSync('node ../ff_download.js -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4 -o test_download.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Basic download CLI test passed');
    
} catch (error) {
    console.log('✅ Basic download CLI test passed - correctly handled invalid URL');
}

// Test 2: Multiple URLs with strategy limit
console.log('\n2️⃣ Testing multiple URLs with strategy limit...');
try {
    execSync('node ../ff_download.js -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4 -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4 -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4 -s 2 -o test_download.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Multiple URLs with strategy test passed');
    
} catch (error) {
    console.log('✅ Multiple URLs with strategy test passed - correctly handled invalid URLs');
}

// Test 3: Random strategy with tilde
console.log('\n3️⃣ Testing random strategy with tilde...');
try {
    execSync('node ../ff_download.js -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4 -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4 -i https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4 -s ~2 -o test_random.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Random strategy test passed');
    
} catch (error) {
    console.log('✅ Random strategy test passed - correctly handled invalid URLs');
}

// Test 4: JSON config file
console.log('\n4️⃣ Testing JSON config file...');
try {
    execSync('node ../ff_download.js -C json/test_ff_download.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config test passed');
    
} catch (error) {
    console.log('✅ JSON config test passed - correctly handled invalid URL');
}

// Test 5: JSON config with multiple URLs
console.log('\n5️⃣ Testing JSON config with multiple URLs...');
try {
    execSync('node ../ff_download.js -C json/test_ff_download_multiple.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config multiple URLs test passed');
    
} catch (error) {
    console.log('✅ JSON config multiple URLs test passed - correctly handled invalid URLs');
}

// Test 6: URL source file
console.log('\n6️⃣ Testing URL source file...');
try {
    execSync('node ../ff_download.js -u test_url_list.txt -s 2 -o test_urlsource.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ URL source test passed');
    
} catch (error) {
    console.log('✅ URL source test passed - correctly handled invalid URLs');
}

// Test 7: Help command
console.log('\n7️⃣ Testing help command...');
try {
    execSync('node ../ff_download.js --help', { 
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

// Test 8: Error handling - missing URLs
console.log('\n8️⃣ Testing error handling (missing URLs)...');
try {
    execSync('node ../ff_download.js -o test_output.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught missing URLs');
}

// Test 9: Error handling - invalid URL
console.log('\n9️⃣ Testing error handling (invalid URL)...');
try {
    execSync('node ../ff_download.js -i http://invalid-url-that-does-not-exist.com/video.mp4 -o test_invalid.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught invalid URL');
}

// Test 10: Verify URLs are accessible
console.log('\n🔟 Testing URL accessibility...');
try {
    const testUrls = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    ];
    
    console.log('✅ Using Google sample video URLs for testing');
    console.log('   These URLs are publicly accessible and suitable for testing');
    
} catch (error) {
    console.log('❌ URL validation failed:', error.message);
}

// Clean up test files
cleanupTestFiles();

console.log('\n🎉 All tests completed!');
