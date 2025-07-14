# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a KeyShot remote rendering server that provides a web interface for uploading 3D files (.bip) and rendering them to images through KeyShot's GUI mode using AutoHotkey automation. The system integrates with an external FileBrowser instance for file management.

## Common Commands

- `npm run app` - Start the server (runs on port 3000 by default)
- `node src/index.js` - Alternative way to start the server

## Architecture

### Core Components

**Authentication System**
- RSA encryption for secure login credentials transmission
- Public/private key pairs stored in `keys/` directory
- JWT tokens for session management
- Integration with external FileBrowser authentication API

**File Upload & Rendering Pipeline**
- `renderController.js` - Main rendering logic with queue system
- `render_gui.py` - Python script that controls KeyShot GUI via AutoHotkey
- `keyshot_gui_render.ahk` - AutoHotkey script for GUI automation
- Queue-based processing to handle multiple render requests
- Automatic file cleanup after processing

**Controllers Structure**
- `authController.js` - Handles login, public key distribution
- `fileController.js` - File listing from FileBrowser API
- `renderController.js` - File upload and rendering queue management

### Key Technical Details

**Render Queue System**
- Single-threaded rendering queue to prevent resource conflicts
- Automatic detection of KeyShot executable path
- Supports .bip files only (validated in upload)
- Configurable render settings (width, height, samples)

**External Dependencies**
- Requires KeyShot installation with GUI mode
- AutoHotkey installation for GUI automation
- FileBrowser instance for file storage (configured via FILEBROWSER_URL)
- Python environment for script execution

**File Structure**
- `uploads/` - Temporary storage for uploaded files
- `rendered/` - Local render output (cleaned after upload)
- `keys/` - RSA key pairs for authentication
- `public/` - Frontend HTML files (login and dashboard)

## Environment Variables

- `FILEBROWSER_URL` - URL of the FileBrowser instance
- `KEYSHOT_EXE` - Path to KeyShot executable (optional, auto-detected)
- `PORT` - Server port (default: 3000)

## Frontend Integration

The system serves two main pages:
- `/` - Login page with RSA-encrypted credential submission
- `/dashboard.html` - File upload interface with render options

Both pages use vanilla JavaScript and integrate with the REST API endpoints under `/auth`, `/files`, and `/render`.