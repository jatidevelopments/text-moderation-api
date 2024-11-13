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
var SENSITIVE_CONTENT_REGEX = /\b(coprophilia|copro|feces|excrement|scat|fecal|poop|manure|dung|defecation|feces[\s_-]?(play|fetish|matter|ingestion|consumption)|scat[\s_-]?fetish|coproplay[\s_-]?fetish|poop[\s_-]?fetish[\s_-]?play|poop[\s_-]?play|scat[\s_-]?play|excrement[\s_-]?play|excrement[\s_-]?fetish)\b|\b(zoophilia|bestiality|zoosexual|bestial|zoophilic|sexual[\s_-]?acts[\s_-]?with[\s_-]?animals|animal[\s_-]?(sex|mating|copulation|intercourse|relations|abuse|get[\s_-]?(fucked|sex|sexual|intercourse)|beast[\s_-]?sex|bestial[\s_-]?acts|bestial[\s_-]?behavior|sexual[\s_-]?contact[\s_-]?with[\s_-]?animals|animal[\s_-]?abuse|animal[\s_-]?porn|zoo[\s_-]?porn|beast[\s_-]?porn|zoosexual[\s_-]?fetish|zoosexuality))\b|\b(dog|cat|horse|sheep|goat|cow|pig|donkey|chicken|duck|bird|fish|deer|rabbit|rat|mouse|squirrel|hamster|gerbil|guinea[\s_-]?pig|camel|llama|alpaca|monkey|ape|gorilla|orangutan|baboon|lion|tiger|leopard|panther|elephant|zebra|bear|wolf|fox|coyote|otter|ferret|weasel|skunk|racoon|badger|moose|elk|buffalo|bison|whale|dolphin|porpoise|shark|octopus|squid|lobster|crab|turtle|tortoise|frog|toad|lizard|snake|iguana|gecko|crocodile|alligator|kangaroo|koala|platypus|wombat|opossum|hedgehog|bat|mole|beaver|pigeon|crow|raven|seagull|eagle|hawk|falcon|owl|vulture|parrot|peacock|flamingo|ostrich|emu|quail|sparrow|swallow|bee|wasp|ant|termite|spider|scorpion|cockroach|mosquito|fly|worm|slug|snail|mammal|rodent|canine|feline|equine|bovine|avian|reptile|amphibian|fish|insect)\b/i;
var SENSITIVE_CONTENT_REGEX_EXTENDED = /\b(coprophilia|c[o0]pr[o0]|fec[e3]s|[e3]xcrement|scat|f[e3]cal|sh[i1]t|p[o0]{2}p|manure|d[u4]ng|d[e3]fecat[i1][o0]n|f[e3]c[e3]s[\s_-]?(play|fet[i1]sh|matter|[i1]ng[e3]st[i1][o0]n|c[o0]nsumpt[i1][o0]n)|scat[\s_-]?fet[i1]sh|c[o0]pr[o0]play|sh[i1]t[\s_-]?fet[i1]sh|p[o0]{2}p[\s_-]?fet[i1]sh|sh[i1]t[\s_-]?play|p[o0]{2}p[\s_-]?play|scat[\s_-]?play|[e3]xcrement[\s_-]?play|[e3]xcrement[\s_-]?fet[i1]sh)\b|\b(z[o0][o0]ph[i1]l[i1]a|b[e3]st[i1]al[i1]ty|z[o0][o0]s[e3]xual|b[e3]st[i1]al|z[o0][o0]ph[i1]l[i1]c|s[e3]xual[\s_-]?acts[\s_-]?with[\s_-]?an[i1]mals|an[i1]mal[\s_-]?(s[e3]x|mat[i1]ng|c[o0]pulat[i1][o0]n|[i1]nt[e3]rc[o0]urs[e3]|r[e3]lat[i1][o0]ns|abus[e3]|g[e3]t[\s_-]?(f[u4]ck[e3]d|s[e3]x|s[e3]xual|[i1]nt[e3]rc[o0]urs[e3])|b[e3]ast[\s_-]?s[e3]x|b[e3]st[i1]al[\s_-]?acts|b[e3]st[i1]al[\s_-]?b[e3]hav[i1][o0]r|s[e3]xual[\s_-]?c[o0]ntact[\s_-]?with[\s_-]?an[i1]mals|an[i1]mal[\s_-]?abus[e3]|an[i1]mal[\s_-]?p[o0]rn|z[o0][o0][\s_-]?p[o0]rn|b[e3]ast[\s_-]?p[o0]rn|z[o0][o0]s[e3]xual[\s_-]?fet[i1]sh|z[o0][o0]s[e3]xuality))\b|\b(d[o0]g|c[a4]t|h[o0]rs[e3]|sh[e3][e3]p|g[o0]at|c[o0]w|p[i1]g|d[o0]nk[e3]y|ch[i1]ck[e3]n|d[u4]ck|b[i1]rd|f[i1]sh|d[e3][e3]r|r[a4]bb[i1]t|r[a4]t|m[o0]us[e3]|squ[i1]rr[e3]l|h[a4]mst[e3]r|g[e3]rb[i1]l|gu[i1]n[e3][a4][\s_-]?p[i1]g|c[a4]m[e3]l|ll[a4]ma|a4]lp[a4]ca|m[o0]nk[e3]y|[a4]p[e3]|g[o0]r[i1]lla|[o0]rang[u4]tan|b[a4]b[o0][o0]n|l[i1][o0]n|t[i1]g[e3]r|l[e3][o0]pard|p[a4]nth[e3]r|[e3]l[e3]phant|z[e3]bra|b[e3][a4]r|w[o0]lf|f[o0]x|c[o0]y[o0]t[e3]|[o0]tt[e3]r|f[e3]rr[e3]t|w[e3][a4]s[e3]l|sk[u4]nk|rac[c0]on|b[a4]dg[e3]r|m[o0][o0]s[e3]|[e3]lk|buff[a4]l[o0]|b[i1]s[o0]n|wh[a4]l[e3]|d[o0]lph[i1]n|p[o0]rp[o0][i1]s[e3]|sh[a4]rk|[o0]ct[o0]p[u4]s|sq[u4][i1]d|l[o0]bst[e3]r|cr[a4]b|t[u4]rtl[e3]|t[o0]rt[o0][i1]s[e3]|fr[o0]g|t[o0][a4]d|l[i1]z[a4]rd|sn[a4]k[e3]|[i1]gu[a4]na|g[e3]ck[o0]|cr[o0]c[o0]d[i1]l[e3]|[a4]ll[i1]g[a4]t[o0]r|k[a4]ng[a4]r[o0][o0]|k[o0][a4]la|pl[a4]typ[u4]s|w[o0]mb[a4]t|[o0]p[o0]ss[u4]m|h[e3]dgh[o0]g|b[a4]t|m[o0]l[e3]|b[e3][a4]v[e3]r|p[i1]g[e3][o0]n|cr[o0]w|r[a4]v[e3]n|s[e3][a4]g[u4]ll|[e3][a4]gl[e3]|h[a4]wk|f[a4]lc[o0]n|[o0]wl|v[u4]lt[u4]r[e3]|p[a4]rr[o0]t|p[e3][a4]c[o0]ck|fl[a4]m[i1]ng[o0]|[o0]str[i1]ch|[e3]m[u4]|q[u4][a4][i1]l|sp[a4]rr[o0]w|sw[a4]ll[o0]w|b[e3][e3]|w[a4]sp|[a4]nt|t[e3]rm[i1]t[e3]|sp[i1]d[e3]r|sc[o0]rp[i1][o0]n|c[o0]ckr[o0][a4]ch|m[o0]squ[i1]t[o0]|fl[i1]|w[o0]rm|sl[u4]g|sn[a4][i1]l|m[a4]mm[a4]l|r[o0]d[e3]nt|c[a4]n[i1]n[e3]|f[e3]l[i1]n[e3]|[e3]qu[i1]n[e3]|b[o0]v[i1]n[e3]|[a4]v[i1][a4]n|r[e3]pt[i1]l[e3]|[a4]mph[i1]b[i1][a4]n|f[i1]sh|[i1]ns[e3]ct)\b/i;
// Regex for detecting underage or child references
var UNDERAGE_CONTENT_REGEX = /\b(child|children|teenager|teenagers|teen|underage|minors?|infant|toddler|preadolescent|young adult|juvenile|baby|babies|preteen|adolescent|kid|kiddy|kiddo|young[\s-]?one|youngster|little[\s-]?one|little[\s-]?angel|little[\s-]?boy|little[\s-]?girl|0[\s-]?(year[\s-]?old|y[\s/]o)|1[\s-]?(year[\s-]?old|y[\s/]o)|2[\s-]?(year[\s-]?old|y[\s/]o)|3[\s-]?(year[\s-]?old|y[\s/]o)|4[\s-]?(year[\s-]?old|y[\s/]o)|5[\s-]?(year[\s-]?old|y[\s/]o)|6[\s-]?(year[\s-]?old|y[\s/]o)|7[\s-]?(year[\s-]?old|y[\s/]o)|8[\s-]?(year[\s-]?old|y[\s/]o)|9[\s-]?(year[\s-]?old|y[\s/]o)|10[\s-]?(year[\s-]?old|y[\s/]o)|11[\s-]?(year[\s-]?old|y[\s/]o)|12[\s-]?(year[\s-]?old|y[\s/]o)|13[\s-]?(year[\s-]?old|y[\s/]o)|14[\s-]?(year[\s-]?old|y[\s/]o)|15[\s-]?(year[\s-]?old|y[\s/]o)|16[\s-]?(year[\s-]?old|y[\s/]o)|17[\s-]?(year[\s-]?old|y[\s/]o))\b/i;
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
                if (SENSITIVE_CONTENT_REGEX.test(message) || SENSITIVE_CONTENT_REGEX_EXTENDED.test(message)) {
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
                // Check if OpenAI flagged "sexual/minors" or if "sexual" category is flagged with underage content
                if (categories['sexual/minors'] || (categories['sexual'] && UNDERAGE_CONTENT_REGEX.test(message))) {
                    return [2 /*return*/, {
                            statusCode: 200,
                            body: JSON.stringify({
                                message: 'High-risk content detected',
                                is_flagged: true,
                                flagged_type: 'sexual_with_underage_reference',
                                probability: 1,
                                details: ['sexual/minors', 'underage_reference'],
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