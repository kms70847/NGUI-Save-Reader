# NGUI-Save-Reader
Reads save files for the game "NGU Industries". Written in browser-friendly JavaScript.

[Try The Demo](https://kms70847.github.io/)

# Dependencies
`web/ngui_reader.bundled.js` is a standalone js file that requires no outside dependencies or installation. Include it in your html and call `decode_ngu_save(yourArrayBufFer)`.

If you want to create the bundled js from source anyway, you will require:
 - Node
 - [Pako](https://github.com/nodeca/pako)
 - [json-bigint](https://github.com/sidorares/json-bigint#readme)
 - [Browserify](https://browserify.org/)

Use `npm` to install Pako and json-bigint and Browserify as detailed on their documentation pages. Then run `browserify ngui_reader.js -o ngui_reader.bundled.js`

# License

This software is licensed under MIT.

Pako is licensed under MIT and ZLIB.
json-bigint is licensed under MIT.
Browserify is licensed under MIT.

Informally: you may use this software in your own projects, commercial or noncommercial. If you have attibutions, then provide a link to this repository.