<template>
  <div class='ak-typeahead' v-click-outside='hideSuggestions'>
    <a href="#" class='menu-opener' @click.prevent='menuClicked'>
      <img :src="currentUser.avatar_url" class="avatar" v-if="currentUser">
      <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="feather feather-info">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    </a>
    <input ref='input' autofocus type='text' autocomplete='off' autocorrect='off' autocapitalize='off'
      spellcheck='false' :value='currentQuery' :placeholder='placeholder' @input='handleInput' @keydown="cycleTheList">
    <a type='submit' class='search-submit' href='#' @click.prevent='clearSearch' v-if='currentQuery || showClearButton'>
      <!-- Icon copyright (c) 2013-2017 Cole Bemis: https://github.com/feathericons/feather/blob/master/LICENSE -->
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="feather feather-x-circle">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    </a>
    <ul v-if="showSuggestions" class="suggestions">
      <li v-for="(suggestion, index) in suggestions" :key="index">
        <a @click.prevent="pickSuggestion(suggestion)" class="suggestion" :class="{ selected: suggestion.selected }"
          href="#" v-html="suggestion.html"></a>
      </li>
    </ul>

    <ul v-if="showLoading" class="suggestions">
      <li class="searching">
        <span v-if="!loadingError">Downloading search index for letter <b>{{ currentQuery[0] }}</b>...</span>
        <div v-if="loadingError" class="loading-error">
          <div>Failed to get project completions:</div>
          <pre>{{ loadingError }}</pre>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import bus from '../lib/bus.js';
import ClickOutside from '../lib/clickOutside.js';
import { getCurrentUser } from '../lib/githubClient';

export default {
  directives: { ClickOutside },
  props: {
    placeholder: {
      default: "Type here"
    },
    showClearButton: {
      default: false
    },
    query: {
      default: ""
    },
    delay: {
      default: 80
    }
  },
  mounted() {
    this.updateCurrentUser()
    bus.on('auth-changed', this.updateCurrentUser);
  },
  beforeUnmount() {
    bus.off('auth-changed', this.updateCurrentUser);
  },
  data() {
    return {
      currentSelected: -1,
      showSuggestions: false,
      showLoading: false,
      loadingError: null,
      suggestions: [],
      currentQuery: this.query,
      currentUser: null,
    };
  },
  watch: {
    query(newQuery) {
      this.currentQuery = newQuery;
    }
  },
  methods: {
    updateCurrentUser() {
      getCurrentUser().then(user => {
        this.currentUser = user
      });
    },

    refresh() {
      if (this.showSuggestions) this.getSuggestionsInternal();
    },

    menuClicked() {
      this.$emit('menuClicked');
    },

    hideSuggestions() {
      this.showSuggestions = false;
      this.showLoading = false;
      this.pendingKeyToShow = true;
    },

    showIfNeeded(visible) {
      // we need to wait until next key press before we can show suggestion.
      // This avoids race conditions between search results and form submission
      if (!this.pendingKeyToShow) this.showSuggestions = visible;
    },

    focus() {
      this.$refs.input.focus();
    },

    pickSuggestion(suggestion) {
      this.currentQuery = suggestion.text;
      this.hideSuggestions();
      this.$emit("selected", suggestion);
    },

    clearSearch() {
      let payload = { shouldProceed: true };
      this.$emit('beforeClear', payload);
      if (!payload.shouldProceed) return;

      this.currentQuery = '';
      this.getSuggestionsInternal();
      // this.focus();
      this.$emit("cleared");
    },

    handleInput(event) {
      this.currentQuery = event.target.value;
      this.$emit('inputChanged');
      this.getSuggestionsInternal();
    },

    getSuggestionsInternal() {
      var self = this;
      if (self.previous) {
        window.clearTimeout(self.previous);
        self.previous = null;
      }
      if (!self.currentQuery) {
        this.showSuggestions = false;
        return;
      }

      self.previous = window.setTimeout(function () {
        var p = window.fuzzySearcher.find(self.currentQuery.toLowerCase());

        if (Array.isArray(p)) {
          self.suggestions = p.map(toOwnSuggestion);
          self.currentSelected = p.length > 0 ? 0 : -1;
          if (p.length > 0) {
            self.suggestions[0].selected = true;
          }
          self.showIfNeeded(p && p.length > 0);
        } else if (p) {
          self.loadingError = null;
          self.showLoading = true;
          p.then(
            function (suggestions) {
              if (suggestions === undefined) return; // resolution of cancelled promise
              self.showLoading = false;
              suggestions = suggestions || [];
              self.suggestions = suggestions.map(toOwnSuggestion);
              self.currentSelected = suggestions.length > 0 ? 0 : -1;
              if (suggestions.length > 0) {
                self.suggestions[0].selected = true;
              }
              self.showIfNeeded(suggestions && suggestions.length > 0);
            },
            function (err) {
              self.loadingError = err;
            }
          );
        } else {
          throw new Error("Could not parse suggestions response");
        }
      }, self.delay);
    },

    cycleTheList(e) {
      var items = this.suggestions;
      var currentSelected = this.currentSelected;
      // Any key is alright for the suggestions
      this.pendingKeyToShow = false;

      let dx;
      if (e.which === 38) {
        // UP
        dx = -1;
      } else if (e.which === 40) {
        // down
        dx = 1;
      } else if (e.which === 13) {
        // Enter === accept
        if (items[currentSelected]) {
          this.pickSuggestion(items[currentSelected]);
        } else {
          this.pickSuggestion({ text: this.currentQuery });
        }
        e.preventDefault();
        return;
      } else if (e.which === 27) {
        // Esc === close
        this.hideSuggestions();
      }

      if (!dx || items.length === 0) return;

      e.preventDefault();

      if (currentSelected >= 0) {
        this.suggestions[currentSelected].selected = false;
      }
      currentSelected += dx;
      if (currentSelected < 0) currentSelected = items.length - 1;
      if (currentSelected >= items.length) currentSelected = 0;

      this.suggestions[currentSelected].selected = true;
      this.currentSelected = currentSelected;
    }
  }
};
function toOwnSuggestion(x) {
  return {
    selected: false,
    text: x.text,
    html: x.html,
    lon: x.lon,
    lat: x.lat
  };
}
</script>

