import re
import pickle

# Load model and vectorizer
tfidf = pickle.load(open('ml/tfidf.pkl', 'rb'))
model = pickle.load(open('ml/model.pkl', 'rb'))

def clean_resume(txt):
    clean_text = re.sub('http\S+\s', ' ', txt)
    clean_text = re.sub('@\S+', ' ', clean_text)
    clean_text = re.sub('#\S+', ' ', clean_text)
    clean_text = re.sub('[%s]' % re.escape("""!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~"""), ' ', clean_text)
    clean_text = re.sub(r'[^\x00-\x7f]', ' ', clean_text)
    clean_text = re.sub('\s+', ' ', clean_text)
    return clean_text.strip()

def predict_category(resume):
    cleaned_resume = clean_resume(resume)
    input_features = tfidf.transform([cleaned_resume])
    prediction = model.predict(input_features)
    return prediction[0]
tfidf = pickle.load(open('C:/Users/USER/desktop/Hackathon/SkillBridge/backend/ml/tfidf.pkl', 'rb'))
