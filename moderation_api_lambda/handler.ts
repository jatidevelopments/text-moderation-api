import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { OpenAIApi, Configuration } from 'openai';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// API Configuration Constants
if (!process.env.CUSTOM_MODEL_ENDPOINT || !process.env.CUSTOM_MODEL_AUTH_TOKEN || !process.env.OPENAI_API_KEY || !process.env.SLACK_WEBHOOK_URL) {
    throw new Error('Missing required environment variables: CUSTOM_MODEL_ENDPOINT or CUSTOM_MODEL_AUTH_TOKEN or OPENAI_API_KEY or SLACK_WEBHOOK_URL');
}

const CUSTOM_MODEL_ENDPOINT = process.env.CUSTOM_MODEL_ENDPOINT;
const CUSTOM_MODEL_AUTH_TOKEN = process.env.CUSTOM_MODEL_AUTH_TOKEN;
const MODERATION_THRESHOLD = 0.60;
const S3_LABEL = 'S3';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// Interface definitions
interface CustomModelPrediction {
    label: string; // e.g "S3"
    score: number; // e.g "0.80"
}

interface HealthCheckResponse {
    status: 'ok' | 'error';
    message: string;
    timestamp: string;
}

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Define logging levels for colored output
const INFO_COLOR = '\x1b[36m%s\x1b[0m';
const WARNING_COLOR = '\x1b[33m%s\x1b[0m';
const ERROR_COLOR = '\x1b[31m%s\x1b[0m';

// Regex for detecting sensitive zoophilia and coprophilia terms
const SENSITIVE_CONTENT_REGEX = /\b(zoophilia|coprophilia|coprophagia|scat[\s_-]?fetish|copro[\s_-]?fetish|feces[\s_-]?fetish|excrement[\s_-]?fetish|scat[\s_-]?play|copro[\s_-]?play|feces[\s_-]?play|excrement[\s_-]?play|feces[\s_-]?eating|excrement[\s_-]?eating|feces[\s_-]?consumption|excrement[\s_-]?consumption)\b|\b(zoophilia|zoophile|zoosexual|zoophilic|beast[\s_-]?sex|animal[\s_-]?sex|animal[\s_-]?rape|animal[\s_-]?intercourse|sexual[\s_-]?acts?[\s_-]?with[\s_-]?animals?|sexual[\s_-]?contact[\s_-]?with[\s_-]?animals?|animal[\s_-]?porn|zoo[\s_-]?porn|beast[\s_-]?porn|zoosexual[\s_-]?fetish|animal[\s_-]?fetish)\b/i;

// Regex for detecting underage or child references
const UNDERAGE_CONTENT_REGEX = /\b(child|pedo|raped|underage|infant|toddler|preadolescent|juvenile|preteen|adolescent|young[\s-]?one|youngster|0[\s-]?(year[\s-]?old|y[\s/]o)|1[\s-]?(year[\s-]?old|y[\s/]o)|2[\s-]?(year[\s-]?old|y[\s/]o)|3[\s-]?(year[\s-]?old|y[\s/]o)|4[\s-]?(year[\s-]?old|y[\s/]o)|5[\s-]?(year[\s-]?old|y[\s/]o)|6[\s-]?(year[\s-]?old|y[\s/]o)|7[\s-]?(year[\s-]?old|y[\s/]o)|8[\s-]?(year[\s-]?old|y[\s/]o)|9[\s-]?(year[\s-]?old|y[\s/]o)|10[\s-]?(year[\s-]?old|y[\s/]o)|11[\s-]?(year[\s-]?old|y[\s/]o)|12[\s-]?(year[\s-]?old|y[\s/]o)|13[\s-]?(year[\s-]?old|y[\s/]o)|14[\s-]?(year[\s-]?old|y[\s/]o)|15[\s-]?(year[\s-]?old|y[\s/]o)|16[\s-]?(year[\s-]?old|y[\s/]o)|17[\s-]?(year[\s-]?old|y[\s/]o))\b/i;

