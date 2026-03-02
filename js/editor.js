/* === Code Editor + Speech Integration (Pyodide-powered, sandboxed) === */

/* === Pyodide Loader === */
let pyodideReady = false;
let pyodideInstance = null;
let pyodideLoading = false;
const pyodideCallbacks = [];

async function ensurePyodide() {
  if (pyodideReady) return pyodideInstance;

  if (pyodideLoading) {
    return new Promise((resolve) => {
      pyodideCallbacks.push(resolve);
    });
  }

  pyodideLoading = true;

  try {
    pyodideInstance = await loadPyodide();

    // Install mock naoqi module + sandbox restrictions
    await pyodideInstance.runPythonAsync(`
import sys
import types

# ============================================================
# SANDBOX: Remove/block dangerous modules before student code runs
# ============================================================
_BLOCKED_MODULES = [
    "subprocess", "os", "shutil", "socket", "http", "urllib",
    "ftplib", "smtplib", "ctypes", "multiprocessing", "signal",
    "webbrowser", "pathlib", "tempfile", "glob", "importlib",
]
class _BlockedModule:
    """Raises an error when students try to import dangerous modules."""
    def __init__(self, name):
        self._name = name
    def __getattr__(self, attr):
        raise ImportError(
            "Module '{}' is not available in the browser simulator. "
            "This module is only available when running on a real robot.".format(self._name)
        )

for _mod_name in _BLOCKED_MODULES:
    sys.modules[_mod_name] = _BlockedModule(_mod_name)

# Block access to Pyodide's JS bridge (prevents DOM manipulation)
if "js" in sys.modules:
    sys.modules["js"] = _BlockedModule("js")
if "pyodide" in sys.modules:
    # Keep pyodide internals but block student access
    _real_pyodide = sys.modules["pyodide"]
if "pyodide.ffi" in sys.modules:
    sys.modules["pyodide.ffi"] = _BlockedModule("pyodide.ffi")

# ============================================================
# Action queue (must be defined before mocks that reference it)
# ============================================================
_nao_actions = []

# ============================================================
# MOCK: threading module (Pyodide/WASM is single-threaded)
# Thread.start() runs the target function sequentially instead of
# spawning a real thread, which would crash with RuntimeError.
# ============================================================
import types as _types

_mock_threading = _types.ModuleType("threading")

_MAX_THREAD_ACTIONS = 20  # Max actions per thread to prevent infinite loops
_thread_action_counter = [0]  # Mutable counter for current thread
_in_mock_thread = [False]  # True when running inside a mock Thread.start()

class _ThreadActionLimit(Exception):
    """Raised internally to break out of infinite while-loops in mock threads."""
    pass

def _thread_check():
    """Called after each NAO action inside a thread to enforce the cap."""
    if not _in_mock_thread[0]:
        return  # Only enforce limit inside mock threads
    _thread_action_counter[0] += 1
    if _thread_action_counter[0] > _MAX_THREAD_ACTIONS:
        raise _ThreadActionLimit()

class _MockThread:
    """Mock Thread that runs the target function sequentially on start().
    Caps total actions to prevent infinite while-loops from hanging."""
    def __init__(self, target=None, args=(), kwargs=None, name=None, daemon=None, group=None):
        self._target = target
        self._args = args
        self._kwargs = kwargs or {}
        self.name = name or "Thread"
        self.daemon = daemon
        self._started = False
        self._alive = False

    def start(self):
        self._started = True
        self._alive = True
        if self._target:
            _thread_action_counter[0] = 0
            _in_mock_thread[0] = True
            try:
                self._target(*self._args, **self._kwargs)
            except _ThreadActionLimit:
                pass  # Thread hit its action cap — normal for while-loop threads
            finally:
                _in_mock_thread[0] = False
        self._alive = False

    def join(self, timeout=None):
        pass  # Already finished since start() runs synchronously

    def is_alive(self):
        return self._alive

    def isAlive(self):
        return self._alive

_mock_threading.Thread = _MockThread
_mock_threading.Lock = lambda: type('Lock', (), {'acquire': lambda s, *a: True, 'release': lambda s: None, '__enter__': lambda s: s, '__exit__': lambda s, *a: None})()
_mock_threading.RLock = _mock_threading.Lock
_mock_threading.Event = lambda: type('Event', (), {'set': lambda s: None, 'clear': lambda s: None, 'wait': lambda s, t=None: True, 'is_set': lambda s: True})()
_mock_threading.current_thread = lambda: _MockThread(name="MainThread")
_mock_threading.main_thread = lambda: _MockThread(name="MainThread")
_mock_threading.active_count = lambda: 1
_mock_threading.enumerate = lambda: [_MockThread(name="MainThread")]

# Patch BOTH ways to handle Pyodide's pre-loaded modules:
# 1) First, grab and patch the REAL threading module if already loaded
#    (Pyodide pre-loads it during loadPyodide())
if "threading" in sys.modules:
    _real_threading_mod = sys.modules["threading"]
    _real_threading_mod.Thread = _MockThread
    _real_threading_mod.Lock = _mock_threading.Lock
    _real_threading_mod.RLock = _mock_threading.RLock
    _real_threading_mod.Event = _mock_threading.Event
# 2) Also replace in sys.modules (catches any edge cases)
sys.modules["threading"] = _mock_threading

# ============================================================
# MOCK: time.sleep (blocks browser main thread in WASM)
# Replace with a no-op. Record a small delay action so the
# simulator can space out animations.
# ============================================================
import time as _real_time
_original_sleep = _real_time.sleep

def _mock_sleep(seconds):
    """No-op sleep that records a delay action for the simulator."""
    _nao_actions.append({
        "type": "delay",
        "seconds": float(seconds),
    })
    _thread_check()  # Enforce action cap if running in a mock thread

_real_time.sleep = _mock_sleep

# ============================================================
# CAPTURE: print() output → _nao_actions as log entries
# ============================================================
import io as _io

class _OutputCapture(_io.TextIOBase):
    """Captures print() output and stores it as log actions."""
    def write(self, text):
        if text and text.strip():
            _nao_actions.append({
                "type": "log",
                "text": text.rstrip(),
            })
        return len(text) if text else 0

    def flush(self):
        pass

sys.stdout = _OutputCapture()
sys.stderr = _OutputCapture()

# ============================================================
# NAOqi Mock
# ============================================================

_VALID_MODULES = {
    "ALTextToSpeech", "ALMotion", "ALRobotPosture", "ALSpeechRecognition",
    "ALFaceDetection", "ALSonar", "ALVideoDevice", "ALLeds", "ALMemory",
    "ALBehaviorManager", "ALAudioDevice", "ALAudioPlayer", "ALAnimatedSpeech",
    "ALAutonomousLife", "ALBasicAwareness", "ALBodyTemperature",
    "ALConnectionManager", "ALDiagnosis", "ALFaceCharacteristics",
    "ALLandMarkDetection", "ALLocalization", "ALNavigation",
    "ALNotificationManager", "ALPeoplePerception", "ALPhotoCapture",
    "ALRedBallDetection", "ALSensors", "ALSittingPeopleDetection",
    "ALSoundDetection", "ALSoundLocalization", "ALSystem",
    "ALTabletService", "ALTouch", "ALTracker", "ALVideoRecorder",
    "ALVisionRecognition", "ALWorldRepresentation", "ALBattery",
}

class _MockALProxy:
    """Mock ALProxy that validates module names and captures calls."""
    def __init__(self, module_name, ip="", port=9559):
        if module_name not in _VALID_MODULES:
            raise RuntimeError(
                "ALProxy::ALProxy\\n\\tCannot find module '{}'. "
                "Check the module name spelling.".format(module_name)
            )
        self._module = module_name
        self._params = {"speed": 100, "pitchShift": 1.0}

    def say(self, text):
        if self._module != "ALTextToSpeech":
            raise RuntimeError(
                "Module '{}' has no method 'say'. "
                "Did you mean to use ALTextToSpeech?".format(self._module)
            )
        _nao_actions.append({
            "type": "say",
            "text": str(text),
            "speed": self._params.get("speed", 100),
            "pitch": self._params.get("pitchShift", 1.0),
        })
        _thread_check()

    def setParameter(self, name, value):
        self._params[name] = float(value)

    # ALMotion methods
    def moveTo(self, x, y, theta):
        if self._module != "ALMotion":
            raise RuntimeError(
                "Module '{}' has no method 'moveTo'. "
                "Did you mean to use ALMotion?".format(self._module)
            )
        _nao_actions.append({
            "type": "walk",
            "x": float(x),
            "y": float(y),
            "theta": float(theta),
        })
        _thread_check()

    def walkTo(self, x, y, theta):
        if self._module != "ALMotion":
            raise RuntimeError(
                "Module '{}' has no method 'walkTo'. "
                "Did you mean to use ALMotion?".format(self._module)
            )
        _nao_actions.append({
            "type": "walk",
            "x": float(x),
            "y": float(y),
            "theta": float(theta),
        })
        _thread_check()

    def moveToward(self, vx, vy, vtheta):
        if self._module != "ALMotion":
            raise RuntimeError(
                "Module '{}' has no method 'moveToward'. "
                "Did you mean to use ALMotion?".format(self._module)
            )
        _nao_actions.append({
            "type": "walk_toward",
            "vx": float(vx),
            "vy": float(vy),
            "vtheta": float(vtheta),
        })
        _thread_check()

    def setExternalCollisionProtectionEnabled(self, name, enabled):
        if self._module != "ALMotion":
            raise RuntimeError(
                "Module '{}' has no method 'setExternalCollisionProtectionEnabled'. "
                "Did you mean to use ALMotion?".format(self._module)
            )
        # No-op in simulator — just log
        _nao_actions.append({
            "type": "log",
            "text": "Collision protection for '{}' set to {}".format(name, enabled),
        })

    # ALRobotPosture methods
    def goToPosture(self, posture_name, speed):
        if self._module != "ALRobotPosture":
            raise RuntimeError(
                "Module '{}' has no method 'goToPosture'. "
                "Did you mean to use ALRobotPosture?".format(self._module)
            )
        _nao_actions.append({
            "type": "posture",
            "posture": str(posture_name),
            "speed": float(speed),
        })

    # ALMotion joint control methods
    def angleInterpolation(self, names, angles, times, is_absolute):
        if self._module != "ALMotion":
            raise RuntimeError(
                "Module '{}' has no method 'angleInterpolation'. "
                "Did you mean to use ALMotion?".format(self._module)
            )
        if isinstance(names, str):
            names = [names]
            angles = [angles] if not isinstance(angles, list) else angles
            times = [times] if not isinstance(times, list) else times

        # Flatten angles — could be [0.5, 1.0] or [[0.5], [1.0]]
        flat_angles = []
        for a in (angles if isinstance(angles, list) else [angles]):
            if isinstance(a, (list, tuple)):
                flat_angles.append(float(a[-1]))  # use final keyframe
            else:
                flat_angles.append(float(a))

        # Flatten times — could be [1.0, 1.0] or [[0.5], [0.5]]
        flat_times = []
        for t in (times if isinstance(times, list) else [times]):
            if isinstance(t, (list, tuple)):
                flat_times.append(float(t[-1]))  # use final keyframe time
            else:
                flat_times.append(float(t))

        _nao_actions.append({
            "type": "joint_move",
            "names": list(names),
            "angles": flat_angles,
            "times": flat_times,
            "absolute": bool(is_absolute),
        })
        _thread_check()

    def setAngles(self, names, angles, speed):
        if self._module != "ALMotion":
            raise RuntimeError(
                "Module '{}' has no method 'setAngles'. "
                "Did you mean to use ALMotion?".format(self._module)
            )
        if isinstance(names, str):
            names = [names]
            angles = [angles] if not isinstance(angles, list) else angles
        _nao_actions.append({
            "type": "joint_move",
            "names": list(names),
            "angles": [float(a) for a in angles],
            "times": [0.5] * len(names),
            "absolute": True,
        })
        _thread_check()

    def getAngles(self, names, use_sensors):
        if self._module != "ALMotion":
            raise RuntimeError(
                "Module '{}' has no method 'getAngles'. "
                "Did you mean to use ALMotion?".format(self._module)
            )
        if isinstance(names, str):
            names = [names]
        # Return simulated zero angles
        return [0.0] * len(names)

    def setWalkTargetVelocity(self, vx, vy, vtheta, frequency):
        if self._module != "ALMotion":
            raise RuntimeError(
                "Module '{}' has no method 'setWalkTargetVelocity'. "
                "Did you mean to use ALMotion?".format(self._module)
            )
        _nao_actions.append({
            "type": "walk_velocity",
            "vx": float(vx),
            "vy": float(vy),
            "vtheta": float(vtheta),
            "frequency": float(frequency),
        })
        _thread_check()

    def setWalkArmsEnable(self, left, right):
        if self._module != "ALMotion":
            raise RuntimeError(
                "Module '{}' has no method 'setWalkArmsEnable'. "
                "Did you mean to use ALMotion?".format(self._module)
            )
        _nao_actions.append({
            "type": "log",
            "text": "Walk arms enabled: left={}, right={}".format(left, right),
        })

    def getRobotPosition(self, use_sensors):
        if self._module != "ALMotion":
            raise RuntimeError(
                "Module '{}' has no method 'getRobotPosition'. "
                "Did you mean to use ALMotion?".format(self._module)
            )
        # Return simulated position [x, y, theta]
        return [0.0, 0.0, 0.0]

    # ALLeds methods
    def fadeRGB(self, led_name, color, duration):
        if self._module != "ALLeds":
            raise RuntimeError(
                "Module '{}' has no method 'fadeRGB'. "
                "Did you mean to use ALLeds?".format(self._module)
            )
        _nao_actions.append({
            "type": "led",
            "group": str(led_name),
            "color": int(color),
            "duration": float(duration),
        })
        _thread_check()

    # ALSpeechRecognition methods
    def setVocabulary(self, words, enable_word_spotting):
        if self._module != "ALSpeechRecognition":
            raise RuntimeError(
                "Module '{}' has no method 'setVocabulary'. "
                "Did you mean to use ALSpeechRecognition?".format(self._module)
            )
        _nao_actions.append({
            "type": "log",
            "text": "Speech vocabulary set: " + ", ".join(str(w) for w in words),
        })

    def subscribe(self, name):
        _nao_actions.append({
            "type": "log",
            "text": "Subscribed: " + str(name),
        })

    def unsubscribe(self, name):
        _nao_actions.append({
            "type": "log",
            "text": "Unsubscribed: " + str(name),
        })

    def setLanguage(self, language):
        if self._module != "ALSpeechRecognition":
            raise RuntimeError(
                "Module '{}' has no method 'setLanguage'. "
                "Did you mean to use ALSpeechRecognition?".format(self._module)
            )
        _nao_actions.append({
            "type": "log",
            "text": "Language set to: " + str(language),
        })

    # ALMemory methods
    def getData(self, key):
        if self._module != "ALMemory":
            raise RuntimeError(
                "Module '{}' has no method 'getData'. "
                "Did you mean to use ALMemory?".format(self._module)
            )
        # Return simulated empty data
        return None

    def __getattr__(self, name):
        def noop(*args, **kwargs):
            pass
        return noop

naoqi = types.ModuleType("naoqi")
naoqi.ALProxy = _MockALProxy
sys.modules["naoqi"] = naoqi

def _reset_actions():
    global _nao_actions
    _nao_actions = []
    _thread_action_counter[0] = 0
    _in_mock_thread[0] = False

def _get_actions():
    import json
    return json.dumps(_nao_actions)
`);

    pyodideReady = true;

    for (const cb of pyodideCallbacks) {
      cb(pyodideInstance);
    }
    pyodideCallbacks.length = 0;

    return pyodideInstance;
  } catch (e) {
    console.error('Failed to load Pyodide:', e);
    pyodideLoading = false;
    throw e;
  }
}