<style>
img.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  aspect-ratio: auto 24 / 24;
}

.ak-typeahead {
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: var(--color-background-soft);
}

.menu-opener {
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: var(--color-background-soft);
}

.menu-opener:hover,
.menu-opener:focus {
  background: var(--color-border-hover);
}

.search-submit {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  align-items: center;
  text-decoration: none;
  display: flex;
  flex-shrink: 0;
  width: 48px;
  justify-content: center;
  outline: none;
}

.search-submit:hover,
.search-submit:focus {
  background: var(--color-border-hover);
}

.suggestion {
  display: block;
  width: 100%;
  height: 28px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  align-items: center;
  padding-left: 10px;
  text-decoration: none;
  font-weight: bold;
  color: var(--color-text);

}

.suggestion b {
  font-weight: normal;
}

.suggestion:hover,
.suggestion.selected {
  background-color: var(--color-border-hover);
  color: var(--color-text);
}

.suggestions {
  position: absolute;
  top: 48px;
  width: 100%;
  padding: 0;
  background: var(--color-background-soft);
  list-style-type: none;
  margin: 0;
  border-top: 1px solid var(--color-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.suggestions .searching {
  margin: 8px;
}

.suggestions .loading-error pre {
  color: orangered;
  overflow-x: auto;
  padding-bottom: 14px;
}

input[type='text'] {
  height: 100%;
  width: 100%;
  padding-right: 48px;
  padding-left: 10px;
  font-size: 18px;
  border: 0;
  border-radius: 0;
  background: var(--color-background-soft);
  color: var(--color-text);
}

input:focus,
input:hover {
  background: var(--color-background-mute);
}

input:focus {
  outline: none;
}

input::placeholder {
  color: var(--color-text);
}

.searching b {
  font-weight: bold;
}

@media (max-width: 600px) {
  .suggestion {
    height: 42px;
  }
}
</style>
