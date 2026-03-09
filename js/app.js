/* === NAO Learning Platform — App Navigation === */

const PAGES = [
  'setup-nao',
  'sdk-setup',
  'tts-basics',
  'voice-params',
  'variables-strings',
  'exercises',
  'module-questions',
  'coord-plane',
  'nao-walk',
  'polar-coords',
  'walk-python',
  'walk-exercises',
  'walk-questions',
  'speech-recognition',
  'responding-voice',
  'hearing-exercises',
  'hearing-questions',
  'keyframe-motion',
  'balancing-nao',
  'joint-control',
  'dance-exercises',
  'dance-questions',
  'senses-nao',
  'leds-bumpers',
  'finite-state-machines',
  'sensors-actuators',
  'sense-exercises',
  'sense-questions',
  'multitasking',
  'behavior-layers',
  'parallel-motion',
  'odometry',
  'robot-exercises',
  'robot-questions',
  'ai-intro',
  'ai-api-key',
  'ai-env-file',
  'ai-first-call',
  'ai-chat-loop',
  'ai-personality',
  'ai-nao-connect',
  'ai-exercises',
  'ai-questions',
];

const PAGE_TITLES = {
  'setup-nao': 'Setting Up NAO',
  'sdk-setup': 'NAOqi SDK Setup',
  'tts-basics': 'Text-to-Speech Basics',
  'voice-params': 'Voice Parameters',
  'variables-strings': 'Variables & Strings',
  'exercises': 'Exercises',
  'module-questions': 'Module Questions',
  'coord-plane': 'The (x,y) Coordinate Plane',
  'nao-walk': 'Making NAO Walk',
  'polar-coords': 'Polar Coordinates',
  'walk-python': 'Walking with Python',
  'walk-exercises': 'Exercises',
  'walk-questions': 'Module Questions',
  'speech-recognition': 'Speech Recognition on NAO',
  'responding-voice': 'Responding to Voice',
  'hearing-exercises': 'Exercises',
  'hearing-questions': 'Module Questions',
  'keyframe-motion': 'Keyframe Motion',
  'balancing-nao': 'Balancing NAO',
  'joint-control': 'Joint Control with Python',
  'dance-exercises': 'Exercises',
  'dance-questions': 'Module Questions',
  'senses-nao': 'NAO\'s Senses',
  'leds-bumpers': 'LEDs & Bumpers',
  'finite-state-machines': 'Finite State Machines',
  'sensors-actuators': 'Sensors & Actuators',
  'sense-exercises': 'Exercises',
  'sense-questions': 'Module Questions',
  'multitasking': 'Multi-tasking',
  'behavior-layers': 'Behavior Layers',
  'parallel-motion': 'Parallel Motion with Python',
  'odometry': 'Odometry & Walking in Circles',
  'robot-exercises': 'Exercises',
  'robot-questions': 'Module Questions',
  'ai-intro': 'What is an LLM API?',
  'ai-api-key': 'Get Your API Key',
  'ai-env-file': 'Protecting Your Key',
  'ai-first-call': 'Your First AI Call',
  'ai-chat-loop': 'Building a Chat Loop',
  'ai-personality': 'Giving It Personality',
  'ai-nao-connect': 'Connecting AI to NAO',
  'ai-exercises': 'Exercises',
  'ai-questions': 'Module Questions',
};

/* Track which pages have been initialized so we don't re-init on revisit */
const initializedPages = {};

