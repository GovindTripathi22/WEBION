from flask import Flask, render_template, request
import spacy

app = Flask(__name__)

# Load the spaCy model
nlp = spacy.load('en_core_web_sm')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/match', methods=['POST'])
def match():
    user_skills = request.form['skills']
    
    # Process the user input using spaCy
    doc = nlp(user_skills)
    
    # Extract nouns and proper nouns as key skills
    skills = [token.text for token in doc if token.pos_ in ['NOUN', 'PROPN']]
    
    # Dummy logic for recommendations based on skills
    recommendations = skills if skills else ["No skills detected."]

    return render_template('index.html', recommendations=recommendations, user_skills=user_skills)

if __name__ == '__main__':
    app.run(debug=True)
