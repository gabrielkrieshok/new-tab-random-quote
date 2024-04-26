
document.body.onload =  function() {
    if (window.chrome && chrome.runtime && chrome.runtime.id) {
      // console.log('Chrome extension mode')
      getChromeStorage();
    } else {
      // console.log('Not in chrome extension mode')
      getLocalStorage();
    }
  }

 async function getChromeStorage() {
    try {
      await chrome.storage.local.get(['localQuotes','useStock'], function (value) {
      useStock = (value.useStock !=false) ? true : false
      localQuotes = value.localQuotes ? value.localQuotes : []
      quoteCompiler();
    });
  } catch(error) {
    console.log(error)
  }
}

function getLocalStorage() {
  localQuotes = JSON.parse(localStorage.getItem('localQuotes') || "[]"); // Browser cache
  useStock = JSON.parse(localStorage.getItem('useStock') || "true"); // Browser cache
  quoteCompiler();
}

async function getStockQuotes() {
  if (window.chrome && chrome.runtime && chrome.runtime.id) {
    let response = await fetch(chrome.runtime.getURL('stockquotes.json'))
    const stockQuotes = await response.json()
    return stockQuotes
  } else {
    let response = await fetch('stockquotes.json')
    const stockQuotes = await response.json()
    return stockQuotes
  }
}

async function quoteCompiler() {
  // Decide which set of quote arrays to mix & match for inclusion
  if ( localQuotes.length === 0 && useStock ) { // No local, yes stock
    quotes = await getStockQuotes();
    pushQuote()
  } else if ( localQuotes.length > 0 && useStock ) { // Yes local, yes stock
    stockQuotes = await getStockQuotes();
    quotes = localQuotes.concat(stockQuotes);
    pushQuote()
  } else if (localQuotes.length > 0 && !useStock ) { // Yes local, no stock
    quotes = localQuotes
    pushQuote()
  } else { // No local, no stock
    quotes = [{id: 0, text: "Enter your own quotes or enable the stock quotes in the settings menu for this app to work.", author: "Gabriel (the management)"}]
    pushQuote()
  }
}

function pushQuote() {
  var randomizer = Math.floor(Math.random()*quotes.length);
  var showQuoteText = quotes[randomizer].text;
  var showQuoteAuthor = quotes[randomizer].author;
  document.getElementById("showQuoteText").innerHTML = showQuoteText;
  document.getElementById("showQuoteAuthor").innerHTML = showQuoteAuthor;    
}
