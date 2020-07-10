<template>
<div id="app">
  <section class="heading">
    <h1>New Tab Random Quote</h1>
    <h2>💬 Manage quote lists and custom quote lists</h2>

<div class="settings">
<toggle-button :width="110" :height="30" :font-size="14" v-model="useStock" :labels="{checked: 'Mix', unchecked: 'Don\'t mix'}"/> in some <a target="_blank" href="stockquotes.json">stock quotes</a>.

</div>
    <textarea
      class="new-quote quote-text"
      ref="quotebox"
      autofocus
      autocomplete="off"
      placeholder="Start typing in a quotation..."
      v-model="newQuoteText"
      v-on:keyup.enter="addQuote"
      />

    <input
      class="new-quote quote-author"
      autocomplete="off"
      placeholder="...and who said it?"
      v-model="newQuoteAuthor"
      v-on:keyup.enter="addQuote"
      />

    <button
      class="button"
      v-bind:class="{ active: !bothEmpty }"
      v-on:click="addQuote"
      >
      Add Quote
    </button>

  </section>

  <hr />
    <div class="quote-count">
      <strong>{{ this.quoteCount }}</strong> {{ this.quoteCount | pluralize }}
      {{ this.localQuotes.length }}rawr

    </div>
  <section class="quotes" v-show="localQuotes.length">



    <ul class="quote-list">
      <li v-for="quote in localQuotes" class="quote-item" :key="quote.id">
      <blockquote>
        <p class="text">{{ quote.text }}</p>
        <p class="author">{{ quote.author }}</p>
      </blockquote>
      <button class="destroy" @click="removeQuote(quote)"></button>
      </li>
    </ul>

  </section>

  <footer>Developed by <a target="_blank" href="https://gabrielkrieshok.com">Gabriel Krieshok</a></footer>
</div>
</template>

<script>
    // var localQuotes = [];
    // var useStock = true;

function getChromeStorage() {

  chrome.storage.sync.get(['localQuotes','useStock'], function (value) {
    useStock = (value.useStock !=false) ? true : false
    localQuotes = value.localQuotes ? value.localQuotes : []
    console.log('wowlocalQuotes',localQuotes)
  });
}

var appStorage = {
  fetchQuote: async function(key) {
    if (chrome.storage != undefined) {
    try {
      localQuotes = await chrome.storage.sync.get(['localQuotes'], function (value) {
      localQuotes = value.localQuotes ? value.localQuotes : []
      localQuotes.forEach(function(quote, index) {
        quote.id = index;
      });
      appStorage.uid = localQuotes.length;
      console.log('local',localQuotes)
      return localQuotes
    });
  } catch(error) {
    console.log(error)
  }
}
     else {
      const session = JSON.parse(localStorage.getItem(key) || "[]"); // Browser cache
      session.forEach(function(quote, index) {
        quote.id = index;
        });
      appStorage.uid = session.length;
      return session
    }
  },
  fetchUseStock: async function(key) {
    if (chrome.storage != undefined) {
      try {
          useStock = await chrome.storage.sync.get([key], function () {
          useStock = (key.useStock !=false) ? true : false
          console.log('stock',useStock)
          return useStock
        })
      } catch(error) {
      console.log(error)
      }
    } else {
      const session = JSON.parse(localStorage.getItem(key) || true); // Browser cache
      return session
    }
  },
  saveQuote: function(key) {
  if (chrome.storage != undefined) {
    const session = chrome.storage.sync.set([key], function () {
      return session
    })
  } else {
    const session = localStorage.setItem('localQuotes', JSON.stringify(key)); // Browser cache
    return session
  }
  },
  saveUseStock: function(key) {
  if (chrome.storage != undefined) {
    const session = chrome.storage.sync.set([key], function () {
      return session
    })
  } else {
    const session = localStorage.setItem('useStock', JSON.stringify(key)); // Browser cache
    return session
  }
}
};

export default {
  data: function () {
    return {
    localQuotes: appStorage.fetchQuote('localQuotes'),
    useStock: appStorage.fetchUseStock('useStock'),
    newQuoteText: "",
    newQuoteAuthor: ""
    }
  },
  beforeCreate: function () {
        var localQuotes = [];
    var useStock = true;
  },
  created: async function () {
        var localQuotes = [];
    var useStock = true;
    if (window.chrome && chrome.runtime && chrome.runtime.id) {
      console.log('Chrome extension mode')
      await getChromeStorage();
    } else {
      console.log('Not in chrome extension mode')
      // getLocalStorage();
    }
  },
  // watch quotes change for localStorage persistence
  watch: {
    localQuotes: {
      handler: function(localQuotes) {
        appStorage.saveQuote(localQuotes);
      },
      deep: true
    },
    useStock: {
      handler: function(useStock) {
        appStorage.saveUseStock(useStock);
      },
      deep: true
    },
    bothEmpty: function(){
        
        }
  },
  computed: {
    quoteCount: function() {
      console.log('localQuotescount',localQuotes)
      return localQuotes.length;
    },
    bothEmpty: function() {
      if ((this.newQuoteText.trim()) && (this.newQuoteAuthor.trim()) !== "") {
        return false
        } else {
          return true
        }
      }
  },
  filters: {
    pluralize: function(n) {
      return n === 1 ? "quote" : "quotes";
    }
  },
  methods: {
    addQuote: function() {
      var valueQuote = this.newQuoteText.trim();
      var valueQuoteAuthor = this.newQuoteAuthor.trim();
      if (!valueQuote || !valueQuoteAuthor) {
        return;
      }
      localQuotes.push({
        id: appStorage.uid++,
        text: valueQuote,
        author: valueQuoteAuthor
      });
      this.newQuoteText = "";
      this.newQuoteAuthor = "";
      console.log('localQuotes',localQuotes)
      this.$nextTick(() => this.$refs.quotebox.focus())
    },
    removeQuote: function(quote) {
      localQuotes.splice(localQuotes.indexOf(quote), 1);
    },
  },
  // a custom directive to wait for the DOM to be updated
  // before focusing on the input field.
  directives: {
    "quote-focus": function(el, binding) {
      if (binding.value) {
        el.focus();
      }
    }
  }
}
</script>
