# NAO Learning Platform — Changelog

All notable changes to the NAO Robotics Interactive Learning Platform.

---

## 2026-04-06 — Modules 9, 10, 11 (All Modules Complete)

**Added Module 9 — Object Recognition** (PDF Book Module 8)
- Digital Images & Pixels — resolution, megapixels, NAO camera specs (1288x968, 30fps)
- Computer Vision — features, edges, texture, SIFT, feature matching
- NAOMark-Controlled Robot — ALLandMarkDetection, Switch Case mapping marks to walk actions
- Object Recognition — ALVisionRecognition, vision database, `startswith()` string method, logical AND, walking to detected objects
- 3 exercises: NAOMark Navigator, Object Announcer, Seek and Walk
- 7 quiz questions (basic/intermediate/advanced)

**Added Module 10 — Human-Robot Interaction** (PDF Book Module 9: Games and Stories)
- HRI Introduction — what HRI is, robotics + psychology, NAO's humanoid appeal
- Greetings — handshake, high five, wave goodbye via voice-triggered keyframe motions
- Peek-a-Boo — game cycle with face hiding, speech recognition, face detection
- Storytelling — multi-character skits with voice parameter switching, LED mood lighting, gestures, dramatic pauses
- 3 exercises: Rock Paper Scissors, Robot Skit, Interactive Greeter
- 4 quiz questions (basic/intermediate/advanced)

**Added Module 11 — Finding Your Way** (PDF Book Module 10)
- Solving Mazes — paper vs physical mazes, dead-end filling algorithm
- Maze Solving with Visual Cues — NAOMarks placed at turns, Timer + Move To for forward walking, Switch Case for turn direction
- Wall Following Algorithm — right-hand rule (no wall right → turn right; wall right + clear front → forward; wall right + wall front → turn left), head touch sensor input, simply-connected maze requirement
- Finding the Shortest Path — breadth-first search (BFS), queue-based exploration, path traceback
- 3 exercises: Wall Follower with State Machine, Left-Hand Rule, BFS Maze Solver
- 7 quiz questions (basic/intermediate/advanced)

**Files changed:** `index.html` (+1052 lines), `js/app.js` (+580 lines)

---

## 2026-04-01 — Module 8

**Added Module 8 — Face Off** (PDF Book Module 7)
- Face Detection — ALFaceDetection, top camera, greeting on detect, sound tracking
- Recognizing Faces — learnFace(), detection vs recognition
- Seeking Out Faces — head scanning with HeadYaw/HeadPitch, face detect during scan
- Remembering Faces — queues/lists in Python, time.time(), sound-tracking with position memory
- 3 exercises: Greet and Wave, Personalized Greetings, Scan Detect and Track
- 8 quiz questions (basic/intermediate/advanced)

---

## 2026-03-09 — Module 7

**Added Module 7 — AI x NAO** (new module, not in original PDF)
- What is an LLM API — intro to Large Language Models, why Gemini
- Get Your API Key — Gemini API key setup, browser localStorage storage
- Protecting Your Key — .env files, python-dotenv, .gitignore
- Your First AI Call — basic Gemini API call with `# API_CALL:` directive
- Building a Chat Loop — multi-turn conversation, stateless API, conversation history
- Giving It Personality — system prompts for behavior customization
- Connecting AI to NAO — LED state indicators (green/yellow/blue), full TTS integration
- 3 exercises: Trivia Bot, Language Translator, AI Storyteller with NAO
- 10 quiz questions

**CI/CD enabled** — GitHub Actions auto-deploy on push to `main`

---

## 2026-03-02 — CI/CD and Polish

- Added Copy Code button to all code editors
- Set up GitHub Actions workflow (`.github/workflows/deploy.yml`)
- AWS S3 + CloudFront deployment configured
- All 5 repository secrets added

---

## 2026-02-19 — Initial Release (Modules 0-6)

**Module 0 — Getting Started**
- Setting Up NAO, NAOqi SDK Setup

**Module 1 — Hello World!**
- Text-to-Speech Basics, Voice Parameters, Variables & Strings
- 3 exercises, 12 quiz questions

**Module 2 — Walk it Out**
- Coordinate Plane, Making NAO Walk, Polar Coordinates, Walking with Python
- 3 exercises, quiz questions

**Module 3 — Hearing Things**
- Speech Recognition on NAO, Responding to Voice
- Exercises, quiz questions

**Module 4 — Let's Dance**
- Keyframe Motion, Balancing NAO, Joint Control with Python
- Exercises, quiz questions

**Module 5 — Sense and Act**
- NAO's Senses, LEDs & Bumpers, Finite State Machines, Sensors & Actuators
- Exercises, quiz questions

**Module 6 — Do the Robot**
- Multi-tasking, Behavior Layers, Parallel Motion with Python, Odometry & Walking in Circles
- Exercises, quiz questions

**Tech stack:** Vanilla HTML/CSS/JS, CodeMirror 5.65.16, Pyodide 0.27.3, Three.js r128, Web Speech API

---

## PDF-to-Website Module Mapping

| Website Module | PDF Book Module | Title |
|---|---|---|
| Module 0 | — | Getting Started (not in book) |
| Module 1 | Module 1 | Hello World! |
| Module 2 | Module 2 | Walk it Out |
| Module 3 | Module 3 | Hearing Things |
| Module 4 | Module 4 | Let's Dance |
| Module 5 | Module 5 | Sense and Act |
| Module 6 | Module 6 | Do the Robot |
| Module 7 | — | AI x NAO (new, not in book) |
| Module 8 | Module 7 | Face Off |
| Module 9 | Module 8 | Object Recognition |
| Module 10 | Module 9 | Human-Robot Interaction |
| Module 11 | Module 10 | Finding Your Way |
