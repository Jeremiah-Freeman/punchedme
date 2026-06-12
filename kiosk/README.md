# Punched Scan-Mode Kiosk (Raspberry Pi 4 + 4.3" DSI touchscreen)

Goal: power on the Pi → it boots straight into Punched **Scan Mode** fullscreen,
already logged in, ready to scan. No Google login, no keyboard/mouse needed.

## Hardware (CanaKit Pi 4 starter kit)
- Pi 4 in the case, **heatsinks on first** (CPU = big, SDRAM + USB controller = small), fan to GPIO pins 4 & 6.
- 4.3" DSI display via the DSI ribbon (NOT HDMI).
- USB barcode scanner (acts as a keyboard) for scanning customer QR codes — this is the "USB Scanner" mode in Scan Mode.
- USB-C power last.

## 1. Flash the SD card (do this on your Mac)
Use **Raspberry Pi Imager** (raspberrypi.com/software).
- OS: **Raspberry Pi OS (64-bit)** — the full desktop version (we need a browser).
- Click the gear / "Edit Settings" before writing and set:
  - Hostname: `punched-scanner`
  - **Enable SSH** (password auth) ← important, lets Claude finish setup remotely
  - Username / password: pick something and tell Claude
  - Wi-Fi SSID + password (the shop's network)
  - Locale/timezone
- Write, then put the card in the Pi (with the board already in the case).

## 2. First boot
- Plug in the DSI display, USB scanner, then USB-C power.
- It boots to the desktop. Confirm it's on Wi-Fi.
- Find its address: it should be reachable as `punched-scanner.local`.

## 3. Hand off to Claude (the live part)
Once it's on the network, give Claude: the hostname/IP, the username, and password.
Claude will SSH in and, **watching it work on the actual screen**:
- Install Chromium kiosk autostart → opens `https://punched.me/dashboard/scan` fullscreen on boot
- Persistent browser profile so the login survives reboots
- Disable screen blanking / screensaver, hide the cursor
- Set the right resolution/rotation for the 4.3" panel

## 4. Log in once
On the Pi, log in to Punched **with email + password** (not Google — keeps the kiosk
off any Google account and makes the session clean to persist). Done once; it sticks.

---

## Security note (recommended follow-up)
Logging the Pi in as the business owner means the Pi holds a full dashboard session —
a lost/stolen Pi = full account access. The hardened version is a **device token**: the
owner generates a revocable, scan-only token in the dashboard, and the kiosk runs a
dedicated `/scan/<token>` route that can ONLY add punches (no dashboard, no settings).
Ship the simple persistent-login kiosk first; add the device token next if we want it
appliance-grade. Tracked as a follow-up.
