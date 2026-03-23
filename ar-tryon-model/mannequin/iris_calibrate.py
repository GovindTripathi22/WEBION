"""
iris_calibrate.py

-----------------------------------------------------------------
PURPOSE
-----------------------------------------------------------------
Provides automatic, cardless pixel-to-cm calibration using the
human IRIS as a biological ruler.

The average adult iris diameter is 1.17 cm.
By measuring the iris width in pixels we can compute:
    cm_per_pixel = 1.17 / iris_width_in_pixels

This scale ratio is injected into the garment measurer so that
every other measurement (shoulders, length, etc.) is scaled
correctly regardless of how far the subject stands from the
camera.

-----------------------------------------------------------------
TECHNICAL DETAILS
-----------------------------------------------------------------
MediaPipe FaceMesh (with refine_landmarks=True) outputs 478
landmarks. The extra landmarks 468-477 are the iris points.

Right iris (from camera's perspective = subject's left eye):
    468 - iris center
    469 - top of iris
    470 - right edge of iris
    471 - bottom of iris
    472 - left edge of iris

For our horizontal diameter we use index 474 and 476
(right and left edges of the RIGHT iris from the subject's POV).
These two points give the most reliable horizontal measurement.

-----------------------------------------------------------------
HOW TO USE
-----------------------------------------------------------------
    from iris_calibrate import IrisCalibrator

    calibrator = IrisCalibrator()
    cm_per_px = calibrator.get_scale_ratio(frame, w, h)
    if cm_per_px:
        # use cm_per_px to convert pixel distances to cm
        ...
"""

import cv2
import math
import mediapipe as mp


class IrisCalibrator:
    """
    Detects the human iris in a live frame and calculates
    the real-world cm_per_pixel scale ratio.
    """

    # Average adult iris diameter in centimetres (biological constant)
    IRIS_DIAMETER_CM = 1.17

    # MediaPipe iris landmark indices (right iris from subject's POV)
    # 474 = right edge, 476 = left edge  →  horizontal span
    IRIS_RIGHT_EDGE = 474
    IRIS_LEFT_EDGE  = 476

    def __init__(self):
        # FaceMesh with refine_landmarks=True to get iris points
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,    # video / live mode
            max_num_faces=1,            # we only need one face
            refine_landmarks=True,      # REQUIRED for iris (indices 468-477)
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    # ------------------------------------------------------------------
    # HELPER
    # ------------------------------------------------------------------

    @staticmethod
    def _pixel_distance(p1, p2):
        """Return the Euclidean distance between two (x, y) pixel points."""
        return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)

    # ------------------------------------------------------------------
    # MAIN PUBLIC METHOD
    # ------------------------------------------------------------------

    def get_scale_ratio(self, frame, frame_width, frame_height):
        """
        Detect iris in `frame` and return the cm_per_pixel scale ratio.

        Parameters
        ----------
        frame        : BGR numpy array from OpenCV
        frame_width  : int – width of the frame in pixels
        frame_height : int – height of the frame in pixels

        Returns
        -------
        float  – cm_per_pixel if iris detected
        None   – if no face or iris is found
        """

        # MediaPipe requires RGB input
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results   = self.face_mesh.process(image_rgb)

        if not results.multi_face_landmarks:
            return None  # no face detected

        # We asked for max 1 face, so take the first one
        face_landmarks = results.multi_face_landmarks[0].landmark

        # ---- Extract the two iris edge landmarks ----
        # Normalized (0-1) coordinates → convert to pixels
        p_right = (
            int(face_landmarks[self.IRIS_RIGHT_EDGE].x * frame_width),
            int(face_landmarks[self.IRIS_RIGHT_EDGE].y * frame_height),
        )
        p_left = (
            int(face_landmarks[self.IRIS_LEFT_EDGE].x * frame_width),
            int(face_landmarks[self.IRIS_LEFT_EDGE].y * frame_height),
        )

        # ---- Iris width in pixels ----
        iris_width_px = self._pixel_distance(p_right, p_left)

        if iris_width_px < 1:
            # Landmark collapsed – detection unreliable
            return None

        # ---- Scale ratio ----
        cm_per_pixel = self.IRIS_DIAMETER_CM / iris_width_px

        # ---- Visual feedback – draw iris circle on frame ----
        # Centre of the two edge points
        cx = (p_right[0] + p_left[0]) // 2
        cy = (p_right[1] + p_left[1]) // 2
        radius = int(iris_width_px / 2)

        cv2.circle(frame, (cx, cy), radius, (0, 220, 80), 2)     # rim
        cv2.circle(frame, (cx, cy), 2,      (0, 220, 80), -1)    # centre dot

        return cm_per_pixel
