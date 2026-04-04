.PHONY: firefox
firefox:
	@rm -rf chrome
	@cp -r firefox chrome
	@git add firefox

.PHONY: all
all: package lint

node_modules:
	npm install

lint: node_modules
	npm run lint

.PHONY: clean
clean:
	rm -f */*.zip

.PHONY: package
package: clean firefox chrome/chrome.zip firefox/firefox.zip

firefox/firefox.zip:
	cd firefox && zip -q -r firefox.zip *

chrome/chrome.zip:
	cd chrome && zip -q -r chrome.zip *

.PHONY: safari
safari: clean
	xcrun safari-web-extension-converter --macos-only --bundle-identifier de.jkroepke.extension ./chrome