/* === Global Speech Unlock ===
 * Browsers block speechSynthesis until a user gesture triggers it.
 * We unlock it once on the first click anywhere on the page, then
 * all future speak() calls work — even after async code.
 */
let speechUnlocked = false;

function unlockSpeech() {
  if (speechUnlocked) return;
  const synth = window.speechSynthesis;
  if (!synth) return;

  // A real utterance (single space) at full volume — this is the only
  // way to reliably unlock speech across Chrome, Safari, Firefox.
  synth.cancel();
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0.01;  // near-silent but not zero (zero doesn't count)
  u.rate = 10;       // fastest possible so it's instant
  synth.speak(u);
  speechUnlocked = true;
}

// Attach to first user interaction
document.addEventListener('click', unlockSpeech, { once: true });
document.addEventListener('keydown', unlockSpeech, { once: true });

/* === NaoEditor Class === */

class NaoEditor {
  constructor(options) {
    this.editorElement = document.getElementById(options.editorId);
    this.previewContainerId = options.previewContainerId;
    this.outputId = options.outputId;
    this.defaultCode = options.defaultCode || '';
    this.simulator = null;
    this.codeMirror = null;
    this.speechSynth = window.speechSynthesis;
    this.isSpeaking = false;

    this.init();
  }

  init() {
    if (this.editorElement && typeof CodeMirror !== 'undefined') {
      this.codeMirror = CodeMirror(this.editorElement, {
        value: this.defaultCode,
        mode: 'python',
        theme: 'monokai',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: true,
        viewportMargin: Infinity,
      });
    }

    if (this.previewContainerId) {
      this.simulator = new NAOSimulator(this.previewContainerId);
    }
  }