// Function to send formatted messages to Slack
async function sendSlackNotification(title: string, details: Record<string, any>, type: 'warning' | 'info' = 'info'): Promise<void> {
    if (!SLACK_WEBHOOK_URL) {
        console.log(WARNING_COLOR, 'Slack webhook URL not configured, skipping notification');
        return;
    }

    const emoji = type === 'warning' ? '🚨' : 'ℹ️';
    const color = type === 'warning' ? '#ff0000' : '#36a64f';

    // Create formatted fields from details object
    const fields = Object.entries(details).map(([key, value]) => ({
        type: 'mrkdwn',
        text: `*${key}:*\n${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`
    }));

    const blocks = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: `${emoji} ${title}`,
                emoji: true
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'section',
            fields: fields
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `*Timestamp:* ${new Date().toISOString()}`
                }
            ]
        }
    ];

    try {
        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                blocks,
                color
            })
        });

        if (!response.ok) {
            console.error(ERROR_COLOR, `Failed to send Slack notification: ${response.statusText}`);
        }
    } catch (error) {
        console.error(ERROR_COLOR, `Error sending Slack notification: ${error}`);
    }
}

function replaceFamilyKeywords(text: string): string {
    const familyKeywords = [
        'mom', 'mother', 'mum', 'mama', 'mommy', 'momy', 'mumy', 'mummy', 'momma', 'momm', 'mumzy',
        'dad', 'father', 'papa', 'daddy', 'dady', 'pappy', 'dadd', 'dada', 'fater', 'faher',
        'daughter', 'son', 'dauter', 'sunn','daugther',"daughtr", "daugter", "dauter", "dauther", 
        "daugther", "doughtor", "dughter", "daughteer", "daugthter",
        'sister', 'sis', 'sissy', 'sist',
        "sistr", "siser", "siste", "sistter",  "sistor", "sistur", "sistir", "sisterr",
        'brother', 'bro', 'bruv', 'brther',
        "brothr", "broter",  "broher", "brohter", "brothre", "brotther", "brothur", "brothir",
        "fater", "fathr", "fathre", "fatherr", "fatther", "fathur", "fathir", "fathar",
        'aunt', 'auntie', 'uncle', 'ant', 'untie',
        'cousin', 'niece', 'nephew', 'cusin', 'neice', 'nefew',
        'grandma', 'grandmother', 'granny', 'nana', 'granma', 'gramma',
        'grandpa', 'grandfather', 'gramps', 'papa', 'granpa', 'grampa',
        'family', 'families', 'parent', 'parents', 'famly', 'parrent',
        'girl','boy', "teen", "teenager", "teenie",
    ];
    
    let modifiedText = text;
    for (const keyword of familyKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        modifiedText = modifiedText.replace(regex, 'lover');
    }
    return modifiedText;
}

// Call the OpenAI Moderation API function for additional checks
async function checkOpenAIModeration(content: string): Promise<any> {
    try {

    const response = await openai.createModeration({
        model: 'omni-moderation-latest',
        input: replaceFamilyKeywords(content),
    });

    // Log the moderation API response
    const result = response.data.results[0];

    console.log({result})

    const minorsScore = result.category_scores['sexual/minors'];
    const hasMinorsContent = result.categories['sexual/minors'];
    
    if (hasMinorsContent) {
        console.log(WARNING_COLOR, `[CONTENT BLOCKED] OpenAI Moderation blocked content: "${content}" (sexual/minors score: ${minorsScore})`);
        await sendSlackNotification('OpenAI Moderation - might need to be blocked', {
            'Content': content,
            'Sexual/Minors Score': minorsScore,
            'Categories': result.category_scores
        }, 'info');
    } else {
        console.log(INFO_COLOR, `[MESSAGE PASSED] OpenAI Moderation passed content: "${content}" (sexual/minors score: ${minorsScore})`);
    }

    console.log({result})

    return {
        ...result,
        flagged: hasMinorsContent,  // Only consider it flagged if it has sexual/minors content
        sexual_minors_score: minorsScore
    };

    } catch (error) {
        console.error(ERROR_COLOR, `Error - OpenAI Moderation API: ${error.message || String(error)}`);
        
        return {
            isError: true,
            flagged: false,
            categories: {},
            category_scores: {}
        };
    }
}

