#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Comprehensive Test Cleanup Updater                        │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

const fs = require('fs');
const path = require('path');

// List of all test files that need updating
const testFiles = [
    'test_ff_append.js',
    'test_ff_aspect_ratio.js',
    'test_ff_audio.js',
    'test_ff_blur.js',
    'test_ff_colour.js',
    'test_ff_concat.js',
    'test_ff_convert.js',
    'test_ff_crop.js',
    'test_ff_custom.js',
    'test_ff_cut.js',
    'test_ff_download.js',
    'test_ff_flip.js',
    'test_ff_fps.js',
    'test_ff_grouptime.js',
    'test_ff_image.js',
    'test_ff_kenburns.js',
    'test_ff_lut.js',
    'test_ff_middle.js',
    'test_ff_overlay.js',
    'test_ff_pad.js',
    'test_ff_proxy.js',
    'test_ff_rotate.js'
];

function updateTestFile(filePath) {
    console.log(`Updating ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Add import for cleanup utility if not present
    if (!content.includes("const { comprehensiveCleanup } = require('./test_cleanup');")) {
        content = content.replace(
            /const { spawn } = require\('child_process'\);\nconst fs = require\('fs'\);\nconst path = require\('path'\);/,
            "const { spawn } = require('child_process');\nconst fs = require('fs');\nconst path = require('path');\nconst { comprehensiveCleanup } = require('./test_cleanup');"
        );
        updated = true;
    }
    
    // Pattern 1: Files with "All tests passed!" and process.exit
    const pattern1 = /console\.log\('🎉 All tests passed!'\);\s*process\.exit\(0\);/s;
    if (pattern1.test(content)) {
        content = content.replace(pattern1, `// Final cleanup - remove all test output files
    const totalCleaned = comprehensiveCleanup(__dirname, { verbose: true });
    
    if (totalCleaned > 0) {
        console.log(\`\\n🧹 Final cleanup completed: \${totalCleaned} files removed\`);
    }
    
    console.log('🎉 All tests passed!');
    process.exit(0);`);
        updated = true;
    }
    
    // Pattern 2: Files with "All tests passed!" without process.exit
    const pattern2 = /console\.log\('🎉 All tests passed!'\);/s;
    if (pattern2.test(content) && !pattern1.test(content)) {
        content = content.replace(pattern2, `// Final cleanup - remove all test output files
    const totalCleaned = comprehensiveCleanup(__dirname, { verbose: true });
    
    if (totalCleaned > 0) {
        console.log(\`\\n🧹 Final cleanup completed: \${totalCleaned} files removed\`);
    }
    
    console.log('🎉 All tests passed!');`);
        updated = true;
    }
    
    // Pattern 3: Files with cleanup() function calls
    const pattern3 = /finally\s*\{\s*cleanup\(\);\s*\}/s;
    if (pattern3.test(content)) {
        content = content.replace(pattern3, `finally {
        // Final cleanup - remove all test output files
        const totalCleaned = comprehensiveCleanup(__dirname, { verbose: true });
        
        if (totalCleaned > 0) {
            console.log(\`\\n🧹 Final cleanup completed: \${totalCleaned} files removed\`);
        }
    }`);
        updated = true;
    }
    
    // Pattern 4: Files with try-catch-finally structure
    const pattern4 = /catch\s*\([^)]*\)\s*\{\s*console\.error[^}]*\}\s*finally\s*\{[^}]*\}/s;
    if (pattern4.test(content) && !pattern3.test(content)) {
        content = content.replace(pattern4, (match) => {
            return match.replace(/finally\s*\{[^}]*\}/s, `finally {
        // Final cleanup - remove all test output files
        const totalCleaned = comprehensiveCleanup(__dirname, { verbose: true });
        
        if (totalCleaned > 0) {
            console.log(\`\\n🧹 Final cleanup completed: \${totalCleaned} files removed\`);
        }
    }`);
        });
        updated = true;
    }
    
    // Pattern 5: Files that end with just the test runner call
    const pattern5 = /if\s*\(require\.main\s*===\s*module\)\s*\{\s*runAllTests\(\);\s*\}/s;
    if (pattern5.test(content) && !updated) {
        content = content.replace(pattern5, `if (require.main === module) {
    runAllTests().finally(() => {
        // Final cleanup - remove all test output files
        const totalCleaned = comprehensiveCleanup(__dirname, { verbose: true });
        
        if (totalCleaned > 0) {
            console.log(\`\\n🧹 Final cleanup completed: \${totalCleaned} files removed\`);
        }
    });
}`);
        updated = true;
    }
    
    if (updated) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${filePath}`);
        return true;
    } else {
        console.log(`⚠️  Could not find suitable pattern in ${filePath}`);
        return false;
    }
}

// Update all test files
let updatedCount = 0;
for (const testFile of testFiles) {
    const filePath = path.join(__dirname, testFile);
    if (fs.existsSync(filePath)) {
        if (updateTestFile(filePath)) {
            updatedCount++;
        }
    } else {
        console.log(`❌ File not found: ${filePath}`);
    }
}

console.log(`\n📊 Updated ${updatedCount}/${testFiles.length} test files`);
console.log("🎉 Comprehensive test cleanup update completed!");
