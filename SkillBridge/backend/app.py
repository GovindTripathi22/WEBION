from flask import Flask
from flask_cors import CORS
from routes.api import api_blueprint

app = Flask(__name__)
CORS(app)

app.register_blueprint(api_blueprint)

if __name__ == '__main__':
    app.run(port=5000)