function navigateTo(pageId) {
  // Destroy all existing editors/simulators to prevent duplicates
  destroyAllEditors();

  // Hide all pages
  document.querySelectorAll('.page-section').forEach(el => {
    el.style.display = 'none';
  });

  // Show target page
  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.style.display = 'block';
  }

  // Update sidebar active state
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.remove('active');
  });
  const activeLink = document.querySelector(`.sidebar-item[data-page="${pageId}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }

  // Update hash without triggering hashchange
  history.replaceState(null, '', '#' + pageId);

  // Update bottom nav — scoped to the visible page
  updatePageNav(pageId);

  // Scroll to top
  window.scrollTo(0, 0);

  // Initialize any editors on the page (always re-init since we destroy on leave)
  setTimeout(() => initPageEditors(pageId), 100);
}

function updatePageNav(currentPage) {
  const idx = PAGES.indexOf(currentPage);
  const target = document.getElementById('page-' + currentPage);
  if (!target) return;

  // Find nav buttons within THIS page only
  const prevBtn = target.querySelector('.page-nav-prev');
  const nextBtn = target.querySelector('.page-nav-next');

  if (prevBtn) {
    if (idx > 0) {
      const prevPage = PAGES[idx - 1];
      prevBtn.href = '#' + prevPage;
      prevBtn.onclick = (e) => { e.preventDefault(); navigateTo(prevPage); };
      prevBtn.classList.remove('nav-disabled');
      prevBtn.innerHTML = '&larr; ' + PAGE_TITLES[prevPage];
    } else {
      prevBtn.href = '#';
      prevBtn.onclick = (e) => e.preventDefault();
      prevBtn.classList.add('nav-disabled');
      prevBtn.innerHTML = '&larr; Previous';
    }
  }

  if (nextBtn) {
    if (idx < PAGES.length - 1) {
      const nextPage = PAGES[idx + 1];
      nextBtn.href = '#' + nextPage;
      nextBtn.onclick = (e) => { e.preventDefault(); navigateTo(nextPage); };
      nextBtn.classList.remove('nav-disabled');
      nextBtn.innerHTML = PAGE_TITLES[nextPage] + ' &rarr;';
    } else {
      nextBtn.href = '#';
      nextBtn.onclick = (e) => e.preventDefault();
      nextBtn.classList.add('nav-disabled');
      nextBtn.innerHTML = 'Next Module (Coming Soon) &rarr;';
    }
  }
}

function initPageEditors(pageId) {
  if (pageId === 'tts-basics') {
    initEditor('tts-editor', {
      editorId: 'editor-tts',
      previewContainerId: 'preview-tts',
      outputId: 'output-tts',
      defaultCode:
`# IMPORTANT: Run with Python 2.7 on real robot
from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
tts.say("Hello World!")`,
    });
  }

  if (pageId === 'voice-params') {
    initEditor('voice-editor', {
      editorId: 'editor-voice',
      previewContainerId: 'preview-voice',
      outputId: 'output-voice',
      defaultCode:
`# IMPORTANT: Run with Python 2.7 on real robot
from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

# Adjust speed (50-400, default 100)
tts.setParameter("speed", 100)

# Adjust pitch (1.0-4.0, default 1.0)
tts.setParameter("pitchShift", 1.0)

tts.say("I can change how I sound!")`,
    });
  }

  if (pageId === 'variables-strings') {
    initEditor('vars-editor', {
      editorId: 'editor-vars',
      previewContainerId: 'preview-vars',
      outputId: 'output-vars',
      defaultCode:
`# IMPORTANT: Run with Python 2.7 on real robot
from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

robot_name = "Pablito"
greeting = f"Hello! My name is {robot_name}."
tts.say(greeting)`,
    });
  }

  if (pageId === 'exercises') {
    initEditor('ex1-editor', {
      editorId: 'editor-ex1',
      previewContainerId: 'preview-ex1',
      outputId: 'output-ex1',
      defaultCode:
`# Exercise 1: Have NAO introduce itself and greet the class
from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

# TODO: Make NAO introduce itself
# Think about: name, what it is, what it can do
tts.say("Hello!")`,
    });

    initEditor('ex2-editor', {
      editorId: 'editor-ex2',
      previewContainerId: 'preview-ex2',
      outputId: 'output-ex2',
      defaultCode:
`# Exercise 2: Multiple character voices
from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

# Character 1: Deep, slow voice
tts.setParameter("speed", 80)
tts.setParameter("pitchShift", 0.7)
tts.say("I am the narrator.")

# TODO: Add Character 2 with a different voice
# Hint: Change speed and pitchShift before the next say()
`,
    });

    initEditor('ex3-editor', {
      editorId: 'editor-ex3',
      previewContainerId: 'preview-ex3',
      outputId: 'output-ex3',
      defaultCode:
`# Exercise 3: Sing the alphabet with varying pitch
from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

# TODO: Loop through each letter
# For each letter, set a different pitch and/or speed
# Hint: You can calculate pitch based on the letter's position
tts.say("A")`,
    });
  }

  // ── Module 2: Walk it Out ──

  if (pageId === 'nao-walk') {
    initEditor('nao-walk-editor', {
      editorId: 'editor-nao-walk',
      previewContainerId: 'preview-nao-walk',
      outputId: 'output-nao-walk',
      defaultCode:
`from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)
motion.moveTo(0.5, 0.0, 0.0)  # Walk 0.5m forward
posture.goToPosture("Sit", 0.5)`,
    });
  }

  if (pageId === 'walk-python') {
    initEditor('walk-python-editor', {
      editorId: 'editor-walk-python',
      previewContainerId: 'preview-walk-python',
      outputId: 'output-walk-python',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

# Target point
x = 1.0
y = 0.5

# Calculate angle and distance
theta = math.atan2(y, x)
distance = math.sqrt(x**2 + y**2)

# Turn to face the target, then walk
motion.moveTo(0, 0, theta)
motion.moveTo(distance, 0, 0)

posture.goToPosture("Sit", 0.5)`,
    });
  }

  if (pageId === 'walk-exercises') {
    initEditor('walk-ex1-editor', {
      editorId: 'editor-walk-ex1',
      previewContainerId: 'preview-walk-ex1',
      outputId: 'output-walk-ex1',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

# TODO: Make NAO walk in a square (4 sides)
motion.moveTo(0.3, 0, 0)  # Walk forward`,
    });

    initEditor('walk-ex2-editor', {
      editorId: 'editor-walk-ex2',
      previewContainerId: 'preview-walk-ex2',
      outputId: 'output-walk-ex2',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

# TODO: Make NAO walk in a triangle (3 sides)
# Hint: What angle should NAO turn at each corner?
motion.moveTo(0.3, 0, 0)`,
    });

    initEditor('walk-ex3-editor', {
      editorId: 'editor-walk-ex3',
      previewContainerId: 'preview-walk-ex3',
      outputId: 'output-walk-ex3',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

n = 5  # Number of sides
side_length = 0.3  # meters

# TODO: Calculate turn angle and loop to walk a regular polygon`,
    });
  }

  // ── Module 3: Hearing Things ──

  if (pageId === 'responding-voice') {
    initEditor('responding-voice-editor', {
      editorId: 'editor-responding-voice',
      previewContainerId: 'preview-responding-voice',
      outputId: 'output-responding-voice',
      defaultCode:
`from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
asr = ALProxy("ALSpeechRecognition", "<robot_ip>", 9559)
memory = ALProxy("ALMemory", "<robot_ip>", 9559)

asr.setLanguage("English")
vocabulary = ["hello", "goodbye", "yes", "no"]
asr.setVocabulary(vocabulary, False)
asr.subscribe("MyModule")

# Simulate hearing a word (on real robot this comes from mic)
word = "hello"
confidence = 0.65

print("Heard: " + word + " (confidence: " + str(confidence) + ")")

if confidence > 0.4:
    if word == "hello":
        tts.say("Hi there! Nice to meet you!")
    elif word == "goodbye":
        tts.say("See you later!")
    elif word == "yes":
        tts.say("Great, let us continue!")
    elif word == "no":
        tts.say("Okay, maybe next time.")
else:
    tts.say("Sorry, I did not understand.")

asr.unsubscribe("MyModule")`,
    });
  }

  if (pageId === 'hearing-exercises') {
    initEditor('hear-ex1-editor', {
      editorId: 'editor-hear-ex1',
      previewContainerId: 'preview-hear-ex1',
      outputId: 'output-hear-ex1',
      defaultCode:
`# Exercise 1: Build a greeting system
from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
asr = ALProxy("ALSpeechRecognition", "<robot_ip>", 9559)

asr.setLanguage("English")
vocabulary = ["good morning", "good afternoon", "good night"]
asr.setVocabulary(vocabulary, False)

# Simulate hearing a word
word = "good morning"

# TODO: Respond differently based on time of day greeting
# Use if/elif/else to give appropriate responses
tts.say("Hello!")`,
    });

    initEditor('hear-ex2-editor', {
      editorId: 'editor-hear-ex2',
      previewContainerId: 'preview-hear-ex2',
      outputId: 'output-hear-ex2',
      defaultCode:
`# Exercise 2: Simple quiz game
from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

# NAO asks a question
tts.say("What is the capital of France?")

# Simulate student answer
answer = "paris"

# TODO: Check if the answer is correct
# If correct, NAO congratulates; if wrong, NAO gives a hint
# Add at least 3 questions with different responses`,
    });

    initEditor('hear-ex3-editor', {
      editorId: 'editor-hear-ex3',
      previewContainerId: 'preview-hear-ex3',
      outputId: 'output-hear-ex3',
      defaultCode:
`# Exercise 3: Command-driven robot
from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

# Simulate a sequence of voice commands
commands = ["walk forward", "turn left", "sit down"]

# TODO: Loop through commands and make NAO respond
# "walk forward" -> moveTo(0.3, 0, 0)
# "turn left" -> moveTo(0, 0, 1.57)
# "turn right" -> moveTo(0, 0, -1.57)
# "sit down" -> goToPosture("Sit", 0.5)
for cmd in commands:
    tts.say("I heard: " + cmd)`,
    });
  }

  // ── Module 4: Let's Dance ──

  if (pageId === 'keyframe-motion') {
    initEditor('keyframe-motion-editor', {
      editorId: 'editor-keyframe-motion',
      previewContainerId: 'preview-keyframe-motion',
      outputId: 'output-keyframe-motion',
      defaultCode:
`from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)

# Keyframed head scan: look left, right, up, down, center
# Each angleInterpolation smoothly interpolates to the target

# Look left
motion.angleInterpolation(["HeadYaw"], [0.8], [1.0], True)

# Look right
motion.angleInterpolation(["HeadYaw"], [-0.8], [1.0], True)

# Look up
motion.angleInterpolation(["HeadPitch"], [-0.4], [0.8], True)

# Look down
motion.angleInterpolation(["HeadPitch"], [0.4], [0.8], True)

# Return to center
motion.angleInterpolation(
    ["HeadYaw", "HeadPitch"],
    [0.0, 0.0], [0.8, 0.8], True)`,
    });
  }

  if (pageId === 'balancing-nao') {
    initEditor('balancing-nao-editor', {
      editorId: 'editor-balancing-nao',
      previewContainerId: 'preview-balancing-nao',
      outputId: 'output-balancing-nao',
      defaultCode:
`from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

tts.say("Arms down is the most stable pose.")

# Stable pose: arms at sides
motion.angleInterpolation(
    ["LShoulderPitch", "RShoulderPitch"],
    [1.4, 1.4], [1.0, 1.0], True)

tts.say("Now raising arms overhead. Center of gravity shifts up!")

# Less stable: arms raised high
motion.angleInterpolation(
    ["LShoulderPitch", "RShoulderPitch"],
    [-1.0, -1.0], [1.0, 1.0], True)

tts.say("Arms to one side. Weight shifts, less balanced!")

# Unstable: both arms extended to one side
motion.angleInterpolation(
    ["LShoulderPitch", "RShoulderPitch",
     "LShoulderRoll", "RShoulderRoll"],
    [0.0, 0.0, -0.5, -1.0],
    [1.0, 1.0, 1.0, 1.0], True)

tts.say("Back to a stable pose.")
posture.goToPosture("Stand", 0.5)`,
    });
  }

  if (pageId === 'joint-control') {
    initEditor('joint-control-editor', {
      editorId: 'editor-joint-control',
      previewContainerId: 'preview-joint-control',
      outputId: 'output-joint-control',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

# Move head side to side
names = ["HeadYaw"]
angles = [0.5]    # radians (~29 degrees to the left)
times = [1.0]     # reach angle in 1 second
motion.angleInterpolation(names, angles, times, True)

# Return to center
motion.angleInterpolation(["HeadYaw"], [0.0], [1.0], True)

# Nod head
motion.angleInterpolation(["HeadPitch"], [0.3], [0.8], True)
motion.angleInterpolation(["HeadPitch"], [0.0], [0.8], True)

# Raise right arm
motion.angleInterpolation(
    ["RShoulderPitch", "RShoulderRoll"],
    [-0.5, -0.3],
    [1.0, 1.0],
    True
)`,
    });
  }

  if (pageId === 'dance-exercises') {
    initEditor('dance-ex1-editor', {
      editorId: 'editor-dance-ex1',
      previewContainerId: 'preview-dance-ex1',
      outputId: 'output-dance-ex1',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

# TODO: Make NAO wave hello
# Steps:
# 1. Raise right arm (RShoulderPitch to about -1.0)
# 2. Wave hand side to side (RShoulderRoll between -0.5 and 0.3)
# 3. Lower arm back down
# Use angleInterpolation for smooth motion

tts.say("Hello! Watch me wave!")`,
    });

    initEditor('dance-ex2-editor', {
      editorId: 'editor-dance-ex2',
      previewContainerId: 'preview-dance-ex2',
      outputId: 'output-dance-ex2',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)
tts.say("Time to do the robot dance!")

# TODO: Create a simple dance routine
# Use a loop to repeat a sequence of moves
# Suggested moves:
#   - Raise both arms up, then down
#   - Tilt head left, then right
#   - Combine arm and head moves for a funky dance

for i in range(2):
    # Add your dance moves here
    pass`,
    });

    initEditor('dance-ex3-editor', {
      editorId: 'editor-dance-ex3',
      previewContainerId: 'preview-dance-ex3',
      outputId: 'output-dance-ex3',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)
tts.say("Macarena time!")

# TODO: Program the Macarena (simplified)
# Step 1: Right arm out (RShoulderPitch = 0, RElbowRoll = 0)
# Step 2: Left arm out (LShoulderPitch = 0, LElbowRoll = 0)
# Step 3: Right palm up (RElbowRoll = 1.5)
# Step 4: Left palm up (LElbowRoll = -1.5)
# Step 5: Right hand to left shoulder (RShoulderRoll = -0.3)
# Step 6: Left hand to right shoulder (LShoulderRoll = 0.3)
# Step 7: Hands behind head
# Step 8: Hands on hips
# Repeat!`,
    });
  }

  // ── Module 5: Sense and Act ──

  if (pageId === 'senses-nao') {
    initEditor('senses-nao-editor', {
      editorId: 'editor-senses-nao',
      previewContainerId: 'preview-senses-nao',
      outputId: 'output-senses-nao',
      defaultCode:
`from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
motion = ALProxy("ALMotion", "<robot_ip>", 9559)

# NAO introduces its senses
senses = [
    ("I have two cameras for sight!", 0.3),
    ("Four microphones for hearing!", -0.3),
    ("Touch sensors on my head!", -0.5),
    ("Bumpers on my feet!", 0.5),
    ("And sonar for echolocation!", 0.0),
]

for phrase, head_angle in senses:
    motion.angleInterpolation(["HeadPitch"], [head_angle], [0.5], True)
    tts.say(phrase)

motion.angleInterpolation(["HeadPitch"], [0.0], [0.5], True)
tts.say("Those are all my senses!")`,
    });
  }

  if (pageId === 'finite-state-machines') {
    initEditor('fsm-editor', {
      editorId: 'editor-fsm',
      previewContainerId: 'preview-fsm',
      outputId: 'output-fsm',
      defaultCode:
`from naoqi import ALProxy

leds = ALProxy("ALLeds", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

# Finite State Machine: happy/sad mood
state = "happy"
leds.fadeRGB("FaceLeds", 0x00FF00, 0.3)
tts.say("I start happy!")

# Simulate a series of events
events = ["frown", "frown", "smile", "frown", "smile"]

for event in events:
    if state == "happy":
        if event == "frown":
            state = "sad"
            leds.fadeRGB("FaceLeds", 0x0000FF, 0.3)
            tts.say("Oh no, now I am sad.")
        else:
            tts.say("Still happy!")
    elif state == "sad":
        if event == "smile":
            state = "happy"
            leds.fadeRGB("FaceLeds", 0x00FF00, 0.3)
            tts.say("Yay, happy again!")
        else:
            tts.say("Still sad...")

leds.fadeRGB("FaceLeds", 0x000000, 0.3)
tts.say("Final state: " + state)`,
    });
  }

  if (pageId === 'sensors-actuators') {
    initEditor('sensors-actuators-editor', {
      editorId: 'editor-sensors-actuators',
      previewContainerId: 'preview-sensors-actuators',
      outputId: 'output-sensors-actuators',
      defaultCode:
`from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)
tts.say("Watch me pose my arms using joint angles!")

# Raise right arm and bend elbow
motion.setAngles(
    ["RShoulderPitch", "RShoulderRoll", "RElbowRoll"],
    [-0.5, -0.3, 1.0], 0.3)

tts.say("Right arm up!")

# Mirror to left arm (negate roll angles)
motion.setAngles(
    ["LShoulderPitch", "LShoulderRoll", "LElbowRoll"],
    [-0.5, 0.3, -1.0], 0.3)

tts.say("Left arm mirrors the right!")

# Both arms forward
motion.setAngles(
    ["RShoulderPitch", "LShoulderPitch",
     "RElbowRoll", "LElbowRoll"],
    [0.2, 0.2, 0.1, -0.1], 0.3)

tts.say("Both arms forward!")
posture.goToPosture("Stand", 0.5)`,
    });
  }

  if (pageId === 'leds-bumpers') {
    initEditor('leds-bumpers-editor', {
      editorId: 'editor-leds-bumpers',
      previewContainerId: 'preview-leds-bumpers',
      outputId: 'output-leds-bumpers',
      defaultCode:
`from naoqi import ALProxy
import time

leds = ALProxy("ALLeds", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

tts.say("Watch my eyes change color!")

# Set eye LEDs to red (hex color as int)
leds.fadeRGB("FaceLeds", 0xFF0000, 0.5)
tts.say("Red means stop!")

# Set eye LEDs to green
leds.fadeRGB("FaceLeds", 0x00FF00, 0.5)
tts.say("Green means go!")

# Set eye LEDs to blue
leds.fadeRGB("FaceLeds", 0x0000FF, 0.5)
tts.say("Blue is my favorite color!")

# Turn off LEDs
leds.fadeRGB("FaceLeds", 0x000000, 0.5)`,
    });
  }

  if (pageId === 'sense-exercises') {
    initEditor('sense-ex1-editor', {
      editorId: 'editor-sense-ex1',
      previewContainerId: 'preview-sense-ex1',
      outputId: 'output-sense-ex1',
      defaultCode:
`from naoqi import ALProxy

leds = ALProxy("ALLeds", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

# TODO: Create a traffic light sequence
# 1. Red light - NAO says "Stop!"
# 2. Yellow light (0xFFFF00) - NAO says "Get ready..."
# 3. Green light - NAO says "Go!"
# Use fadeRGB with appropriate colors and delays

tts.say("Traffic light starting!")
leds.fadeRGB("FaceLeds", 0xFF0000, 0.5)
tts.say("Stop!")`,
    });

    initEditor('sense-ex2-editor', {
      editorId: 'editor-sense-ex2',
      previewContainerId: 'preview-sense-ex2',
      outputId: 'output-sense-ex2',
      defaultCode:
`from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
leds = ALProxy("ALLeds", "<robot_ip>", 9559)
motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

# TODO: Build a finite state machine with 3+ states
# State machine: IDLE -> ALERT -> ACTIVE -> IDLE
# IDLE: LEDs blue, NAO says "Waiting..."
# ALERT: LEDs yellow, NAO says "Something detected!"
# ACTIVE: LEDs green, NAO walks forward, says "Moving!"

state = "IDLE"
events = ["sensor_trigger", "confirmed", "done"]

# Process each event
for event in events:
    tts.say("Current state: " + state)`,
    });

    initEditor('sense-ex3-editor', {
      editorId: 'editor-sense-ex3',
      previewContainerId: 'preview-sense-ex3',
      outputId: 'output-sense-ex3',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)
tts.say("Mirror mode! I will copy my right arm with my left.")

# Read right arm angles
right_angles = motion.getAngles(
    ["RShoulderPitch", "RShoulderRoll", "RElbowRoll"], True
)

# TODO: Mirror the right arm to the left arm
# Key insight: some joints need to be negated for mirroring
# RShoulderPitch -> LShoulderPitch (same sign)
# RShoulderRoll -> LShoulderRoll (negate!)
# RElbowRoll -> LElbowRoll (negate!)

# First, move right arm to a pose
motion.angleInterpolation(
    ["RShoulderPitch", "RShoulderRoll", "RElbowRoll"],
    [0.2, -0.5, 1.0],
    [1.0, 1.0, 1.0],
    True
)

tts.say("Now mirroring to left arm!")`,
    });
  }

  // ── Module 6: Do the Robot ──

  if (pageId === 'parallel-motion') {
    initEditor('parallel-motion-editor', {
      editorId: 'editor-parallel-motion',
      previewContainerId: 'preview-parallel-motion',
      outputId: 'output-parallel-motion',
      defaultCode:
`import threading
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
leds = ALProxy("ALLeds", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

def arm_dance():
    for i in range(3):
        motion.angleInterpolation(
            ["RShoulderPitch", "LShoulderPitch"],
            [-1.0, 0.5], [0.8, 0.8], True)
        motion.angleInterpolation(
            ["RShoulderPitch", "LShoulderPitch"],
            [0.5, -1.0], [0.8, 0.8], True)

def head_dance():
    for i in range(4):
        motion.angleInterpolation(["HeadPitch"], [0.3], [0.5], True)
        motion.angleInterpolation(["HeadPitch"], [-0.3], [0.5], True)

def led_dance():
    colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00]
    for c in colors:
        leds.fadeRGB("FaceLeds", c, 0.5)

tts.say("Robot dance time!")

# Start all layers simultaneously
threads = [
    threading.Thread(target=arm_dance),
    threading.Thread(target=head_dance),
    threading.Thread(target=led_dance),
]
for t in threads:
    t.start()
for t in threads:
    t.join()

leds.fadeRGB("FaceLeds", 0x000000, 0.3)
tts.say("Dance complete!")`,
    });
  }

  if (pageId === 'odometry') {
    initEditor('odometry-editor', {
      editorId: 'editor-odometry',
      previewContainerId: 'preview-odometry',
      outputId: 'output-odometry',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)
tts.say("Walking in a circle!")

# Walk in a circle using small arc steps
# Each step: walk forward a bit while turning
steps = 8
turn_per_step = 2 * math.pi / steps  # Full circle in 8 steps

for i in range(steps):
    motion.moveTo(0.15, 0, turn_per_step)
    print("Step " + str(i+1) + " / " + str(steps))

tts.say("Circle complete!")
posture.goToPosture("Sit", 0.5)`,
    });
  }

  if (pageId === 'robot-exercises') {
    initEditor('robot-ex1-editor', {
      editorId: 'editor-robot-ex1',
      previewContainerId: 'preview-robot-ex1',
      outputId: 'output-robot-ex1',
      defaultCode:
`import threading
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

# TODO: Create at least 3 parallel behavior layers
# Layer 1: Arm motions (raise/lower arms in a loop)
# Layer 2: Head bobbing (nod or shake head)
# Layer 3: Speech (say words at intervals)

# Use threading.Thread(target=function_name)
# Start all threads, then join them

tts.say("Let me dance!")`,
    });

    initEditor('robot-ex2-editor', {
      editorId: 'editor-robot-ex2',
      previewContainerId: 'preview-robot-ex2',
      outputId: 'output-robot-ex2',
      defaultCode:
`import math
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
leds = ALProxy("ALLeds", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

# TODO: Walk a square with different actions on each edge
# Side 1: speak
# Side 2: flash LEDs
# Side 3: wave arm
# Side 4: nod head
# Each side: moveTo(0.3, 0, 0) then turn 90 degrees

actions = ["speak", "leds", "wave", "nod"]
for action in actions:
    motion.moveTo(0.3, 0, 0)
    tts.say("Doing " + action)
    motion.moveTo(0, 0, math.pi / 2)`,
    });

    initEditor('robot-ex3-editor', {
      editorId: 'editor-robot-ex3',
      previewContainerId: 'preview-robot-ex3',
      outputId: 'output-robot-ex3',
      defaultCode:
`import math
import threading
from naoqi import ALProxy

motion = ALProxy("ALMotion", "<robot_ip>", 9559)
posture = ALProxy("ALRobotPosture", "<robot_ip>", 9559)
tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
leds = ALProxy("ALLeds", "<robot_ip>", 9559)

posture.goToPosture("Stand", 0.5)

# TODO: Walk in a circle while dancing
# 1. Create head_layer and led_layer functions
# 2. Use a 'dancing' flag that threads check
# 3. Walk in a circle (8 steps of moveTo with turn)
# 4. Set dancing = False when circle is complete

tts.say("Circle dance starting!")`,
    });
  }

  // ── Module 7: AI x NAO ──

  if (pageId === 'ai-api-key') {
    // Check and show existing key status
    setTimeout(() => updateKeyStatus('api-key-status-page'), 100);
  }

  if (pageId === 'ai-first-call') {
    initEditor('ai-first-call-editor', {
      editorId: 'editor-ai-first-call',
      outputId: 'output-ai-first-call',
      defaultCode:
`# Change the prompt to ask the AI anything!
prompt = "What is robotics in one sentence?"

# API_CALL: prompt`,
    });
  }

  if (pageId === 'ai-chat-loop') {
    initEditor('ai-chat-loop-editor', {
      editorId: 'editor-ai-chat-loop',
      outputId: 'output-ai-chat-loop',
      defaultCode:
`# Multi-turn conversation — edit the messages!
messages = [
    "My name is Danny.",
    "I'm studying robotics at Monmouth University.",
    "What's my name and what am I studying?",
]

# API_CHAT: messages`,
    });
  }

  if (pageId === 'ai-personality') {
    initEditor('ai-personality-editor', {
      editorId: 'editor-ai-personality',
      outputId: 'output-ai-personality',
      defaultCode:
`# Change the personality and questions!
system_prompt = "You are a sarcastic robot named NAO. You answer questions with witty, slightly sarcastic humor. Keep responses under 2 sentences."

messages = [
    "What's the meaning of life?",
    "Can you help me with my homework?",
]

# API_PERSONALITY: system_prompt, messages`,
    });
  }

  if (pageId === 'ai-nao-connect') {
    initEditor('ai-nao-connect-editor', {
      editorId: 'editor-ai-nao-connect',
      previewContainerId: 'preview-ai-nao-connect',
      outputId: 'output-ai-nao-connect',
      defaultCode:
`from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
leds = ALProxy("ALLeds", "<robot_ip>", 9559)

system_prompt = "You are a friendly NAO robot. Keep responses under 2 sentences."

# Simulate a conversation with AI + NAO
questions = [
    "What can you tell me about robots?",
    "What is your favorite thing to do?",
]

for question in questions:
    # LISTENING — Green LEDs
    leds.fadeRGB("FaceLeds", 0x00FF00, 0.3)
    print("Listening: " + question)

    # THINKING — Yellow LEDs
    leds.fadeRGB("FaceLeds", 0xFFFF00, 0.3)
    # API_NAO: system_prompt, question

    # SPEAKING — Blue LEDs
    leds.fadeRGB("FaceLeds", 0x0000FF, 0.3)
    tts.say(ai_response)

# Done
leds.fadeRGB("FaceLeds", 0x000000, 0.3)
tts.say("Great chat! Goodbye!")`,
    });
  }

  if (pageId === 'ai-exercises') {
    initEditor('ai-ex1-editor', {
      editorId: 'editor-ai-ex1',
      outputId: 'output-ai-ex1',
      defaultCode:
`# Exercise 1: Trivia Bot
# Ask the AI to generate trivia questions on different topics

topics = ["space", "animals", "history"]

for topic in topics:
    prompt = f"Give me one trivia question about {topic} with the answer on the next line."
    # API_CALL: prompt`,
    });

    initEditor('ai-ex2-editor', {
      editorId: 'editor-ai-ex2',
      outputId: 'output-ai-ex2',
      defaultCode:
`# Exercise 2: Language Translator
# Translate a sentence into multiple languages

sentence = "Hello, I am a robot and I love learning!"
languages = ["Spanish", "Japanese", "French"]

for lang in languages:
    prompt = f"Translate this to {lang}. Only output the translation: {sentence}"
    # API_CALL: prompt`,
    });

    initEditor('ai-ex3-editor', {
      editorId: 'editor-ai-ex3',
      previewContainerId: 'preview-ai-ex3',
      outputId: 'output-ai-ex3',
      defaultCode:
`# Exercise 3: AI Storyteller with NAO
from naoqi import ALProxy

tts = ALProxy("ALTextToSpeech", "<robot_ip>", 9559)
leds = ALProxy("ALLeds", "<robot_ip>", 9559)

# Ask AI for a story
story_prompt = "Tell a 3-sentence story about a friendly robot. One sentence per line. No extra text."
# API_STORY: story_prompt

# TODO: Split the story into sentences
# Loop through each sentence:
#   - Change LED color (use a different color per sentence)
#   - Have NAO say the sentence
# Turn off LEDs when done`,
    });
  }
}

