#!/usr/bin/env node
/**
 * Test runner for ff_audio.js script
 * Tests the ff_audio.js script with various configurations and validates output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ff_audio.js Script\n');

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

// Helper function to get audio stream info using ffprobe
function getAudioStreamInfo(filePath) {
    try {
        const output = execSync(`ffprobe -v quiet -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "${filePath}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return output.trim();
    } catch (error) {
        return null; // No audio stream
    }
}

// Helper function to get audio duration using ffprobe
function getAudioDuration(filePath) {
    try {
        const output = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return parseFloat(output.trim());
    } catch (error) {
        console.log(`❌ Failed to get audio duration for ${filePath}:`, error.message);
        return null;
    }
}

// Test 1: Basic command line arguments - audio overlay
console.log('1️⃣ Testing basic command line arguments (audio overlay)...');
try {
    // Get properties of input files
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const audioDuration = getAudioDuration('samples/sample_voice.mp3');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputAudio = getAudioStreamInfo('samples/sample_video.mp4');
    
    console.log(`   Input video duration: ${inputDuration} seconds`);
    console.log(`   Audio file duration: ${audioDuration} seconds`);
    console.log(`   Input video properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input video audio: ${inputAudio || 'none'}`);
    
    execSync('node ../ff_audio.js -i samples/sample_video.mp4 -a samples/sample_voice.mp3 -o test_audio_overlay.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Audio overlay CLI test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('test_audio_overlay.mp4');
    const outputProps = getVideoProperties('test_audio_overlay.mp4');
    const outputAudio = getAudioStreamInfo('test_audio_overlay.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output audio: ${outputAudio || 'none'}`);
    
    // Verify audio was added
    if (outputAudio) {
        console.log('✅ Audio stream verification passed - audio was added to video');
    } else {
        console.log('❌ Audio stream verification failed - no audio in output');
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
    if (fs.existsSync('test_audio_overlay.mp4')) {
        fs.unlinkSync('test_audio_overlay.mp4');
    }
} catch (error) {
    console.log('❌ Audio overlay CLI test failed:', error.message);
}

// Test 2: Command line arguments - audio removal
console.log('\n2️⃣ Testing command line arguments (audio removal)...');
try {
    // Get properties of input file
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    const inputAudio = getAudioStreamInfo('samples/sample_video.mp4');
    
    console.log(`   Input video duration: ${inputDuration} seconds`);
    console.log(`   Input video properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    console.log(`   Input video audio: ${inputAudio || 'none'}`);
    
    execSync('node ../ff_audio.js -i samples/sample_video.mp4 -r -o test_audio_remove.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Audio removal CLI test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('test_audio_remove.mp4');
    const outputProps = getVideoProperties('test_audio_remove.mp4');
    const outputAudio = getAudioStreamInfo('test_audio_remove.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output audio: ${outputAudio || 'none'}`);
    
    // Verify audio was removed
    if (!outputAudio) {
        console.log('✅ Audio removal verification passed - audio was removed from video');
    } else {
        console.log('❌ Audio removal verification failed - audio still present in output');
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
    if (fs.existsSync('test_audio_remove.mp4')) {
        fs.unlinkSync('test_audio_remove.mp4');
    }
} catch (error) {
    console.log('❌ Audio removal CLI test failed:', error.message);
}

// Test 3: Command line arguments - delayed audio with speed
console.log('\n3️⃣ Testing command line arguments (delayed audio with speed)...');
try {
    // Get properties of input files
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const audioDuration = getAudioDuration('samples/sample_voice.mp3');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    
    console.log(`   Input video duration: ${inputDuration} seconds`);
    console.log(`   Audio file duration: ${audioDuration} seconds`);
    console.log(`   Input video properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    
    execSync('node ../ff_audio.js -i samples/sample_video.mp4 -a samples/sample_voice.mp3 -s 5 -p 1.5 -o test_delayed_audio.mp4', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Delayed audio CLI test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('test_delayed_audio.mp4');
    const outputProps = getVideoProperties('test_delayed_audio.mp4');
    const outputAudio = getAudioStreamInfo('test_delayed_audio.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output audio: ${outputAudio || 'none'}`);
    
    // Verify audio was added
    if (outputAudio) {
        console.log('✅ Delayed audio verification passed - audio was added to video');
    } else {
        console.log('❌ Delayed audio verification failed - no audio in output');
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
    if (fs.existsSync('test_delayed_audio.mp4')) {
        fs.unlinkSync('test_delayed_audio.mp4');
    }
} catch (error) {
    console.log('❌ Delayed audio CLI test failed:', error.message);
}

// Test 4: JSON config file - basic audio overlay
console.log('\n4️⃣ Testing JSON config file (basic audio overlay)...');
try {
    // Get properties of input files
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const audioDuration = getAudioDuration('samples/sample_voice.mp3');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    
    console.log(`   Input video duration: ${inputDuration} seconds`);
    console.log(`   Audio file duration: ${audioDuration} seconds`);
    console.log(`   Input video properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    
    execSync('node ../ff_audio.js -C json/test_ff_audio.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config audio overlay test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('audio_overlay_test.mp4');
    const outputProps = getVideoProperties('audio_overlay_test.mp4');
    const outputAudio = getAudioStreamInfo('audio_overlay_test.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output audio: ${outputAudio || 'none'}`);
    
    // Verify audio was added
    if (outputAudio) {
        console.log('✅ JSON audio overlay verification passed - audio was added to video');
    } else {
        console.log('❌ JSON audio overlay verification failed - no audio in output');
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
    if (fs.existsSync('audio_overlay_test.mp4')) {
        fs.unlinkSync('audio_overlay_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config audio overlay test failed:', error.message);
}

// Test 5: JSON config file - audio removal
console.log('\n5️⃣ Testing JSON config file (audio removal)...');
try {
    // Get properties of input file
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    
    console.log(`   Input video duration: ${inputDuration} seconds`);
    console.log(`   Input video properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    
    execSync('node ../ff_audio.js -C json/test_ff_audio_remove.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config audio removal test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('audio_remove_test.mp4');
    const outputProps = getVideoProperties('audio_remove_test.mp4');
    const outputAudio = getAudioStreamInfo('audio_remove_test.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output audio: ${outputAudio || 'none'}`);
    
    // Verify audio was removed
    if (!outputAudio) {
        console.log('✅ JSON audio removal verification passed - audio was removed from video');
    } else {
        console.log('❌ JSON audio removal verification failed - audio still present in output');
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
    if (fs.existsSync('audio_remove_test.mp4')) {
        fs.unlinkSync('audio_remove_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config audio removal test failed:', error.message);
}

// Test 6: JSON config file - delayed audio with speed and shortest
console.log('\n6️⃣ Testing JSON config file (delayed audio with speed and shortest)...');
try {
    // Get properties of input files
    const inputDuration = getVideoDuration('samples/sample_video.mp4');
    const audioDuration = getAudioDuration('samples/sample_voice.mp3');
    const inputProps = getVideoProperties('samples/sample_video.mp4');
    
    console.log(`   Input video duration: ${inputDuration} seconds`);
    console.log(`   Audio file duration: ${audioDuration} seconds`);
    console.log(`   Input video properties: ${inputProps.width}x${inputProps.height} (${inputProps.codec})`);
    
    execSync('node ../ff_audio.js -C json/test_ff_audio_delayed.json', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ JSON config delayed audio test passed');
    
    // Verify output file properties
    const outputDuration = getVideoDuration('audio_delayed_test.mp4');
    const outputProps = getVideoProperties('audio_delayed_test.mp4');
    const outputAudio = getAudioStreamInfo('audio_delayed_test.mp4');
    
    console.log(`   Output duration: ${outputDuration} seconds`);
    console.log(`   Output properties: ${outputProps.width}x${outputProps.height} (${outputProps.codec})`);
    console.log(`   Output audio: ${outputAudio || 'none'}`);
    
    // Verify audio was added
    if (outputAudio) {
        console.log('✅ JSON delayed audio verification passed - audio was added to video');
    } else {
        console.log('❌ JSON delayed audio verification failed - no audio in output');
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
    if (fs.existsSync('audio_delayed_test.mp4')) {
        fs.unlinkSync('audio_delayed_test.mp4');
    }
} catch (error) {
    console.log('❌ JSON config delayed audio test failed:', error.message);
}

// Test 7: Help command
console.log('\n7️⃣ Testing help command...');
try {
    execSync('node ../ff_audio.js --help', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('✅ Help test passed - correctly exited with status 0');
} catch (error) {
    console.log('❌ Help test failed:', error.message);
}

// Test 8: Error handling - missing files
console.log('\n8️⃣ Testing error handling (missing files)...');
try {
    execSync('node ../ff_audio.js -i samples/nonexistent.mp4 -a samples/sample_voice.mp3', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught missing file');
}

// Test 9: Error handling - missing audio file
console.log('\n9️⃣ Testing error handling (missing audio file)...');
try {
    execSync('node ../ff_audio.js -i samples/sample_video.mp4 -a samples/nonexistent.mp3', { 
        cwd: __dirname,
        stdio: 'pipe'
    });
    console.log('❌ Error handling test failed - should have errored');
} catch (error) {
    console.log('✅ Error handling test passed - correctly caught missing audio file');
}

// Test 10: Verify input files are valid
console.log('\n🔟 Testing input file validation...');
try {
    const videoProps = getVideoProperties('samples/sample_video.mp4');
    const videoDuration = getVideoDuration('samples/sample_video.mp4');
    const audioDuration = getAudioDuration('samples/sample_voice.mp3');
    
    if (videoProps && videoProps.width && videoProps.height && videoProps.codec) {
        console.log(`✅ Video file validation passed - ${videoProps.width}x${videoProps.height} ${videoProps.codec} (duration: ${videoDuration}s)`);
    } else {
        console.log('❌ Video file validation failed - not a valid video file');
    }
    
    if (audioDuration) {
        console.log(`✅ Audio file validation passed - duration: ${audioDuration}s`);
    } else {
        console.log('❌ Audio file validation failed - not a valid audio file');
    }
} catch (error) {
    console.log('❌ Input file validation failed:', error.message);
}

console.log('\n🎉 All tests completed!');
