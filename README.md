# ATC
SAFS/FiveM air traffic control helper with ATIS generation, airline callsign lookup, pilot text phrase templates, and digital flight strips.
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

Install Node.js 20 or newer for the editable source project. 
Hosting to a domain use Static Hosting zip.

## Downloads

Zip ready download:

Use the source project if you want to edit or run the app locally. Use the static hosting build if you only want to upload the website files to a web host.

## Notes

- Built for game/simulation use only.
- Not for real-world aviation operations.
- Flight strips and form state are kept within the current app session and reset on full page refresh.

## Credits

ATC Tools by Buckers.
