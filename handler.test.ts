import { lambdaHandler } from './handler';
import * as fs from 'fs';
import * as Papa from 'papaparse';
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as path from 'path';
import '@jest/globals';

interface TestCase {
    message: string;
    result: number;
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

describe('Content Moderation Tests', () => {
    let testCases: TestCase[] = [];

    beforeAll(() => {
        console.log('📚 Loading test cases from CSV...');
        try {
            // Read and parse the CSV file
            const csvPath = path.join(__dirname, 'test_cases.csv');
            console.log(`🔍 Reading file from: ${csvPath}`);
            
            const fileContent = fs.readFileSync(csvPath, 'utf-8');
            console.log('📄 File content loaded successfully!');
            
            testCases = Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                delimiter: ';'
            }).data as TestCase[];
            
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
                    requestContext: {},
                    resource: ''
                } as APIGatewayProxyEvent;

                const response = await lambdaHandler(event);
                const result = JSON.parse(response.body);

                const expectedOutcome = testCase.result === 0 ? 'block' : 'pass';

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
            results.push(...batchResults);
        }

        // Final test assertions
        const failedTests = results.filter(r => !r.passed);
        
        // Log summary using console.table
        console.log('\n📊 Test Results Summary:');
        console.table(results.map(r => ({
            Message: r.message.substring(0, 50) + '...',
            Expected: r.expected,
            Actual: r.actual,
            Passed: r.passed ? '✅' : '❌',
            'Flagged Type': r.details?.flagged_type || 'N/A',
            Probability: r.details?.probability?.toFixed(3) || 'N/A'
        })));

        // Log failed tests details
        if (failedTests.length > 0) {
            console.log('\n❌ Failed Tests Details:');
            console.table(failedTests.map(r => ({
                Message: r.message,
                Expected: r.expected,
                Actual: r.actual,
                'Flagged Type': r.details?.flagged_type || 'N/A',
                Probability: r.details?.probability?.toFixed(3) || 'N/A'
            })));
        }

        console.log('\n📊 Test Summary:');
        const totalTests = results.length;
        const passedTests = results.filter(result => result.passed).length;
        const failedTestsCount = totalTests - passedTests;
        const accuracy = ((passedTests / totalTests) * 100).toFixed(2);

        console.table({
            'Total Tests': totalTests,
            'Passed Tests': passedTests,
            'Failed Tests': failedTestsCount,
            'Accuracy (%)': accuracy
        });

        expect(failedTestsCount).toBe(0);
    }, 60000); // Increased timeout for all tests

    // Test single request
    it('should correctly handle a single moderation request', async () => {
        const event: APIGatewayProxyEvent = {
            body: JSON.stringify({
                message: "I see they're not stopping, i think they are thirsty for animal sex. I will start fucking Anita hard,"
            }),
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
        };

        const response = await lambdaHandler(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(body.is_flagged).toBe(true);
        expect(body.message).toBe('High-risk content detected');
    });
});
