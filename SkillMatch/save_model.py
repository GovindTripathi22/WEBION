import pickle
from sklearn.dummy import DummyClassifier
import numpy as np

# Create a dummy model
X = np.array([[0, 0], [1, 1]])
y = np.array([0, 1])
model = DummyClassifier(strategy="most_frequent")
model.fit(X, y)

# Save the model
with open('ml/model.pkl', 'wb') as f:
    pickle.dump(model, f)

print("Dummy model saved as ml/model.pkl")
