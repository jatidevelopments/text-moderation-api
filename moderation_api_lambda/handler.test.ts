import { lambdaHandler } from './handler';
import * as fs from 'fs';
import * as Papa from 'papaparse';
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as path from 'path';
import '@jest/globals';

interface TestCase {
    message: string;
    result: 'TN' | 'FN' | 'TP' | 'FP';
}

interface TestResult {
    message: string;
    expected: string;
    actual: string;
    passed: boolean;
    details?: {
        flagged_type?: string;
        probability?: number;
    };
}

const RESULT_MAPPING: Record<'TN' | 'FN' | 'TP' | 'FP', number> = {
    'TN': 1, // True Negative: Should pass moderation
    'FN': 0, // False Negative: Should be blocked
    'TP': 0, // True Positive: Should be blocked
    'FP': 1  // False Positive: Should pass moderation
};

describe('Content Moderation Tests', () => {
    let testCases: TestCase[] = [];

    beforeAll(() => {
        console.log('📚 Loading test cases from CSV...');
        try {
            // Read and parse the CSV file
            const csvPath = path.join(__dirname, '../test_cases.csv');
            console.log(`🔍 Reading file from: ${csvPath}`);
            
            const fileContent = fs.readFileSync(csvPath, 'utf-8');
            console.log('📄 File content loaded successfully!');
            
            testCases = Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                delimiter: ';'
            }).data as TestCase[];
            
            testCases = testCases.slice(0, 100)
            
            console.log(`✅ Successfully parsed ${testCases.length} test cases`);
            console.log('🔍 First test case preview:', {
                message: testCases[0]?.message.substring(0, 50) + '...',
                expected: testCases[0]?.result
            });
        } catch (error) {
            console.error('❌ Error loading test cases:', error);
            throw error;
        }
    });

    test('Should correctly moderate all test cases', async () => {
        console.log('\n🚀 Starting tests with', testCases.length, 'cases...');
        const results: TestResult[] = [];
        let allBatchResults: TestResult[] = [];

        const batchSize = 10;
        for (let i = 0; i < testCases.length; i += batchSize) {
            const batch = testCases.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (testCase) => {
                const event = {
                    body: JSON.stringify({ message: testCase.message }),
                    headers: {},
                    multiValueHeaders: {},
                    httpMethod: 'POST',
                    isBase64Encoded: false,
                    path: '/moderate',
                    pathParameters: null,
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any,
                    resource: ''
                } as APIGatewayProxyEvent;

                const response = await lambdaHandler(event);
                const result = JSON.parse(response.body);

                const expectedOutcome = RESULT_MAPPING[testCase.result] === 0 ? 'block' : 'pass';

                return {
                    message: testCase.message,
                    expected: expectedOutcome,
                    actual: result.is_flagged ? 'block' : 'pass',
                    passed: (expectedOutcome === 'block' && result.is_flagged) || 
                           (expectedOutcome === 'pass' && !result.is_flagged),
                    details: result.is_flagged ? {
                        flagged_type: result.flagged_type,
                        probability: result.probability
                    } : undefined
                };
            }));

            allBatchResults = [...allBatchResults, ...batchResults];

            // Log batch summary
            const passedCount = batchResults.filter(r => r.passed).length;
            const failedCount = batchResults.length - passedCount;
            console.log(`\n📊 Batch ${Math.floor(i / batchSize) + 1} Results:`);
            console.log(`✅ Passed: ${passedCount}`);
            console.log(`❌ Failed: ${failedCount}`);

            // Add a small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Calculate final results
        const totalPassed = allBatchResults.filter(r => r.passed).length;
        const totalFailed = allBatchResults.length - totalPassed;
        const passRate = (totalPassed / allBatchResults.length) * 100;

        // Log complete results table for all tests
        console.log('\n📋 Complete Test Results:');
        console.table(allBatchResults.map(r => ({
            Message: r.message,
            Expected: r.expected,
            Actual: r.actual,
            Passed: r.passed ? '✅' : '❌',
            'Flagged Type': r.details?.flagged_type || 'N/A',
            Probability: r.details?.probability?.toFixed(3) || 'N/A'
        })));

        // Log final summary
        console.log('\n📊 Final Results Summary:');
        console.table({
            'Total Tests': allBatchResults.length,
            'Passed Tests': totalPassed,
            'Failed Tests': totalFailed,
            'Pass Rate (%)': passRate.toFixed(2)
        });

        // Assert overall performance
        expect(passRate).toBeGreaterThan(80); // Expecting at least 80% accuracy
    }, 30000 * 10); // Increased timeout to 30 seconds
});
