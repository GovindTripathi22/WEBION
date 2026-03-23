import numpy as np
from collections import deque

class MeasurementSmoother:
    def __init__(self, history_size=10):
        # Buffers for recent measurements
        self.shoulder_buffer = deque(maxlen=history_size)
        self.chest_buffer = deque(maxlen=history_size)
        self.length_buffer = deque(maxlen=history_size)
        self.confidence_buffer = deque(maxlen=history_size)

    def update(self, measurements):
        if not measurements:
            return None
            
        # Add to buffers
        self.shoulder_buffer.append(measurements["shoulderWidth"])
        self.chest_buffer.append(measurements["chestWidth"])
        self.length_buffer.append(measurements["garmentLength"])
        self.confidence_buffer.append(measurements["confidence"])

        # Calculate averages
        avg_shoulder = np.mean(self.shoulder_buffer)
        avg_chest = np.mean(self.chest_buffer)
        avg_length = np.mean(self.length_buffer)
        avg_confidence = np.mean(self.confidence_buffer)

        return {
            "shoulderWidth": avg_shoulder,
            "chestWidth": avg_chest,
            "garmentLength": avg_length,
            "confidence": avg_confidence
        }
