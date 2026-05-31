# ATC Tools

SAFS/FiveM air traffic control helper for ATC controllers on FiveM servers

ATC Tools helps controllers quickly generate realistic controller text for text-pilots, digital ATIS messages, airline spoken callsigns, and session flight strips without leaving the browser.

## Features

- FAA-style digital ATIS generator with airport, station, weather, runway, cloud, QNH/altimeter, and NOTAM fields.
- Airline lookup using a local OpenFlights-derived ICAO/callsign dataset.
- Text phrase generator for IFR clearance, pushback, taxi, takeoff, descent, radar vectors, approach, and landing.
- Automatic `/ATC` copy formatting for generated messages.
- Digital flight strips with status tracking, on-hold highlighting, spoken callsign detection, and quick deletion.
- Session-preserved inputs while navigating between tools and flight strips.
- Clean dark-mode interface designed for low-light controller use.

## Run locally

Install Node.js 20 or newer, then run:

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal, usually:

```text
http://localhost:5000
```

## Build for hosting

```bash
npm run build
```

Upload the contents of:

```text
dist/public
```

to your web host. The `index.html` file and `assets` folder must be in the same public/root folder.

## Downloads

Users can download ready-made zip files directly from this repository:

- [Editable source project](https://github.com/buckers123/atc-tools/raw/main/downloads/atc-tools-source.zip)
- [Static hosting build](https://github.com/buckers123/atc-tools/raw/main/downloads/atc-tools-static-build.zip)

Use the source project if you want to edit or run the app locally. Use the static hosting build if you only want to upload the website files to a web host.

## Notes

- Built for game/simulation use only.
- Not for real-world aviation operations.
- Flight strips and form state are kept within the current app session and reset on full page refresh.

## Credits

ATC Tools by Buckers.
