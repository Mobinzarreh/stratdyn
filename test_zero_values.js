#!/usr/bin/env node

/**
 * Test script to validate that 0 values are properly handled in CSV logging
 * Tests intention=0, uPercentile=0, rPercentile=0, scores=0
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing 0 Value Handling in CSV Logic\n');

// Simulate the CSV writing logic with test cases
function testCSVWriting() {
    const testCases = [
        {
            name: "Intention = 0",
            userDecision: { intention: 0 },
            field: 'intention',
            expected: '0'
        },
        {
            name: "uPercentile = 0",
            userDecision: { uPercentile: 0 },
            field: 'uPercentile',
            expected: '0'
        },
        {
            name: "rPercentile = 0",
            userDecision: { rPercentile: 0 },
            field: 'rPercentile',
            expected: '0'
        },
        {
            name: "rValue = 0",
            userDecision: { rValue: 0 },
            field: 'rValue',
            expected: '0'
        },
        {
            name: "uValue = 0",
            userDecision: { uValue: 0 },
            field: 'uValue',
            expected: '0'
        },
        {
            name: "Intention = undefined",
            userDecision: { intention: undefined },
            field: 'intention',
            expected: ''
        },
        {
            name: "uPercentile = null",
            userDecision: { uPercentile: null },
            field: 'uPercentile',
            expected: ''
        },
        {
            name: "Intention = '' (empty string)",
            userDecision: { intention: '' },
            field: 'intention',
            expected: ''
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(testCase => {
        const userDecision = testCase.userDecision;
        let result;

        // Apply the new logic
        switch(testCase.field) {
            case 'intention':
                result = userDecision.intention !== undefined && userDecision.intention !== null ? userDecision.intention : '';
                break;
            case 'uPercentile':
                result = userDecision.uPercentile !== undefined && userDecision.uPercentile !== null ? userDecision.uPercentile : '';
                break;
            case 'rPercentile':
                result = userDecision.rPercentile !== undefined && userDecision.rPercentile !== null ? userDecision.rPercentile : '';
                break;
            case 'rValue':
                result = userDecision.rValue !== undefined && userDecision.rValue !== null ? userDecision.rValue : '';
                break;
            case 'uValue':
                result = userDecision.uValue !== undefined && userDecision.uValue !== null ? userDecision.uValue : '';
                break;
        }

        const success = String(result) === String(testCase.expected);
        
        if (success) {
            console.log(`✅ ${testCase.name}: PASS (${result})`);
            passed++;
        } else {
            console.log(`❌ ${testCase.name}: FAIL (got ${result}, expected ${testCase.expected})`);
            failed++;
        }
    });

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
    return failed === 0;
}

// Test score accumulation logic
function testScoreAccumulation() {
    console.log('🧪 Testing Score Accumulation Logic\n');
    
    const testDecisions = [
        { pointsEarned: 10, score: 8, isTraining: false },
        { pointsEarned: 0, score: 0, isTraining: false },  // Should be included!
        { pointsEarned: 15, score: 15, isTraining: false },
        { pointsEarned: 5, score: 3, isTraining: false },
        { pointsEarned: 0, score: -2, isTraining: false }, // Lost points due to penalty
    ];

    let totalScoreWithPenalty = 0;
    let totalScoreNoPenalty = 0;

    for (const decision of testDecisions) {
        if (decision.isTraining) continue;
        
        // New logic - should include 0 values
        if (decision.score !== undefined && decision.score !== null) {
            totalScoreWithPenalty += decision.score;
        }
        if (decision.pointsEarned !== undefined && decision.pointsEarned !== null) {
            totalScoreNoPenalty += decision.pointsEarned;
        }
    }

    const expectedWithPenalty = 8 + 0 + 15 + 3 + (-2); // = 24
    const expectedNoPenalty = 10 + 0 + 15 + 5 + 0; // = 30

    console.log(`Total Score (with penalty): ${totalScoreWithPenalty}`);
    console.log(`Expected: ${expectedWithPenalty}`);
    console.log(`Total Points (no penalty): ${totalScoreNoPenalty}`);
    console.log(`Expected: ${expectedNoPenalty}\n`);

    const passed = totalScoreWithPenalty === expectedWithPenalty && 
                   totalScoreNoPenalty === expectedNoPenalty;

    if (passed) {
        console.log(`✅ Score accumulation: PASS\n`);
    } else {
        console.log(`❌ Score accumulation: FAIL\n`);
    }

    return passed;
}

// Test partner score
function testPartnerScore() {
    console.log('🧪 Testing Partner Score Handling\n');
    
    const testCases = [
        { partnerUserScore: 0, expected: '0', name: 'Partner score = 0' },
        { partnerUserScore: 10, expected: '10', name: 'Partner score = 10' },
        { partnerUserScore: undefined, expected: '', name: 'Partner score = undefined' },
        { partnerUserScore: null, expected: '', name: 'Partner score = null' },
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(testCase => {
        const result = testCase.partnerUserScore !== undefined && testCase.partnerUserScore !== null ? 
                       testCase.partnerUserScore : '';
        
        const success = String(result) === testCase.expected;
        
        if (success) {
            console.log(`✅ ${testCase.name}: PASS (${result})`);
            passed++;
        } else {
            console.log(`❌ ${testCase.name}: FAIL (got ${result}, expected ${testCase.expected})`);
            failed++;
        }
    });

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
    return failed === 0;
}

// Run all tests
const csvTest = testCSVWriting();
const scoreTest = testScoreAccumulation();
const partnerTest = testPartnerScore();

if (csvTest && scoreTest && partnerTest) {
    console.log('🎉 ALL TESTS PASSED! Zero value handling is correct.\n');
    process.exit(0);
} else {
    console.log('❌ SOME TESTS FAILED! Review the logic.\n');
    process.exit(1);
}
