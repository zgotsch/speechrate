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

function splitOnSpaces(inputString) {
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
}

function splitOutPunctuation(wordTokens) {
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
}

function syllablizeWords(tokens) {
  return _(tokens).map(function(token) {
    if (token[0] === WORD) {
      return [SYLLABLE, token[1]];
    } else {
      return token;
    }
  });
}

function literizeTokens(tokens) {
  return _(tokens).chain().map(function(token) {
    if (token[0] === SYLLABLE) {
      return _.map(token[1], function(letter) {
        return [LETTER, letter, token[2] / token[1].length];
      });
    } else {
      return [token];
    }
  }).flatten(true).value();
}

var timingTable = {
  SYLLABLE: 5,
  SPACE: 2,
  COMMA: 5,
  PERIOD: 10
};

function timeAugmentTokens(tokens) {
  return _.map(tokens, function(token) {
    return [token[0], token[1], timingTable[token[0]]];
  });
}

// readTokens produces a stream of tokens. possible tokens are:
// WORD
// SPACE (this only exists between words which are not separated by punctuation)
// SYLLABLE
// PERIOD
// COMMA
function readTokens(inputString) {
  var tokenStream = splitOnSpaces(inputString);
  console.log("after spaces:", tokenStream);
  tokenStream = splitOutPunctuation(tokenStream);
  console.log("after punctuation", tokenStream);
  tokenStream = syllablizeWords(tokenStream);
  console.log("after syllables", tokenStream);
  tokenStream = timeAugmentTokens(tokenStream);
  console.log("after times", tokenStream);
  var keyStream = literizeTokens(tokenStream);

  return keyStream;
}

var LETTER_TIMING = 100;

function writeKeyStream(keyStream, i) {
  process.stdout.write(keyStream[i][1]);
  if (i + 1 < keyStream.length) {
    setTimeout(writeKeyStream, keyStream[i][2] * LETTER_TIMING, keyStream, i + 1);
  }
}

function consoleRead(text) {
  var keyStream = readTokens(text);
  writeKeyStream(keyStream, 0);
}

module.exports = {
  readTokens: readTokens,
  consoleRead: consoleRead
};
