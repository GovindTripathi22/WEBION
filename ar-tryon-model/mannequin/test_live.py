import cv2
import time
from detect_pose import MannequinPoseDetector
from measure_garment import GarmentMeasurer
from smoothing import MeasurementSmoother

def main():
    # Initialize components
    detector = MannequinPoseDetector()
    measurer = GarmentMeasurer()
    smoother = MeasurementSmoother(history_size=15)
    
    # Open webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return
        
    print("Starting Live AR Try-On Module A (Mannequin Detection)")
    print("Press 'q' to quit")
    print("Press 's' to save the current garment crop")
    
    saved_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame. Exiting...")
            break
            
        h, w, _ = frame.shape
            
        # Detect pose and torso box
        landmarks, annotated_frame, torso_box = detector.detect_pose(frame)
        
        garment_crop = None
        measurements = None
        smoothed = None
        
        if torso_box:
            x_min, y_min, x_max, y_max = torso_box
            
            # Crop garment image ensuring coordinates are within bounds
            x_min, y_min = max(0, x_min), max(0, y_min)
            x_max, y_max = min(w, x_max), min(h, y_max)
            
            if x_min < x_max and y_min < y_max:
                garment_crop = frame[y_min:y_max, x_min:x_max]
                if garment_crop.size > 0:
                    cv2.imshow("Garment Crop", garment_crop)
                
            # Estimate measurements
            measurements = measurer.measure(landmarks, w, h)
            
            if measurements:
                # Smooth measurements over time
                smoothed = smoother.update(measurements)
        
        # Show results live on screen
        if smoothed:
            # Draw measurements on frame
            cv2.putText(annotated_frame, f"Shoulder: {smoothed['shoulderWidth']:.1f} cm", 
                        (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.putText(annotated_frame, f"Chest: {smoothed['chestWidth']:.1f} cm", 
                        (20, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.putText(annotated_frame, f"Length: {smoothed['garmentLength']:.1f} cm", 
                        (20, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.putText(annotated_frame, f"Conf: {smoothed['confidence']:.2f}", 
                        (20, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 200, 0), 2)
        else:
            cv2.putText(annotated_frame, "No pose detected", 
                        (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            
        cv2.imshow("Live Pose Detection", annotated_frame)
        
        # Keyboard controls
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            if garment_crop is not None and garment_crop.size > 0:
                filename = f"garment_capture_{saved_count}.jpg"
                cv2.imwrite(filename, garment_crop)
                print(f"Saved: {filename}")
                saved_count += 1
            else:
                print("No active garment crop to save.")
                
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
