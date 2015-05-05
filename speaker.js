/* eslint-env node */

"use strict";

var _ = require("underscore");

// high-level api

// consoleRead("this is some text")
// prints using console.log

// first feeds through lexer
// then feeds through sylloblizer, if there is one, to further subdivide words

// then adds pause tokens to the token stream

// myReader.readTokens("this is some text")
// will give the processed reading token stream, which can then be processed

var WORD = "WORD",
  SPACE = "SPACE",
  NEWLINE = "NEWLINE",
  SYLLABLE = "SYLLABLE",
  PERIOD = "PERIOD",
  COMMA = "COMMA",
  LETTER = "LETTER";

// A syllabizer function takes a word token ([WORD, "contents"]) and returns
// an array of syllable tokens
var defaultSyllablizer = function(wordToken) {
  return [[SYLLABLE, wordToken[1]]];
};

var timingTable = {
  SYLLABLE: 4,
  SPACE: 2,
  COMMA: 5,
  PERIOD: 10
};

// A timer function takes a token and returns how much time it should take
var defaultTimer = function(token) {
  if (token[0] === SYLLABLE) {
    return timingTable[SYLLABLE] + (token[1].length > 5 ? (token[1].length - 5) / 2 : 0);
  }
  return timingTable[token[0]];
};

function Speaker() {
  this.syllabizer = defaultSyllablizer;
  this.timer = defaultTimer;
  this.letterTiming = 100;
}

Speaker.prototype.splitOnSpaces = function(inputString) {
  var tokens = [];

  var currentWord = "";

  var flushWord = function() {
    tokens.push([WORD, currentWord]);
    currentWord = "";
  };

  // don't record spaces at the start of the input
  var lastSawSpace = true;

  for (var i = 0; i < inputString.length; i++) {
    if (inputString[i].match(/[\w\.,]/)) {
      currentWord += inputString[i];
      lastSawSpace = false;
    } else if (inputString[i] === "\n") {
      flushWord();
      tokens.push([NEWLINE, inputString[i]]);
      lastSawSpace = true;
    } else if (inputString[i].match(/\s/)) {
      if (!lastSawSpace) {
        flushWord();
        tokens.push([SPACE, inputString[i]]);
        lastSawSpace = true;
      }
    } else {
      throw "Unrecognized token";
    }
  }
  if (currentWord.length) {
    flushWord();
  }

  return tokens;
};

Speaker.prototype.splitOutPunctuation = function(wordTokens) {
  // Only look at the end of words
  var newTokens = [];

  for (var i = 0; i < wordTokens.length; i++) {
    var currentToken = wordTokens[i];
    if (currentToken[0] === WORD) {
      var match = currentToken[1].match(/[\.\,]$/);
      if (match) {
        console.log("MATCH", match);
        if (match[0] === ".") {
          newTokens.push([WORD, currentToken[1].slice(0, -1)]);
          newTokens.push([PERIOD, "."]);
        } else if (match[0] === ",") {
          newTokens.push([WORD, currentToken[1].slice(0, -1)]);
          newTokens.push([COMMA, ","]);
        } else {
          throw "unrecognized punctuation";
        }
      } else {
        newTokens.push(currentToken);
      }
    } else {
      newTokens.push(currentToken);
    }
  }
  return newTokens;
};

Speaker.prototype.syllablizeWords = function(tokens) {
  return _(tokens).chain().map(function(token) {
    if (token[0] === WORD) {
      return this.syllabizer(token);
    } else {
      return [token];
    }
  }.bind(this)).flatten(true).value();
};

Speaker.prototype.literizeTokens = function(tokens) {
  return _(tokens).chain().map(function(token) {
    if (token[0] === SYLLABLE) {
      return _.map(token[1], function(letter) {
        return [LETTER, letter, token[2] / token[1].length];
      });
    } else {
      return [token];
    }
  }).flatten(true).value();
};

Speaker.prototype.timeAugmentTokens = function(tokens) {
  return _.map(tokens, function(token) {
    return [token[0], token[1], this.timer(token)];
  }.bind(this));
};

// readTokens produces a stream of tokens. possible tokens are:
// WORD
// SPACE (this only exists between words which are not separated by punctuation)
// SYLLABLE
// PERIOD
// COMMA
Speaker.prototype.makeKeyStream = function(inputString) {
  var tokenStream = this.splitOnSpaces(inputString);
  console.log("after spaces:", tokenStream);
  tokenStream = this.splitOutPunctuation(tokenStream);
  console.log("after punctuation", tokenStream);
  tokenStream = this.syllablizeWords(tokenStream);
  console.log("after syllables", tokenStream);
  tokenStream = this.timeAugmentTokens(tokenStream);
  console.log("after times", tokenStream);
  var keyStream = this.literizeTokens(tokenStream);

  return keyStream;
};

Speaker.prototype.writeKeyStream = function(keyStream, i) {
  process.stdout.write(keyStream[i][1]);
  if (i + 1 < keyStream.length) {
    setTimeout(this.writeKeyStream.bind(this), keyStream[i][2] * this.letterTiming, keyStream, i + 1);
  }
};

Speaker.prototype.consoleSpeak = function(text) {
  var keyStream = this.makeKeyStream(text);
  this.writeKeyStream(keyStream, 0);
};

module.exports = Speaker;
