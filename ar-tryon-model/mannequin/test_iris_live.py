"""
test_iris_live.py

-----------------------------------------------------------------
PURPOSE
-----------------------------------------------------------------
Full pipeline combining:
  1. IrisCalibrator  – live iris detection for automatic cm/px scaling
  2. MannequinPoseDetector – body pose landmarks from MediaPipe Tasks
  3. Live measurement display with dynamically calibrated cm values

The key insight:
  Instead of ASSUMING shoulder = 44 cm (hardcoded calibration),
  we measure YOUR iris → know exactly how many cm 1 pixel equals
  at the current camera distance → scale all pose measurements with
  that ratio. The iris width is a fixed biological constant (1.17 cm)
  so it works as a natural ruler in every frame.

-----------------------------------------------------------------
HOW TO RUN
-----------------------------------------------------------------
  cd d:/AR/ar-tryon-model
  .\\venv\\Scripts\\python.exe mannequin/test_iris_live.py

-----------------------------------------------------------------
IMPORTANT
-----------------------------------------------------------------
You MUST stand close enough to the camera so your eye is clearly
visible for the iris calibration to work. Once "IRIS CALIBRATED"
appears in the top-right corner, you can step back and the ratio
will remain from the last successful reading.

Press 'q' to quit.
"""

import cv2
import math

# Our project modules (must be in the same directory or on sys.path)
from detect_pose       import MannequinPoseDetector
from iris_calibrate    import IrisCalibrator


# -----------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------

CAMERA_SOURCE = 0     # 0 = default webcam. Change for DroidCam.
# CAMERA_SOURCE = "http://192.168.x.x:4747/video"   # DroidCam Wi-Fi example

# Minimum iris reading confidence: discard ratios that seem unrealistic.
# A typical cm_per_pixel value is between 0.01 and 0.10.
# Readings outside this band probably mean bad detection.
MIN_CM_PER_PX = 0.005
MAX_CM_PER_PX = 0.20


# -----------------------------------------------------------------
# HELPER FUNCTIONS
# -----------------------------------------------------------------