/* === Hint toggles — also reveals the answer button === */
function toggleHint(btn) {
  const hintContent = btn.nextElementSibling;
  if (hintContent) {
    hintContent.classList.toggle('show');
    btn.textContent = hintContent.classList.contains('show') ? 'Hide Hint' : 'Show Hint';

    // When hint is shown, make the answer button visible (it stays visible even if hint is re-hidden)
    const answerBtn = hintContent.nextElementSibling;
    if (answerBtn && answerBtn.classList.contains('answer-toggle')) {
      answerBtn.classList.add('visible');
    }
  }
}

/* === Answer toggles === */
function toggleAnswer(btn) {
  const answerContent = btn.nextElementSibling;
  if (answerContent) {
    answerContent.classList.toggle('show');
    btn.textContent = answerContent.classList.contains('show') ? 'Hide Answer' : 'Show Answer';
  }
}

/* === Quiz reveal === */
function revealAnswer(btn) {
  const answer = btn.nextElementSibling;
  if (answer) {
    answer.classList.toggle('show');
    btn.textContent = answer.classList.contains('show') ? 'Hide Answer' : 'Reveal Answer';
  }
}

/* === Copy to clipboard === */
function copyToClipboard(btn) {
  const block = btn.closest('.terminal-block');
  if (block) {
    const text = block.querySelector('code').textContent;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    });
  }
}