// Call the custom moderation API endpoint
async function checkCustomModeration(content: string): Promise<any> {
    try {
    const response = await fetch(CUSTOM_MODEL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${CUSTOM_MODEL_AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: replaceFamilyKeywords(content)
        })
    });

    const [prediction] = await response.json() as CustomModelPrediction[];

    console.log({prediction})

    const score = prediction?.score ?? 0;
    const isS3Label = prediction?.label === S3_LABEL;
    const isBlocked = isS3Label && score >= MODERATION_THRESHOLD;
    
    if (isBlocked) {
        console.log(WARNING_COLOR, `[CONTENT BLOCKED] Custom Moderation blocked S3 content: "${content}" with score: ${score}`);
        await sendSlackNotification('Custom Moderation - might need to be blocked', {
            'Content': content,
            'Score': score,
            'Label': prediction?.label,
            'Status': 'Blocked'
        }, 'info');
    } else if (isS3Label) {
        console.log(INFO_COLOR, `[MESSAGE PASSED] Custom Moderation passed S3 content: "${content}" with score: ${score} (below threshold)`);
        await sendSlackNotification('Custom Moderation - passed but has S3 content', {
            'Content': content,
            'Score': score,
            'Label': prediction?.label,
            'Status': 'Passed (below threshold)'
        }, 'info');
    } else {
        console.log(INFO_COLOR, `[MESSAGE PASSED] Custom Moderation passed non-S3 content: "${content}" with label: ${prediction?.label}, score: ${score}`);
    }
    
    return {
        flagged: isBlocked,
        score: score,
        label: prediction?.label ?? ''
    };

    } catch (error) {
        console.error(ERROR_COLOR, `Error - Custom Moderation API: ${error.message || String(error)}`);

        return {
            isError: true,
            flagged: false,
            score: 0,
            label: ''
        };
    }
}

