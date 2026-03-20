from flask import Blueprint, request, jsonify
from models.User import users_collection
from ml.model import predict_category

api_blueprint = Blueprint('api', __name__)

@api_blueprint.route('/register', methods=['POST'])
def register_user():
    user_data = request.json
    users_collection.insert_one(user_data)
    return jsonify(user_data), 201

@api_blueprint.route('/predict', methods=['POST'])
def predict():
    resume = request.json.get('resume', '')
    category = predict_category(resume)
    return jsonify({'category': category})
