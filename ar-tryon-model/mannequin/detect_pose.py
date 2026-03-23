import cv2
import mediapipe as mp
import numpy as np

class MannequinPoseDetector:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        
    def detect_pose(self, frame):
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the image
        results = self.pose.process(image_rgb)
        
        annotated_frame = frame.copy()
        torso_box = None
        
        if results.pose_landmarks:
            # Draw landmarks
            self.mp_drawing.draw_landmarks(
                annotated_frame, 
                results.pose_landmarks, 
                self.mp_pose.POSE_CONNECTIONS
            )
            
            landmarks = results.pose_landmarks.landmark
            
            # Extract relevant points
            h, w, _ = frame.shape
            
            l_shoulder = landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            r_shoulder = landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            l_hip = landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value]
            r_hip = landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value]
            
            # Calculate coordinates in pixels
            points = [
                (int(l_shoulder.x * w), int(l_shoulder.y * h)),
                (int(r_shoulder.x * w), int(r_shoulder.y * h)),
                (int(l_hip.x * w), int(l_hip.y * h)),
                (int(r_hip.x * w), int(r_hip.y * h))
            ]
            
            x_coords = [p[0] for p in points]
            y_coords = [p[1] for p in points]
            
            x_min = max(0, min(x_coords))
            y_min = max(0, min(y_coords))
            x_max = min(w, max(x_coords))
            y_max = min(h, max(y_coords))
            
            # Add some padding to the torso box
            padding_x = int((x_max - x_min) * 0.1)
            padding_y = int((y_max - y_min) * 0.1)
            
            x_min = max(0, x_min - padding_x)
            y_min = max(0, y_min - padding_y)
            x_max = min(w, x_max + padding_x)
            y_max = min(h, y_max + padding_y)
            
            if x_min < x_max and y_min < y_max:
                torso_box = (x_min, y_min, x_max, y_max)
                # Draw the torso bounding box on the original frame
                cv2.rectangle(annotated_frame, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)
            
        return results.pose_landmarks, annotated_frame, torso_box