  getCode() {
    if (this.codeMirror) {
      return this.codeMirror.getValue();
    }
    return '';
  }

  setCode(code) {
    if (this.codeMirror) {
      this.codeMirror.setValue(code);
    }
  }

  resetCode() {
    this.setCode(this.defaultCode);
    this.clearOutput();
    this.stop();
  }

  async run() {
    const code = this.getCode();
    this.clearOutput();

    // Reset robot position/heading for fresh run
    if (this.simulator) {
      this.simulator.resetPosition();
      this.simulator.setAnimation('idle');
    }

    this.log('Loading Python interpreter...');

    try {
      const pyodide = await ensurePyodide();

      // Reset the action queue
      pyodide.runPython('_reset_actions()');

      this.log('Running...');

      // Pre-process: replace "import threading" with our mock reference
      // so student code always uses the browser-safe mock, even if
      // Pyodide's import system bypasses sys.modules for cached modules.
      let processedCode = code
        .replace(/^import\s+threading\s*$/gm, 'threading = _mock_threading')
        .replace(/^from\s+threading\s+import\s+(.+)$/gm, (match, imports) => {
          return imports.split(',').map(i => {
            const name = i.trim();
            return `${name} = _mock_threading.${name}`;
          }).join('\n');
        })
        .replace(/^import\s+time\s*$/gm, 'import time as _time_ref; _time_ref.sleep = _mock_sleep; time = _time_ref');

      // Execute with a timeout to catch infinite loops
      try {
        await this._runWithTimeout(pyodide, processedCode, 10000); // 10 second limit
      } catch (pyErr) {
        if (pyErr.message === '__TIMEOUT__') {
          this.log('Error: Code took too long to execute (10s limit). Check for infinite loops.');
          return;
        }
        const errMsg = pyErr.message || String(pyErr);
        const lines = errMsg.split('\n');
        // Filter out internal Pyodide frames, keep student-relevant lines
        const useful = lines.filter(l =>
          !l.includes('wasm') && !l.includes('pyodide') &&
          !l.includes('JsException') && l.trim() !== ''
        );
        this.log('Error: ' + (useful.length > 0 ? useful.join('\n') : errMsg));
        return;
      }

      // Retrieve captured actions
      const actionsJson = pyodide.runPython('_get_actions()');
      const actions = JSON.parse(actionsJson);

      if (actions.length === 0) {
        this.log('Code ran successfully but no NAO actions were detected.');
        return;
      }

      this.executeActions(actions);

    } catch (e) {
      this.log('Error loading Python: ' + e.message);
    }
  }

