# ATC
SAFS/FiveM air traffic control helper for ATC controllers on FiveM servers

## Live client version: http://buckers.online

## Features

- FAA-style digital ATIS generator with airport, station, weather, runway, cloud, QNH/altimeter, and NOTAM fields.
- Airline/callsign lookup using OpenFlights
- SID Calculator for IFR clearances
- Text phrase generator for IFR clearance, pushback, taxi, takeoff, descent, radar vectors, approach, and landing.
- Automatic `/ATC` copy formatting for generated messages.
- Digital flight strips with status tracking, on-hold highlighting, spoken callsign detection, and quick deletion.
- Session-preserved inputs while navigating between tools and flight strips.
- Clean dark-mode interface designed for low-light controller use.
- Run locally in browser

## Planned Features
- Flightstrip overhual (possibily synced)
- Full route generater, from SID to STAR for both ATC and pilots.
- Ingame Integration
- Live map
  
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
- 
## License
- Non-commercial, source-available. See LICENSE.md for details.
  
## Credits

ATC Tools by Buckers.