// Lambda handler function
export const lambdaHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log(INFO_COLOR, `Received event: ${JSON.stringify(event)}`);

    try {
        // Parse the input message from the event body
        let message: string | undefined;
        try {
            const body = JSON.parse(event.body || '{}');

            // Check if this is a health check request
            if (body.health_check) {
                const healthResponse: HealthCheckResponse = {
                    status: 'ok',
                    message: 'Text moderation API is operational',
                    timestamp: new Date().toISOString(),
                };
                return {
                    statusCode: 200,
                    body: JSON.stringify(healthResponse)
                };
            }

            message = body.message || body.inputs;
            
            if (!message) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'No message provided in the request body',
                        is_flagged: false,
                    }),
                };
            }
        } catch (error) {
            console.error(ERROR_COLOR, `Error parsing request body: ${error}`);
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Invalid request body',
                    is_flagged: false,
                }),
            };
        }

        // Check for underage content before any transformations
        const hasUnderage = UNDERAGE_CONTENT_REGEX.test(message);
        console.log(INFO_COLOR, `Checking for underage content in: "${message}" - Result: ${hasUnderage}`);

        // Check for sensitive content using regex for Zoophilia and Coprophilia
        if (SENSITIVE_CONTENT_REGEX.test(message)) {
            console.log(WARNING_COLOR, `Sensitive content detected via regex: ${message}`);
            await sendSlackNotification('Zoophilia and Coprophilia Regex Detection - Final Decision', {
                'Content': message,
                'Type': 'Sensitive Content (Extended)',
                'Pattern': 'SENSITIVE_CONTENT_REGEX'
            }, 'warning');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'High-risk content detected',
                    is_flagged: true,
                    flagged_type: 'sensitive_content_via_regex_match',
                    probability: 1,
                    details: ['sensitive_content'],
                }),
            };
        }

        // Check with OpenAI for additional insights
        const openAIResult = await checkOpenAIModeration(message);
        console.log(INFO_COLOR, `OpenAI moderation result: ${JSON.stringify(openAIResult)}`);

        // Block immediately if OpenAI confidence is very high (>98%) and no error
        if (!openAIResult.isError && openAIResult.category_scores?.['sexual/minors'] > 0.98) {
            console.log(WARNING_COLOR, `Blocking content due to high OpenAI confidence: ${openAIResult.category_scores['sexual/minors']}`);
            await sendSlackNotification('Content Moderation - High Confidence Block', {
                'Content': message,
                'Decision': 'Blocked',
                'Reason': 'High OpenAI confidence score',
                'OpenAI Sexual/Minors Score': openAIResult.category_scores['sexual/minors']
            }, 'warning');

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message,
                    is_flagged: true,
                    probability: openAIResult.category_scores['sexual/minors'],
                    flagged_type: 'sexual/minors',
                    details: {
                        openai_result: openAIResult,
                        reason: 'High OpenAI confidence score'
                    }
                })
            };
        }

        // Only continue if the content is not flagged by OpenAI to boost performance and reduce costs
        if (!openAIResult.flagged && !openAIResult.isError && !hasUnderage) {
            console.log(INFO_COLOR, `No content flagged by OpenAI Moderation API - Skipping further checks`);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'No content flagged by OpenAI Moderation API',
                    is_flagged: false,
                }),
            };
        }

        // After check with our custom moderation API
        const customResult = await checkCustomModeration(message);
        console.log(INFO_COLOR, `Custom moderation result: ${JSON.stringify(customResult)}`);

        // Check if content should be blocked based on both APIs flagging the content
        let isBlocked = customResult.flagged && openAIResult.flagged || customResult.flagged && hasUnderage;
        let blockReason = isBlocked ? 'Both APIs flagged content' : 'No content flagged';

        if(customResult.isError || openAIResult.isError) {
            console.log(INFO_COLOR, `One or both APIs not available: ${JSON.stringify(customResult)}`);

            if(!customResult.isError && openAIResult.isError) {
                isBlocked = hasUnderage;
                blockReason = 'Custom API flagged or regex flagged content due to OpenAI not available';

                console.log(INFO_COLOR, `Fall back due OpenAI Moderation not available: ${JSON.stringify(openAIResult)}`);

                if(isBlocked)
                    await sendSlackNotification('Fall back due OpenAI Moderation not available', {
                        'Content': message,
                        'Decision': 'Blocked',
                        'Reason': 'Custom API flagged content',
                        'Custom API Score': customResult.score,
                        "Custom API Label": customResult.label,
                        'OpenAI Sexual/Minors Score': openAIResult.category_scores?.['sexual/minors']
                    }, 'warning');
            }

            if(customResult.isError && !openAIResult.isError) {
                isBlocked = openAIResult.flagged;
                blockReason = 'OpenAI flagged content due to Custom Moderation not available';

                console.log(INFO_COLOR, `Fall back due Custom Moderation not available: ${JSON.stringify(customResult)}`);

                if(isBlocked) 
                    await sendSlackNotification('Fall back due Custom Moderation not available', {
                        'Content': message,
                        'Decision': 'Blocked',
                        'Reason': 'OpenAI flagged content',
                        'Custom API Score': customResult.score,
                        "Custom API Label": customResult.label,
                        'OpenAI Sexual/Minors Score': openAIResult.category_scores?.['sexual/minors']
                    }, 'warning');
            }

            if(customResult.isError && openAIResult.isError) {
                isBlocked = hasUnderage;
                blockReason = 'Underage regex flagged content due to both APIs not available';

                console.log(INFO_COLOR, `Fall back due both APIs not available: ${JSON.stringify(customResult)}`);

                if(isBlocked)
                    await sendSlackNotification('Fall back due both APIs not available, using regex', {
                        'Content': message,
                        'Decision': 'Blocked',
                        'Reason': 'Underage content',
                        'Custom API Score': customResult.score,
                        "Custom API Label": customResult.label,
                        'OpenAI Sexual/Minors Score': openAIResult.category_scores?.['sexual/minors']
                    }, 'warning');
            }
        }

    

        if (isBlocked) {
            await sendSlackNotification('Content Moderation - Final Decision', {
                'Content': message,
                'Decision': 'Blocked',
                'Reason': blockReason,
                'Custom API Score': customResult.score,
                "Custom API Label": customResult.label,
                'OpenAI Sexual/Minors Score': openAIResult.category_scores?.['sexual/minors']
            }, 'warning');
        }

        // Return response based on combined results
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: isBlocked ? 'High-risk content detected' : 'Content approved',
                is_flagged: isBlocked,
                custom_score: customResult.score,
                custom_flagged: customResult.flagged,
                openai_flagged: openAIResult.flagged,
                openai_sexual_minors_score: openAIResult.category_scores?.['sexual/minors'],
                block_reason: blockReason,
                details: isBlocked ? [
                    `Custom API Score: ${customResult.score}`,
                    `OpenAI Sexual/Minors Score: ${openAIResult.category_scores?.['sexual/minors']}`
                ].filter(Boolean) : undefined,
            }),
        };

    } catch (error) {
        console.error(ERROR_COLOR, `Error - Model Inference: ${error}`);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error during content moderation',
                is_flagged: false,
            }),
        };
    }
};