  /**
   * Run Python code with a timeout to catch infinite loops.
   */
  async _runWithTimeout(pyodide, code, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // Pyodide runs in the main thread so we can't truly kill it,
        // but we can interrupt via keyboard interrupt
        try { pyodide.runPython('raise KeyboardInterrupt()'); } catch(e) {}
        reject(new Error('__TIMEOUT__'));
      }, timeoutMs);

      pyodide.runPythonAsync(code)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  executeActions(actions) {
    let index = 0;
    this._stopped = false;

    const next = () => {
      // Check if stop was pressed
      if (this._stopped) {
        this.log('Stopped.');
        return;
      }

      if (index >= actions.length) {
        this.log('Done!');
        if (this.simulator) {
          // Smoothly return to standing pose, then stop after a delay
          this.simulator.resetJointsSmooth(1.0);
          setTimeout(() => this.simulator.stopAnimation(), 2000);
        }
        this.isSpeaking = false;
        return;
      }

      const action = actions[index];
      index++;

      if (action.type === 'say') {
        this.log(`NAO says: "${action.text}"`);

        if (this.simulator) {
          this.simulator.setAnimation('talking');
        }

        this.speak(action.text, action.speed, action.pitch, () => {
          if (this._stopped) return;
          setTimeout(next, 300);
        });

      } else if (action.type === 'walk') {
        const dist = Math.sqrt(action.x * action.x + action.y * action.y);
        const angleDeg = (action.theta * 180 / Math.PI).toFixed(1);
        if (Math.abs(action.theta) > 0.001) {
          this.log(`NAO turns ${angleDeg}\u00B0`);
        }
        if (dist > 0.001) {
          this.log(`NAO walks ${dist.toFixed(2)}m (x=${action.x}, y=${action.y})`);
        }

        // After optional turn completes, do the walk
        const doWalk = () => {
          if (this._stopped) return;
          if (dist > 0.001 && this.simulator) {
            const walkMs = Math.max(800, dist * 2500);
            this.simulator.walkForward(dist, walkMs, () => {
              if (this._stopped) return;
              setTimeout(next, 200);
            });
          } else {
            setTimeout(next, 200);
          }
        };

        // Turn first if there's an angle, then walk
        if (Math.abs(action.theta) > 0.001 && this.simulator) {
          const turnMs = Math.max(600, Math.abs(action.theta) * 700);
          this.simulator.turnBy(action.theta, turnMs, doWalk);
        } else {
          doWalk();
        }

      } else if (action.type === 'walk_toward') {
        this.log(`NAO walking toward (vx=${action.vx}, vy=${action.vy}, vtheta=${action.vtheta})`);
        if (this.simulator) {
          this.simulator.setAnimation('walking');
        }
        setTimeout(() => {
          if (this._stopped) return;
          if (this.simulator) this.simulator.setAnimation('idle');
          setTimeout(next, 200);
        }, 1500);

      } else if (action.type === 'posture') {
        this.log(`NAO posture → ${action.posture}`);
        if (this.simulator) {
          if (action.posture === 'Sit') {
            this.simulator.setAnimation('sitting');
          } else {
            // "Stand" or any other posture: smoothly reset all joints to neutral
            this.simulator.resetJointsSmooth(0.6);
          }
        }
        setTimeout(() => {
          if (this._stopped) return;
          next();
        }, 800);

      } else if (action.type === 'joint_move') {
        const jointNames = action.names.join(', ');
        const anglesDeg = action.angles.map(a => (a * 180 / Math.PI).toFixed(1) + '\u00B0');
        this.log(`NAO joints [${jointNames}] \u2192 [${anglesDeg.join(', ')}]`);

        const maxTime = Math.max(...action.times);

        if (this.simulator) {
          // Set target angles on the 3D model — simulator smoothly animates to them
          for (let i = 0; i < action.names.length; i++) {
            const name = action.names[i];
            const angle = action.angles[i] !== undefined ? action.angles[i] : 0;
            const time = action.times[i] !== undefined ? action.times[i] : maxTime;
            this.simulator.setJointAngle(name, angle, time);
          }
        }

        // Wait for the animation to play out, then proceed
        const waitMs = Math.max(400, maxTime * 1000);
        setTimeout(() => {
          if (this._stopped) return;
          next();
        }, waitMs);

      } else if (action.type === 'led') {
        const colorInt = action.color & 0xFFFFFF;
        const hex = '#' + colorInt.toString(16).padStart(6, '0');
        this.log(`NAO LEDs [${action.group}] \u2192 ${hex}`);

        // Change eye colors on the 3D model
        if (this.simulator) {
          const threeColor = new THREE.Color(colorInt);
          const group = action.group.toLowerCase();

          // Determine which parts to change based on LED group name
          const changeBoth = group.includes('face') || group.includes('all') || group.includes('brain');
          const changeLeft = changeBoth || group.includes('left');
          const changeRight = changeBoth || group.includes('right');

          if (this.simulator.parts.leftEye && (changeLeft || changeBoth || !group.includes('left') && !group.includes('right'))) {
            this.simulator.parts.leftEye.material = this.simulator.parts.leftEye.material.clone();
            this.simulator.parts.leftEye.material.color.copy(threeColor);
            this.simulator.parts.leftEye.material.emissive.copy(threeColor);
            this.simulator.parts.leftEye.material.emissiveIntensity = colorInt === 0 ? 0.05 : 0.6;
          }
          if (this.simulator.parts.rightEye && (changeRight || changeBoth || !group.includes('left') && !group.includes('right'))) {
            this.simulator.parts.rightEye.material = this.simulator.parts.rightEye.material.clone();
            this.simulator.parts.rightEye.material.color.copy(threeColor);
            this.simulator.parts.rightEye.material.emissive.copy(threeColor);
            this.simulator.parts.rightEye.material.emissiveIntensity = colorInt === 0 ? 0.05 : 0.6;
          }
        }

        // Also tint the output area for extra feedback
        const output = document.getElementById(this.outputId);
        if (output && colorInt !== 0) {
          const oldBorder = output.style.borderLeft;
          output.style.borderLeft = `4px solid ${hex}`;
          setTimeout(() => { output.style.borderLeft = oldBorder; }, 1500);
        }

        setTimeout(() => {
          if (this._stopped) return;
          next();
        }, Math.max(300, action.duration * 1000));

      } else if (action.type === 'walk_velocity') {
        if (action.vx === 0 && action.vy === 0 && action.vtheta === 0) {
          this.log('NAO stops walking');
          if (this.simulator) this.simulator.setAnimation('idle');
        } else {
          this.log(`NAO walk velocity: vx=${action.vx}, vy=${action.vy}, vtheta=${action.vtheta.toFixed(2)}`);
          if (this.simulator) this.simulator.setAnimation('walking');
        }
        setTimeout(() => {
          if (this._stopped) return;
          next();
        }, 400);

      } else if (action.type === 'delay') {
        // Simulated time.sleep — pause between actions
        const delayMs = Math.min(action.seconds * 1000, 3000); // cap at 3s
        setTimeout(() => {
          if (this._stopped) return;
          next();
        }, Math.max(100, delayMs));

      } else if (action.type === 'log') {
        this.log(action.text);
        next();
      } else {
        // Unknown action type — skip
        next();
      }
    };

    this.isSpeaking = true;
    next();
  }

  speak(text, speed, pitch, onEnd) {
    if (!this.speechSynth) {
      if (onEnd) setTimeout(onEnd, 1000);
      return;
    }

    this.speechSynth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.1, Math.min(10, speed / 100));
    utterance.pitch = Math.max(0, Math.min(2, pitch));
    utterance.volume = 1;

    // Use an explicit English local voice (most reliable on macOS)
    const voices = this.speechSynth.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.localService);
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    this.speechSynth.speak(utterance);

    // Chrome/macOS workaround: speech gets stuck until pause/resume is cycled.
    setTimeout(() => {
      this.speechSynth.pause();
      this.speechSynth.resume();
    }, 50);
  }

  stop() {
    this._stopped = true;
    this.isSpeaking = false;
    if (this.speechSynth) this.speechSynth.cancel();
    if (this.simulator) this.simulator.stopAnimation();
  }

  destroy() {
    this.stop();
    if (this.simulator) {
      this.simulator.destroy();
      this.simulator = null;
    }
    if (this.codeMirror) {
      this.codeMirror.toTextArea && this.codeMirror.toTextArea();
      this.codeMirror = null;
    }
  }

  log(message) {
    const output = document.getElementById(this.outputId);
    if (output) {
      output.textContent += message + '\n';
      output.scrollTop = output.scrollHeight;
    }
  }

  clearOutput() {
    const output = document.getElementById(this.outputId);
    if (output) output.textContent = '';
  }
}

/* === Initialize editors when page content loads === */
const editors = {};

function destroyAllEditors() {
  for (const id in editors) {
    if (editors[id]) {
      editors[id].destroy();
      delete editors[id];
    }
  }
}

function initEditor(id, config) {
  if (editors[id]) {
    editors[id].destroy();
    delete editors[id];
  }

  const editorEl = document.getElementById(config.editorId);
  if (editorEl) {
    editorEl.innerHTML = '';
  }

  const previewEl = document.getElementById(config.previewContainerId);
  if (previewEl) {
    previewEl.innerHTML = '';
  }

  editors[id] = new NaoEditor(config);
  return editors[id];
}
