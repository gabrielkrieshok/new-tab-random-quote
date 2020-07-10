<template>
  <div id="app">

    <div class="icon"><a href="quote.html">”</a></div>

    <section class="heading">
      <h1>New Tab / Random Quote</h1>
      <h2>💬 Be reminded of useful/inspiring messages.</h2>

      <h3>Hi! This is the demo site for the Chrome plugin, which lets you replace the default 'new tab' screen with your own randomly-selected quotations. Hit the quotation character in the top-right to see what it looks like!</h3>

        <toggle-button
          :width="110"
          :height="30"
          :font-size="14"
          color="rgba(15, 129, 85, .50)"
          v-model="useStock"
          :labels="{checked: 'Mix', unchecked: 'Don\'t mix'}"
          />
        in some <a target="_blank" href="stockquotes.json">stock quotes</a>.
    </section>

    <section class="quote-entry">
      <input
        class="new-quote quote-text"
        ref="quotebox"
        autofocus
        autocomplete="off"
        placeholder="Start typing in a quotation..."
        v-model="newQuoteText"
        v-on:keyup.enter="addQuote"
        />

      <input
      style="float: right;"
        class="new-quote quote-author"
        autocomplete="off"
        placeholder="...and who said it?"
        v-model="newQuoteAuthor"
        v-on:keyup.enter="addQuote"
        />
        
      <button
        class="addQuote"
        v-bind:class="{ active: quoteReady }"
        v-on:click="addQuote"
        >
        Add Quote
      </button>

    </section>

    <hr />

    <section class="quotes" v-show="localQuotes.length">

      <div class="quote-count">
        <strong>{{ quoteCount }}</strong> {{ quoteCount | pluralize }}
      </div>

      <ul class="quote-list">
        <li v-for="quote in localQuotes.slice().reverse()" class="quote-item" :key="quote.id">

        <blockquote>
          <p class="text">{{ quote.text }}</p>
          <p class="author">{{ quote.author }}</p>
        </blockquote>

        <span class="destroy" @click="removeQuote(quote)"></span>

        </li>
      </ul>



</section>

<section>

    <transition name="slide-fade-enter">
    <h2 v-if="importSuccess">Imported successfully!</h2>
  </transition>
  
<div v-if="showImport" class="dropbox">
      <vue-csv-import
      v-model="importedQuotes"
      :map-fields="['text','author']"
      buttonClass="submitImport"
      :autoMatchFields="true"
      :autoMatchIgnoreCase="true"
      loadBtnText="Upload"
      submitBtnText="Import"
      headers=null
      ></vue-csv-import>

      <p>File upload should be CSV with 'text' column and 'author' column headings.</p>
</div>

<div style="display:flex; flex-direction: row;">

      <button
        class="exportQuotes"
        v-show="localQuotes.length"
        v-bind:class="{ active: quoteReady }"
        v-on:click="exportQuotes(localQuotes)"
        >
        Export Quotes as CSV
      </button>

      <button
        class="showImport"
        v-on:click="showImport=!showImport"
        >
        Import Quotes from CSV
      </button>

      <button
        v-show="localQuotes.length"
        class="removeAll"
        v-on:click="removeAllQuotes"
        >
        Remove all Quotes
      </button>
</div>

    </section>

    <footer>Developed by <a target="_blank" href="https://gabrielkrieshok.com">Gabriel Krieshok</a></footer>

  </div>
</template>

<script>
import { VueCsvImport } from 'vue-csv-import';

export default {
  components: {
    VueCsvImport
  },
  data: function () {
    return {
    localQuotes: [],
    useStock: true,
    appStorage: [],
    newQuoteText: "",
    newQuoteAuthor: "",
    importedQuotes: [],
    showImport: false,
    importSuccess: false
    }
  },
  created: function () {
    const _self = this;
    if (window.chrome && chrome.runtime && chrome.runtime.id) { // Checks to see if running as a Chrome extension (and not just in a chrome browser)
      chrome.storage.sync.get({ // Asynchronous call to Chrome storage for user-created quotes (local quotes) and settings
        localQuotes: [], 
        useStock: true
      }, function (setting) {
        _self.localQuotes = setting.localQuotes;
        _self.useStock = setting.useStock;
      });
    } else { // When *not* running as a Chrome extension, just fall back on local browser storage
      this.localQuotes = JSON.parse(localStorage.getItem('localQuotes') || "[]");
      this.useStock = JSON.parse(localStorage.getItem('useStock') || true);
    }
    this.localQuotes.forEach(function(quote, index) { // Count the total local quotes and index them
      quote.id = index;
    });
    this.appStorage.uid = this.localQuotes.length;
  },
  watch: { // watch for changes to quotes or settings and persist to Chrome or local storage methods below
    localQuotes: {
      handler: function(localQuotes) {
        this.saveSettings(localQuotes);
      },
      deep: true
    },
    useStock: {
      handler: function(useStock) {
        this.saveSettings(useStock);
      },
      deep: true
    },
    importedQuotes: {
      handler: function() {
        this.localQuotes = [...this.localQuotes, ...this.importedQuotes]
        this.showImport = false
        this.importSuccess = true
      }
    }
  },
  computed: {
    quoteCount: function() { // Running total of generated quotes
      return this.localQuotes.length;
    },
    quoteReady: function() { // When computed as 'false', disables the the submit button
      return ((this.newQuoteText.trim()) && (this.newQuoteAuthor.trim()) !== "")
    }
  },
  filters: {
    pluralize: function(n) {
      return n === 1 ? "saved quotation" : "saved quotations";
    }
  },
  methods: {
    saveSettings () {
      if (window.chrome && chrome.runtime && chrome.runtime.id) { // Chrome extension save mode
        const _self = this;
        chrome.storage.sync.set({
          localQuotes: _self.localQuotes,
          useStock: _self.useStock
        })
      } else { // Non Chrome extension save mode
        localStorage.setItem('localQuotes', JSON.stringify(this.localQuotes));
        localStorage.setItem('useStock', JSON.stringify(this.useStock));
      }
    },
    addQuote: function() { // Push to storage with incremented index id, and reset entry fields (replacing the cursor aftering waiting a beat)
      if (!this.newQuoteText.trim() || !this.newQuoteAuthor.trim()) { return }
      this.localQuotes.push({
        id: this.appStorage.uid++,
        text: this.newQuoteText.trim(),
        author: this.newQuoteAuthor.trim()
      });
      this.newQuoteText = "";
      this.newQuoteAuthor = "";
      this.$nextTick(() => this.$refs.quotebox.focus())
    },
    removeQuote: function(quote) {
      this.localQuotes.splice(this.localQuotes.indexOf(quote), 1);
    },
    removeAllQuotes: function() {
      if(confirm('Are you sure you want to delete all saved quotations?'))
      this.localQuotes = []
    },
    exportQuotes: function (objArray) {
     const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
     let str = `${Object.keys(array[0]).map(value => `"${value}"`).join(",")}` + '\r\n';
     let exportedQuotes = array.reduce((str, next) => {
         str += `${Object.values(next).map(value => `"${value}"`).join(",")}` + '\r\n';
         return str;
        }, str);
      var hiddenElement = document.createElement('a');
      hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(exportedQuotes);
      hiddenElement.target = '_blank';
      hiddenElement.download = 'exported-quotes.csv';
      hiddenElement.click();
    }
  },
  directives: {   // A custom directive to wait for the DOM to be updated efore focusing on the input field.
    "quote-focus": function(el, binding) {
      if (binding.value) {
        el.focus();
      }
    }
  }
}
</script>
