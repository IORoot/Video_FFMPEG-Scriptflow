#!/usr/bin/env node
// ╭──────────────────────────────────────────────────────────────────────────────╮
// │                                                                              │
// │                    Test Cleanup Updater                                      │
// │                                                                              │
// ╰──────────────────────────────────────────────────────────────────────────────╯

const fs = require('fs');
const path = require('path');

// List of test files to update (excluding the ones already updated)
const testFiles = [
    'tests_ff_unsharp.js',
    'tests_ff_transition.js', 
    'tests_ff_transcode.js',
    'tests_ff_to_portrait.js',
    'tests_ff_to_landscape.js',
    'tests_ff_thumbnail.js',
    'tests_ff_subtitles.js',
    'tests_ff_stack.js',
    'tests_ff_social_media.js',
    'tests_ff_sharpen.js',
    'tests_ff_sh_runner.js',
    'tests_ff_scale.js'
];

function updateTestFile(filePath) {
    console.log(`Updating ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import for cleanup utility
    if (!content.includes("const { comprehensiveCleanup } = require('./test_cleanup');")) {
        content = content.replace(
            /const { spawn } = require\('child_process'\);\nconst fs = require\('fs'\);\nconst path = require\('path'\);/,
            "const { spawn } = require('child_process');\nconst fs = require('fs');\nconst path = require('path');\nconst { comprehensiveCleanup } = require('./test_cleanup');"
        );
    }
    
    // Find and replace the test results section
    const testResultsPattern = /console\.log\(`\\n📊 Test Results: \$\{passedTests\}\/\$\{totalTests\} tests passed`\);\s*\n\s*if \(passedTests === totalTests\) \{\s*console\.log\("🎉 All tests passed!"\);\s*\} else \{\s*console\.log\("❌ Some tests failed!"\);\s*process\.exit\(1\);\s*\}/s;
    
    const replacement = `console.log(\`\\n📊 Test Results: \${passedTests}/\${totalTests} tests passed\`);

    // Final cleanup - remove all test output files
    const totalCleaned = comprehensiveCleanup(__dirname, { verbose: true });
    
    if (totalCleaned > 0) {
        console.log(\`\\n🧹 Final cleanup completed: \${totalCleaned} files removed\`);
    }
    
    if (passedTests === totalTests) {
        console.log("🎉 All tests passed!");
    } else {
        console.log("❌ Some tests failed!");
        process.exit(1);
    }`;
    
    if (testResultsPattern.test(content)) {
        content = content.replace(testResultsPattern, replacement);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${filePath}`);
        return true;
    } else {
        console.log(`⚠️  Could not find test results pattern in ${filePath}`);
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
console.log("🎉 Test cleanup update completed!");
