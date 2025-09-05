#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Cleanup Utility                                      │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

const fs = require('fs');
const path = require('path');

// ╭──────────────────────────────────────────────────────────╮
// │                    Cleanup Functions                     │
// ╰──────────────────────────────────────────────────────────╯

/**
 * Clean up test output files from a directory
 * @param {string} directory - Directory to clean up
 * @param {string[]} extensions - File extensions to clean up
 * @param {string[]} excludePatterns - Patterns to exclude from cleanup
 * @returns {number} Number of files cleaned up
 */
function cleanupTestFiles(directory, extensions = ['.mp4', '.mov', '.avi', '.mkv', '.json', '.txt', '.srt'], excludePatterns = ['test_']) {
    let cleanedCount = 0;
    
    try {
        const files = fs.readdirSync(directory);
        files.forEach(file => {
            const filePath = path.join(directory, file);
            
            // Check if file should be excluded
            const shouldExclude = excludePatterns.some(pattern => file.startsWith(pattern));
            if (shouldExclude) {
                return;
            }
            
            // Check if file has a cleanup extension
            const shouldCleanup = extensions.some(ext => file.endsWith(ext));
            if (shouldCleanup && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                cleanedCount++;
            }
        });
    } catch (error) {
        // Ignore cleanup errors
    }
    
    return cleanedCount;
}

/**
 * Clean up temporary files from /tmp directory
 * @param {string} prefix - Prefix pattern for temp files (e.g., 'temp_config_ff')
 * @returns {number} Number of temp files cleaned up
 */
function cleanupTempFiles(prefix = 'temp_config_ff') {
    let cleanedCount = 0;
    
    try {
        const tempFiles = fs.readdirSync('/tmp');
        tempFiles.forEach(file => {
            if (file.startsWith(prefix) && file.endsWith('.json')) {
                fs.unlinkSync(path.join('/tmp', file));
                cleanedCount++;
            }
        });
    } catch (error) {
        // Ignore temp cleanup errors
    }
    
    return cleanedCount;
}

/**
 * Comprehensive cleanup for test suites
 * @param {string} testDirectory - Directory where tests are run
 * @param {Object} options - Cleanup options
 */
function comprehensiveCleanup(testDirectory, options = {}) {
    const {
        extensions = ['.mp4', '.mov', '.avi', '.mkv', '.json', '.txt', '.srt'],
        excludePatterns = ['test_'],
        tempPrefix = 'temp_config_ff',
        verbose = false
    } = options;
    
    let totalCleaned = 0;
    
    // Clean up test directory files
    const testCleaned = cleanupTestFiles(testDirectory, extensions, excludePatterns);
    totalCleaned += testCleaned;
    
    if (verbose && testCleaned > 0) {
        console.log(`   🧹 Test cleanup: removed ${testCleaned} files from ${testDirectory}`);
    }
    
    // Clean up temp files
    const tempCleaned = cleanupTempFiles(tempPrefix);
    totalCleaned += tempCleaned;
    
    if (verbose && tempCleaned > 0) {
        console.log(`   🧹 Temp cleanup: removed ${tempCleaned} temp files`);
    }
    
    return totalCleaned;
}

/**
 * Clean up after each individual test
 * @param {string} testDirectory - Directory where tests are run
 * @param {Object} options - Cleanup options
 */
function cleanupAfterTest(testDirectory, options = {}) {
    const {
        extensions = ['.mp4', '.mov', '.avi', '.mkv', '.json', '.txt', '.srt'],
        excludePatterns = ['test_'],
        verbose = false
    } = options;
    
    const cleaned = cleanupTestFiles(testDirectory, extensions, excludePatterns);
    
    if (verbose && cleaned > 0) {
        console.log(`   🧹 Cleaned up: ${cleaned} files`);
    }
    
    return cleaned;
}

module.exports = {
    cleanupTestFiles,
    cleanupTempFiles,
    comprehensiveCleanup,
    cleanupAfterTest
};
