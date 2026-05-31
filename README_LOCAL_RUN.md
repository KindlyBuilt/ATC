# ATC Tools by Buckers for SAFS

Not for real-world operations.

## Run locally

1. Install Node.js 20 or newer.
2. Open a terminal in this folder.
3. Install dependencies:

```bash
npm install
```

4. Start the local development server:

```bash
npm run dev
```

5. Open the local URL shown in the terminal, normally:

```text
http://localhost:5000
```

## Build for hosting later

Create a production build:

```bash
npm run build
```

The static website files will be created in:

```text
dist/public
```

For a simple static host, upload the contents of `dist/public`.

## Server option

If you want to run the included Node server instead of static hosting:

```bash
npm run build
npm start
```

The app will run on port 5000 unless your server environment changes it.

## Notes

- Flight strips and form inputs are stored only for the current app session.
- Refreshing the page resets the app state.
- Airline lookup uses a local OpenFlights-derived dataset in `client/src/data/airlines.ts`.
