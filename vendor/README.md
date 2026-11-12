# Third-party code bundled with the app

Everything here is served locally from `public/vendor/`. The app makes no CDN or other network requests at runtime.

| File | Library | Version | License | Used for |
|---|---|---|---|---|
| `fflate.min.js` | [fflate](https://github.com/101arrowz/fflate) by Arjun Barrett | 0.8.2 (`umd/index.js` from the npm package, unmodified) | MIT, full text in `fflate-LICENSE.txt` | Streaming `Inflate` of the `export.xml` entry inside an Apple Health `export.zip`, inside a Web Worker (`js/health-worker.js`). Loaded only when the user picks a file. |

The ZIP central-directory reader and the `<Record>` chunk scanner are our own code, in `js/health-parse.js`.
