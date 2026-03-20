from sklearn.feature_extraction.text import TfidfVectorizer
import pickle

# Create a dummy TF-IDF model
documents = ["This is a sample document.", "This document is another example."]
vectorizer = TfidfVectorizer()
vectorizer.fit(documents)

# Save the TF-IDF model
with open('ml/tfidf.pkl', 'wb') as f:
    pickle.dump(vectorizer, f)

print("TF-IDF model saved as ml/tfidf.pkl")