/* === Gemini API Key Management === */
function saveGeminiKey(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const key = input.value.trim();
  if (!key) return;
  localStorage.setItem('gemini_api_key', key);
  input.value = '';
  // Update all status elements on page
  document.querySelectorAll('.api-key-status').forEach(el => {
    el.textContent = 'API key saved!';
    el.style.color = 'var(--success)';
  });
}

function clearGeminiKey(inputId) {
  localStorage.removeItem('gemini_api_key');
  document.querySelectorAll('.api-key-status').forEach(el => {
    el.textContent = 'API key cleared.';
    el.style.color = 'var(--danger)';
  });
}

function updateKeyStatus(statusId) {
  const el = document.getElementById(statusId);
  if (!el) return;
  const key = localStorage.getItem('gemini_api_key');
  if (key) {
    el.textContent = 'API key is saved (' + key.slice(0, 8) + '...)';
    el.style.color = 'var(--success)';
  } else {
    el.textContent = 'No API key saved yet.';
    el.style.color = 'var(--text-light)';
  }
}

/* === Gemini API Call from Browser === */
async function callGemini(prompt, systemPrompt, history) {
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    throw new Error('No API key found. Save your Gemini key on the "Get Your API Key" page first.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = { contents: [] };

  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  if (history && history.length > 0) {
    body.contents = history;
  } else {
    body.contents = [{ role: 'user', parts: [{ text: prompt }] }];
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    if (resp.status === 400) throw new Error('Invalid API key. Check your key and try again.');
    if (resp.status === 429) throw new Error('Rate limit reached. Wait a moment and try again.');
    throw new Error('API error: ' + (err.error?.message || resp.statusText));
  }

  const data = await resp.json();
  return data.candidates[0].content.parts[0].text;
}

/* === Run Gemini-enabled Editor === */
async function runGeminiEditor(editorKey) {
  const editor = editors[editorKey];
  if (!editor) return;

  const code = editor.getCode();
  const outputId = editor.outputId;
  const output = document.getElementById(outputId);
  if (output) output.textContent = '';

  function log(msg) {
    if (output) {
      output.textContent += msg + '\n';
      output.scrollTop = output.scrollHeight;
    }
  }

  // Check for API key
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    log('Error: No API key found. Go to "Get Your API Key" page and save your Gemini key first.');
    return;
  }

  try {
    // Parse the special comment directives in the code
    if (code.includes('# API_CALL:')) {
      // Single prompt mode — find all API_CALL comments and execute inline prompts
      // First, extract all variable assignments before API_CALL
      const lines = code.split('\n');
      const scope = {};

      for (const line of lines) {
        // Simple variable assignment parsing
        const assignMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (assignMatch) {
          try {
            // Handle f-strings by replacing {var} with scope values
            let val = assignMatch[2].trim();
            if (val.startsWith('f"') || val.startsWith("f'")) {
              val = val.slice(1); // remove f prefix
            }
            // Try to eval as JSON-compatible string
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              scope[assignMatch[1]] = val.slice(1, -1);
            } else if (val.startsWith('[')) {
              scope[assignMatch[1]] = JSON.parse(val.replace(/'/g, '"'));
            }
          } catch(e) {}
        }
      }

      // Find for loops with API_CALL inside
      const forMatch = code.match(/for\s+(\w+)\s+in\s+(\w+):\s*\n([\s\S]*?)(?=\n\S|\n*$)/);
      if (forMatch) {
        const loopVar = forMatch[1];
        const listName = forMatch[2];
        const loopBody = forMatch[3];
        const items = scope[listName] || [];

        for (const item of items) {
          // Find the prompt line with f-string variable substitution
          const promptMatch = loopBody.match(/(\w+)\s*=\s*f?["'](.+?)["']/);
          if (promptMatch) {
            let prompt = promptMatch[2].replace(new RegExp(`\\{${loopVar}\\}`, 'g'), item);
            log('> ' + prompt);
            const answer = await callGemini(prompt);
            log('AI: ' + answer + '\n');
          } else {
            // Check for API_CALL with variable reference
            const callMatch = loopBody.match(/# API_CALL:\s*(\w+)/);
            if (callMatch) {
              let prompt = scope[callMatch[1]] || callMatch[1];
              prompt = prompt.replace(new RegExp(`\\{${loopVar}\\}`, 'g'), item);
              log('> ' + prompt);
              const answer = await callGemini(prompt);
              log('AI: ' + answer + '\n');
            }
          }
        }
      } else {
        // Single API_CALL — extract the prompt variable
        const callMatch = code.match(/# API_CALL:\s*(\w+)/);
        if (callMatch) {
          const prompt = scope[callMatch[1]] || callMatch[1];
          log('> ' + prompt);
          const answer = await callGemini(prompt);
          log('AI: ' + answer);
        }
      }

    } else if (code.includes('# API_CHAT:')) {
      // Multi-turn chat mode
      const msgMatch = code.match(/messages\s*=\s*\[([\s\S]*?)\]/);
      if (msgMatch) {
        const messages = [];
        const msgItems = msgMatch[1].match(/"([^"]+)"|'([^']+)'/g);
        if (msgItems) {
          const history = [];
          for (const raw of msgItems) {
            const text = raw.slice(1, -1);
            log('You: ' + text);
            history.push({ role: 'user', parts: [{ text }] });
            const answer = await callGemini(null, null, [...history]);
            log('AI: ' + answer + '\n');
            history.push({ role: 'model', parts: [{ text: answer }] });
          }
        }
      }

    } else if (code.includes('# API_PERSONALITY:')) {
      // Personality mode — system prompt + messages
      const sysMatch = code.match(/system_prompt\s*=\s*["']([\s\S]*?)["']/);
      const msgMatch = code.match(/messages\s*=\s*\[([\s\S]*?)\]/);
      const systemPrompt = sysMatch ? sysMatch[1] : '';

      if (msgMatch) {
        const msgItems = msgMatch[1].match(/"([^"]+)"|'([^']+)'/g);
        if (msgItems) {
          log('System: ' + systemPrompt + '\n');
          const history = [];
          for (const raw of msgItems) {
            const text = raw.slice(1, -1);
            log('You: ' + text);
            history.push({ role: 'user', parts: [{ text }] });
            const answer = await callGemini(null, systemPrompt, [...history]);
            log('AI: ' + answer + '\n');
            history.push({ role: 'model', parts: [{ text: answer }] });
          }
        }
      }

    } else if (code.includes('# API_NAO:') || code.includes('# API_STORY:')) {
      // NAO + AI mode — run through Pyodide with real AI responses injected
      log('Loading Python interpreter...');

      const pyodide = await ensurePyodide();
      pyodide.runPython('_reset_actions()');

      // Extract system prompt and questions
      const sysMatch = code.match(/system_prompt\s*=\s*["']([\s\S]*?)["']/);
      const systemPrompt = sysMatch ? sysMatch[1] : '';

      if (code.includes('# API_STORY:')) {
        // Story mode — get story from AI, inject into code, run through NAO
        const storyPromptMatch = code.match(/story_prompt\s*=\s*["']([\s\S]*?)["']/);
        const storyPrompt = storyPromptMatch ? storyPromptMatch[1] : 'Tell a 3-sentence story about a robot.';

        log('Asking AI for a story...');
        const story = await callGemini(storyPrompt);
        log('AI story: ' + story + '\n');

        // Inject story into code and run
        let modifiedCode = code.replace(/# API_STORY:.*/, `ai_story = """${story}"""`);
        // If user hasn't written the split/say logic yet, auto-run with NAO
        if (!modifiedCode.includes('tts.say') || modifiedCode.includes('# TODO')) {
          modifiedCode += `
sentences = ai_story.strip().split("\\n")
sentences = [s for s in sentences if s.strip()]
colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF]
for i, sentence in enumerate(sentences):
    leds.fadeRGB("FaceLeds", colors[i % len(colors)], 0.3)
    tts.say(sentence)
leds.fadeRGB("FaceLeds", 0x000000, 0.3)`;
        }

        let processedCode = modifiedCode
          .replace(/^import\s+threading\s*$/gm, 'threading = _mock_threading')
          .replace(/^import\s+time\s*$/gm, 'import time as _time_ref; _time_ref.sleep = _mock_sleep; time = _time_ref');

        log('Running...');
        await pyodide.runPythonAsync(processedCode);
      } else {
        // NAO conversation mode — get AI responses for each question
        const qMatch = code.match(/questions\s*=\s*\[([\s\S]*?)\]/);
        const qItems = qMatch ? qMatch[1].match(/"([^"]+)"|'([^']+)'/g) : [];
        const questions = qItems ? qItems.map(q => q.slice(1, -1)) : [];

        // Get AI responses, then inject them into the code
        const responses = [];
        for (const q of questions) {
          log('Thinking about: ' + q);
          const answer = await callGemini(q, systemPrompt);
          responses.push(answer);
        }

        // Build modified code that injects ai_response for each question
        let modifiedCode = code.replace(/# API_NAO:.*/, '');
        // Replace the for loop with unrolled version that includes AI responses
        const loopStart = modifiedCode.indexOf('for question in questions:');
        if (loopStart >= 0) {
          const beforeLoop = modifiedCode.substring(0, loopStart);
          let unrolled = '';
          for (let i = 0; i < questions.length; i++) {
            unrolled += `
question = "${questions[i].replace(/"/g, '\\"')}"
leds.fadeRGB("FaceLeds", 0x00FF00, 0.3)
print("Listening: " + question)
leds.fadeRGB("FaceLeds", 0xFFFF00, 0.3)
ai_response = "${responses[i].replace(/"/g, '\\"').replace(/\n/g, ' ')}"
print("AI: " + ai_response)
leds.fadeRGB("FaceLeds", 0x0000FF, 0.3)
tts.say(ai_response)
`;
          }
          unrolled += `
leds.fadeRGB("FaceLeds", 0x000000, 0.3)
tts.say("Great chat! Goodbye!")`;
          modifiedCode = beforeLoop + unrolled;
        }

        let processedCode = modifiedCode
          .replace(/^import\s+threading\s*$/gm, 'threading = _mock_threading')
          .replace(/^import\s+time\s*$/gm, 'import time as _time_ref; _time_ref.sleep = _mock_sleep; time = _time_ref');

        log('Running...');
        await pyodide.runPythonAsync(processedCode);
      }

      // Execute captured NAO actions
      const actionsJson = pyodide.runPython('_get_actions()');
      const actions = JSON.parse(actionsJson);
      if (actions.length > 0 && editor.executeActions) {
        editor.executeActions(actions);
      } else {
        log('Done!');
      }

    } else {
      // No API directive — run as regular Pyodide code (for NAO-only editors)
      if (editor.run) {
        editor.run();
      }
    }

  } catch (e) {
    log('Error: ' + e.message);
  }
}

/* === Copy editor code to clipboard === */
function copyEditorCode(editorKey, btn) {
  const editor = editors[editorKey];
  if (!editor) return;
  const code = editor.getCode();
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy Code'; }, 2000);
  });
}

/* === Init on page load === */
document.addEventListener('DOMContentLoaded', () => {
  // Attach sidebar click handlers
  document.querySelectorAll('.sidebar-item[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // Navigate to hash or default
  const hash = window.location.hash.replace('#', '') || 'setup-nao';
  navigateTo(hash);

  // Listen for hash changes (back/forward buttons and direct link clicks)
  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.replace('#', '');
    if (newHash && PAGES.includes(newHash)) {
      navigateTo(newHash);
    }
  });
});
