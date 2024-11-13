import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { OpenAIApi, Configuration } from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Define logging levels for colored output
const INFO_COLOR = '\x1b[36m%s\x1b[0m';
const WARNING_COLOR = '\x1b[33m%s\x1b[0m';
const ERROR_COLOR = '\x1b[31m%s\x1b[0m';

// Regex for detecting sensitive zoophilia and coprophilia terms
const SENSITIVE_CONTENT_REGEX = /\b(coprophilia|copro|feces|excrement|scat|fecal|shit|poop|manure|dung|defecation|feces[\s_-]?(play|fetish|matter|ingestion|consumption)|scat[\s_-]?fetish|coproplay|shit[\s_-]?fetish|poop[\s_-]?fetish|shit[\s_-]?play|poop[\s_-]?play|scat[\s_-]?play|excrement[\s_-]?play|excrement[\s_-]?fetish)\b|\b(zoophilia|bestiality|zoosexual|bestial|zoophilic|sexual[\s_-]?acts[\s_-]?with[\s_-]?animals|animal[\s_-]?(sex|mating|copulation|intercourse|relations|abuse|get[\s_-]?(fucked|sex|sexual|intercourse)|beast[\s_-]?sex|bestial[\s_-]?acts|bestial[\s_-]?behavior|sexual[\s_-]?contact[\s_-]?with[\s_-]?animals|animal[\s_-]?abuse|animal[\s_-]?porn|zoo[\s_-]?porn|beast[\s_-]?porn|zoosexual[\s_-]?fetish|zoosexuality))\b|\b(dog|cat|horse|sheep|goat|cow|pig|donkey|chicken|duck|bird|fish|deer|rabbit|rat|mouse|squirrel|hamster|gerbil|guinea[\s_-]?pig|camel|llama|alpaca|monkey|ape|gorilla|orangutan|baboon|lion|tiger|leopard|panther|elephant|zebra|bear|wolf|fox|coyote|otter|ferret|weasel|skunk|racoon|badger|moose|elk|buffalo|bison|whale|dolphin|porpoise|shark|octopus|squid|lobster|crab|turtle|tortoise|frog|toad|lizard|snake|iguana|gecko|crocodile|alligator|kangaroo|koala|platypus|wombat|opossum|hedgehog|bat|mole|beaver|pigeon|crow|raven|seagull|eagle|hawk|falcon|owl|vulture|parrot|peacock|flamingo|ostrich|emu|quail|sparrow|swallow|bee|wasp|ant|termite|spider|scorpion|cockroach|mosquito|fly|worm|slug|snail|mammal|rodent|canine|feline|equine|bovine|avian|reptile|amphibian|fish|insect)\b/i;

// Regex for detecting underage or child references
const UNDERAGE_CONTENT_REGEX = /\b(child|children|teenager|teenagers|teen|underage|minors?|infant|toddler|preadolescent|young adult|juvenile|baby|babies|boy|girl|preteen|adolescent|14[\s-]?(year[\s-]?old|y[\s/]o)|15[\s-]?(year[\s-]?old|y[\s/]o)|16[\s-]?(year[\s-]?old|y[\s/]o)|17[\s-]?(year[\s-]?old|y[\s/]o))\b/i;

// Define a mapping for target categories with fallback if OpenAI adds more relevant categories
const targetMappings: { [key: string]: string } = {
    child_exploitation: 'sexual/minors',
};

// Call the OpenAI Moderation API function
async function checkModeration(content: string): Promise<any> {
    const response = await openai.createModeration({
        model: 'omni-moderation-latest',
        input: content,
    });

    // Log the moderation API response
    console.log(INFO_COLOR, `OpenAI Moderation API Response: ${JSON.stringify(response.data)}`);

    return response.data.results[0];
}

// Lambda handler function
export const lambdaHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log(INFO_COLOR, `Received event: ${JSON.stringify(event)}`);

    // Parse the input message from the event body
    let message: string | undefined;
    try {
        const body = JSON.parse(event.body || '{}');
        message = body.message;
    } catch (error) {
        console.error(ERROR_COLOR, `Error - JSON Decoding: ${error}`);
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON in request body.' }) };
    }

    if (!message) {
        console.warn(WARNING_COLOR, `Warning - No message provided in the request.`);
        return { statusCode: 400, body: JSON.stringify({ error: 'Message required' }) };
    }

    console.log(INFO_COLOR, `Processing message - '${message}'`);

    try {
        // Check for sensitive content using regex for Zoophilia and Coprophilia
        if (SENSITIVE_CONTENT_REGEX.test(message)) {
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

        // Call OpenAI's Moderation API
        const moderationResult = await checkModeration(message);
        const { flagged, categories, category_scores } = moderationResult;

        console.log(INFO_COLOR, `Moderation results - Flagged: ${flagged}, Categories: ${JSON.stringify(categories)}`);

        // Check for "sexual" category and underage references
        if (categories['sexual'] && UNDERAGE_CONTENT_REGEX.test(message)) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'High-risk content detected',
                    is_flagged: true,
                    flagged_type: 'sexual_with_underage_reference',
                    probability: 1,
                    details: ['sexual', 'underage_reference'],
                }),
            };
        }

        // Check for other mapped categories from OpenAI response
        const threshold = 0.8;
        let flaggedLabel: string | null = null;
        let flaggedProbability: number | null = null;

        for (const [target, openAICategory] of Object.entries(targetMappings)) {
            const score = category_scores[openAICategory];
            if (typeof score === 'number' && score > threshold) {
                flaggedLabel = target;
                flaggedProbability = score;
                console.log(INFO_COLOR, `Flagged label - ${flaggedLabel} with probability - ${flaggedProbability}`);
                break;
            }
        }

        if (flaggedLabel) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'High-risk content detected',
                    is_flagged: true,
                    flagged_type: flaggedLabel,
                    probability: flaggedProbability,
                    details: { [flaggedLabel]: categories[targetMappings[flaggedLabel]] },
                }),
            };
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Content approved',
                    is_flagged: false,
                    details: categories,
                }),
            };
        }
    } catch (error) {
        console.error(ERROR_COLOR, `Error - Model Inference: ${error}`);
        return { statusCode: 500, body: JSON.stringify({ error: 'Model inference failed.' }) };
    }
};
