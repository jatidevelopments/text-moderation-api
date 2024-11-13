"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lambdaHandler = void 0;
var openai_1 = require("openai");
var dotenv = require("dotenv");
dotenv.config();
var configuration = new openai_1.Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
var openai = new openai_1.OpenAIApi(configuration);
// Define logging levels for colored output
var INFO_COLOR = '\x1b[36m%s\x1b[0m';
var WARNING_COLOR = '\x1b[33m%s\x1b[0m';
var ERROR_COLOR = '\x1b[31m%s\x1b[0m';
// Regex for detecting sensitive zoophilia and coprophilia terms
var SENSITIVE_CONTENT_REGEX = /\b(coprophilia|copro|feces|excrement|scat|fecal|shit|poop|manure|dung|defecation|feces[\s_-]?(play|fetish|matter|ingestion|consumption)|scat[\s_-]?fetish|coproplay|shit[\s_-]?fetish|poop[\s_-]?fetish|shit[\s_-]?play|poop[\s_-]?play|scat[\s_-]?play|excrement[\s_-]?play|excrement[\s_-]?fetish)\b|\b(zoophilia|bestiality|zoosexual|bestial|zoophilic|sexual[\s_-]?acts[\s_-]?with[\s_-]?animals|animal[\s_-]?(sex|mating|copulation|intercourse|relations|abuse|get[\s_-]?(fucked|sex|sexual|intercourse)|beast[\s_-]?sex|bestial[\s_-]?acts|bestial[\s_-]?behavior|sexual[\s_-]?contact[\s_-]?with[\s_-]?animals|animal[\s_-]?abuse|animal[\s_-]?porn|zoo[\s_-]?porn|beast[\s_-]?porn|zoosexual[\s_-]?fetish|zoosexuality))\b|\b(dog|cat|horse|sheep|goat|cow|pig|donkey|chicken|duck|bird|fish|deer|rabbit|rat|mouse|squirrel|hamster|gerbil|guinea[\s_-]?pig|camel|llama|alpaca|monkey|ape|gorilla|orangutan|baboon|lion|tiger|leopard|panther|elephant|zebra|bear|wolf|fox|coyote|otter|ferret|weasel|skunk|racoon|badger|moose|elk|buffalo|bison|whale|dolphin|porpoise|shark|octopus|squid|lobster|crab|turtle|tortoise|frog|toad|lizard|snake|iguana|gecko|crocodile|alligator|kangaroo|koala|platypus|wombat|opossum|hedgehog|bat|mole|beaver|pigeon|crow|raven|seagull|eagle|hawk|falcon|owl|vulture|parrot|peacock|flamingo|ostrich|emu|quail|sparrow|swallow|bee|wasp|ant|termite|spider|scorpion|cockroach|mosquito|fly|worm|slug|snail|mammal|rodent|canine|feline|equine|bovine|avian|reptile|amphibian|fish|insect)\b/i;
// Regex for detecting underage or child references
var UNDERAGE_CONTENT_REGEX = /\b(child|children|teenager|teenagers|teen|underage|minors?|infant|toddler|preadolescent|young adult|juvenile|baby|babies|boy|girl|preteen|adolescent|14[\s-]?(year[\s-]?old|y[\s/]o)|15[\s-]?(year[\s-]?old|y[\s/]o)|16[\s-]?(year[\s-]?old|y[\s/]o)|17[\s-]?(year[\s-]?old|y[\s/]o))\b/i;
// Define a mapping for target categories with fallback if OpenAI adds more relevant categories
var targetMappings = {
    child_exploitation: 'sexual/minors',
};
// Call the OpenAI Moderation API function
function checkModeration(content) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, openai.createModeration({
                        model: 'omni-moderation-latest',
                        input: content,
                    })];
                case 1:
                    response = _a.sent();
                    // Log the moderation API response
                    console.log(INFO_COLOR, "OpenAI Moderation API Response: ".concat(JSON.stringify(response.data)));
                    return [2 /*return*/, response.data.results[0]];
            }
        });
    });
}
// Lambda handler function
var lambdaHandler = function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var message, body, moderationResult, flagged, categories, category_scores, threshold, flaggedLabel, flaggedProbability, _i, _a, _b, target, openAICategory, score, error_1;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                console.log(INFO_COLOR, "Received event: ".concat(JSON.stringify(event)));
                try {
                    body = JSON.parse(event.body || '{}');
                    message = body.message;
                }
                catch (error) {
                    console.error(ERROR_COLOR, "Error - JSON Decoding: ".concat(error));
                    return [2 /*return*/, { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON in request body.' }) }];
                }
                if (!message) {
                    console.warn(WARNING_COLOR, "Warning - No message provided in the request.");
                    return [2 /*return*/, { statusCode: 400, body: JSON.stringify({ error: 'Message required' }) }];
                }
                console.log(INFO_COLOR, "Processing message - '".concat(message, "'"));
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                // Check for sensitive content using regex for Zoophilia and Coprophilia
                if (SENSITIVE_CONTENT_REGEX.test(message)) {
                    return [2 /*return*/, {
                            statusCode: 200,
                            body: JSON.stringify({
                                message: 'High-risk content detected',
                                is_flagged: true,
                                flagged_type: 'sensitive_content_via_regex_match',
                                probability: 1,
                                details: ['sensitive_content'],
                            }),
                        }];
                }
                return [4 /*yield*/, checkModeration(message)];
            case 2:
                moderationResult = _d.sent();
                flagged = moderationResult.flagged, categories = moderationResult.categories, category_scores = moderationResult.category_scores;
                console.log(INFO_COLOR, "Moderation results - Flagged: ".concat(flagged, ", Categories: ").concat(JSON.stringify(categories)));
                // Check for "sexual" category and underage references
                if (categories['sexual'] && UNDERAGE_CONTENT_REGEX.test(message)) {
                    return [2 /*return*/, {
                            statusCode: 200,
                            body: JSON.stringify({
                                message: 'High-risk content detected',
                                is_flagged: true,
                                flagged_type: 'sexual_with_underage_reference',
                                probability: 1,
                                details: ['sexual', 'underage_reference'],
                            }),
                        }];
                }
                threshold = 0.8;
                flaggedLabel = null;
                flaggedProbability = null;
                for (_i = 0, _a = Object.entries(targetMappings); _i < _a.length; _i++) {
                    _b = _a[_i], target = _b[0], openAICategory = _b[1];
                    score = category_scores[openAICategory];
                    if (typeof score === 'number' && score > threshold) {
                        flaggedLabel = target;
                        flaggedProbability = score;
                        console.log(INFO_COLOR, "Flagged label - ".concat(flaggedLabel, " with probability - ").concat(flaggedProbability));
                        break;
                    }
                }
                if (flaggedLabel) {
                    return [2 /*return*/, {
                            statusCode: 200,
                            body: JSON.stringify({
                                message: 'High-risk content detected',
                                is_flagged: true,
                                flagged_type: flaggedLabel,
                                probability: flaggedProbability,
                                details: (_c = {}, _c[flaggedLabel] = categories[targetMappings[flaggedLabel]], _c),
                            }),
                        }];
                }
                else {
                    return [2 /*return*/, {
                            statusCode: 200,
                            body: JSON.stringify({
                                message: 'Content approved',
                                is_flagged: false,
                                details: categories,
                            }),
                        }];
                }
                return [3 /*break*/, 4];
            case 3:
                error_1 = _d.sent();
                console.error(ERROR_COLOR, "Error - Model Inference: ".concat(error_1));
                return [2 /*return*/, { statusCode: 500, body: JSON.stringify({ error: 'Model inference failed.' }) }];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.lambdaHandler = lambdaHandler;
//# sourceMappingURL=handler.js.map