import math
import mediapipe as mp

class GarmentMeasurer:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.standard_shoulder_cm = 44.0  # Standard mannequin shoulder width

    def _distance(self, p1, p2):
        """Helper to calculate euclidean distance between two points."""
        return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

    def measure(self, landmarks, frame_width, frame_height):
        if not landmarks:
            return None
            
        lmList = landmarks.landmark
        
        # Get required landmarks
        l_shoulder = lmList[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value]
        r_shoulder = lmList[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
        l_hip = lmList[self.mp_pose.PoseLandmark.LEFT_HIP.value]
        r_hip = lmList[self.mp_pose.PoseLandmark.RIGHT_HIP.value]
        
        # Average visibility as a proxy for confidence
        confidence = sum([l_shoulder.visibility, r_shoulder.visibility, 
                          l_hip.visibility, r_hip.visibility]) / 4.0

        # Convert to pixel coordinates
        l_shoulder_px = (l_shoulder.x * frame_width, l_shoulder.y * frame_height)
        r_shoulder_px = (r_shoulder.x * frame_width, r_shoulder.y * frame_height)
        l_hip_px = (l_hip.x * frame_width, l_hip.y * frame_height)
        r_hip_px = (r_hip.x * frame_width, r_hip.y * frame_height)

        # Measurements in pixels
        shoulder_width_px = self._distance(l_shoulder_px, r_shoulder_px)
        
        # Calculate midpoints for lengths
        shoulder_mid_px = (
            (l_shoulder_px[0] + r_shoulder_px[0]) / 2,
            (l_shoulder_px[1] + r_shoulder_px[1]) / 2
        )
        hip_mid_px = (
            (l_hip_px[0] + r_hip_px[0]) / 2,
            (l_hip_px[1] + r_hip_px[1]) / 2
        )
        
        garment_length_px = self._distance(shoulder_mid_px, hip_mid_px)
        
        # Chest width approximation in pixels
        chest_width_px = shoulder_width_px * 1.1 

        # Prevent division by zero
        if shoulder_width_px == 0:
            return None

        # Pixel to cm ratio based on calibration
        px_to_cm_ratio = self.standard_shoulder_cm / shoulder_width_px

        # Final measurements in cm
        shoulder_width_cm = shoulder_width_px * px_to_cm_ratio
        chest_width_cm = chest_width_px * px_to_cm_ratio
        garment_length_cm = garment_length_px * px_to_cm_ratio

        return {
            "shoulderWidth": shoulder_width_cm,
            "chestWidth": chest_width_cm,
            "garmentLength": garment_length_cm,
            "confidence": confidence
        }