def px_distance(p1, p2):
    """Euclidean distance between two (x, y) pixel points."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def measure_from_landmarks(landmarks, frame_w, frame_h, cm_per_px):
    """
    Given a list of MediaPipe NormalizedLandmarks and a cm_per_pixel ratio,
    calculate shoulder width, chest width, garment length, and hip width in cm.

    Returns a dict or None if the data is insufficient.
    """
    if not landmarks or len(landmarks) < 25:
        return None

    # MediaPipe Pose landmark indices
    # 11: LEFT_SHOULDER, 12: RIGHT_SHOULDER
    # 23: LEFT_HIP,      24: RIGHT_HIP
    l_sh = landmarks[11]
    r_sh = landmarks[12]
    l_hp = landmarks[23]
    r_hp = landmarks[24]

    # Confidence: average visibility of the 4 key joints
    confidence = (l_sh.visibility + r_sh.visibility +
                  l_hp.visibility + r_hp.visibility) / 4.0

    if confidence < 0.4:
        return None   # too uncertain – skip this frame

    # Convert normalised coords → pixels
    W, H = frame_w, frame_h
    ls_px = (l_sh.x * W, l_sh.y * H)
    rs_px = (r_sh.x * W, r_sh.y * H)
    lh_px = (l_hp.x * W, l_hp.y * H)
    rh_px = (r_hp.x * W, r_hp.y * H)

    # --- Pixel distances ---
    shoulder_px = px_distance(ls_px, rs_px)
    hip_px      = px_distance(lh_px, rh_px)

    # Garment length = shoulder midpoint → hip midpoint
    sh_mid   = ((ls_px[0] + rs_px[0]) / 2, (ls_px[1] + rs_px[1]) / 2)
    hp_mid   = ((lh_px[0] + rh_px[0]) / 2, (lh_px[1] + rh_px[1]) / 2)
    length_px = px_distance(sh_mid, hp_mid)

    if shoulder_px < 1:
        return None

    # --- Convert to cm using DYNAMIC iris ratio ---
    shoulder_cm = shoulder_px * cm_per_px
    hip_cm      = hip_px      * cm_per_px
    length_cm   = length_px   * cm_per_px

    # Chest ≈ average of shoulder and hip widths (realistic approximation)
    chest_cm = (shoulder_cm + hip_cm) / 2.0

    return {
        "shoulderWidth":  shoulder_cm,
        "chestWidth":     chest_cm,
        "garmentLength":  length_cm,
        "hip_width_cm":   hip_cm,
        "confidence":     confidence,
        "cm_per_px":      cm_per_px,  # log for debugging
    }


def draw_hud(frame, measurements, iris_calibrated):
    """
    Render a translucent HUD panel on the left with measurements,
    and a CALIBRATION STATUS indicator in the top-right corner.
    """
    h, w = frame.shape[:2]

    # ── Calibration status badge ──
    if iris_calibrated:
        badge_text  = "IRIS CALIBRATED"
        badge_color = (0, 220, 80)     # green
    else:
        badge_text  = "AWAITING IRIS..."
        badge_color = (0, 120, 255)    # orange

    badge_x = w - 240
    badge_y = 30
    cv2.putText(frame, badge_text, (badge_x, badge_y),
                cv2.FONT_HERSHEY_DUPLEX, 0.6, badge_color, 1, cv2.LINE_AA)

    if not measurements:
        # No pose: show a gentle prompt
        cv2.putText(frame, "Stand so full body is visible",
                    (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.65,
                    (0, 80, 255), 2, cv2.LINE_AA)
        return

    # ── Measurements panel ──
    lines = [
        (f"Shoulder : {measurements['shoulderWidth']:.1f} cm",  (0, 220, 80)),
        (f"Chest    : {measurements['chestWidth']:.1f} cm",     (0, 220, 80)),
        (f"Hip      : {measurements['hip_width_cm']:.1f} cm",   (0, 220, 80)),
        (f"Length   : {measurements['garmentLength']:.1f} cm",  (0, 220, 80)),
        (f"Conf     : {measurements['confidence']*100:.0f}%",
         (0, 220, 80) if measurements['confidence'] > 0.7 else (0, 120, 255)),
        (f"Scale    : {measurements['cm_per_px']:.4f} cm/px",  (180, 180, 180)),
    ]

    panel_w = 280
    panel_h = len(lines) * 30 + 30
    overlay = frame.copy()
    cv2.rectangle(overlay, (10, 10), (10 + panel_w, 10 + panel_h), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)

    cv2.putText(frame, "AR-TryOn  |  Iris Calibrated", (18, 32),
                cv2.FONT_HERSHEY_DUPLEX, 0.5, (200, 200, 200), 1, cv2.LINE_AA)

    for i, (text, color) in enumerate(lines):
        cv2.putText(frame, text, (20, 55 + i * 28),
                    cv2.FONT_HERSHEY_DUPLEX, 0.6, color, 1, cv2.LINE_AA)


# -----------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------

def main():
    print("=" * 58)
    print("  AR Try-On – Iris Calibration Mode")
    print("=" * 58)
    print("  1. Position your face close to the camera.")
    print("  2. Wait for 'IRIS CALIBRATED' to appear.")
    print("  3. Step back – measurements auto-scale to your distance.")
    print("  Press  q  to quit.")
    print("=" * 58 + "\n")

    # ── Initialise modules ──────────────────────────────────────
    detector   = MannequinPoseDetector()
    calibrator = IrisCalibrator()

    # Last known valid iris scale (persists between frames)
    current_cm_per_px = None
    iris_calibrated   = False

    # ── Open Camera ─────────────────────────────────────────────
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open camera: {CAMERA_SOURCE}")
        return

    # Prefer 720p for better iris and pose accuracy
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[WARN] Frame grab failed. Retrying...")
            continue

        h, w = frame.shape[:2]

        # ── Step 1: Iris Calibration ─────────────────────────────
        # Try to get current cm_per_pixel from the iris
        ratio = calibrator.get_scale_ratio(frame, w, h)

        if ratio and MIN_CM_PER_PX < ratio < MAX_CM_PER_PX:
            # Valid iris reading → update our scale
            current_cm_per_px = ratio
            iris_calibrated   = True
        # else: keep using the last known good ratio (or None if never calibrated)

        # ── Step 2: Pose Detection ───────────────────────────────
        # Returns pose_landmarks, annotated_frame, torso_box
        landmarks, annotated_frame, torso_box = detector.detect_pose(frame)

        # ── Step 3: Measure with dynamic scale ───────────────────
        measurements = None
        if current_cm_per_px is not None:
            # We have a real scale → calculate accurate measurements
            measurements = measure_from_landmarks(
                landmarks, w, h, current_cm_per_px
            )
        # Note: if iris has never been detected, we skip measurement
        # rather than fall back to a hardcoded guess.

        # ── Step 4: Draw HUD ─────────────────────────────────────
        draw_hud(annotated_frame, measurements, iris_calibrated)

        cv2.imshow("AR Try-On | Iris Calibration", annotated_frame)

        # ── Keyboard ─────────────────────────────────────────────
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("[INFO] Application closed.")


if __name__ == "__main__":
    main()
