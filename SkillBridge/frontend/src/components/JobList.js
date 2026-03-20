import React, { useEffect, useState } from 'react';
import axios from 'axios';

const JobList = () => {
    const [users, setUsers] = useState([]);
    const [resume, setResume] = useState("");
    const [predictedCategory, setPredictedCategory] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            const response = await axios.get('http://localhost:5000/api/users');
            setUsers(response.data);
        };
        fetchUsers();
    }, []);

    const handlePredict = async () => {
        const response = await axios.post('http://localhost:5000/api/predict', { resume });
        setPredictedCategory(response.data.category);
    };

    return (
        <div className="mt-4">
            <h2>Available Users</h2>
            <ul className="list-group">
                {users.map(user => (
                    <li className="list-group-item" key={user._id}>
                        {user.name} - Skills: {user.skills.join(', ')}
                    </li>
                ))}
            </ul>
            <h2 className="mt-4">Resume Prediction</h2>
            <textarea
                className="form-control"
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste your resume here"
            />
            <button className="btn btn-success mt-2" onClick={handlePredict}>Predict Category</button>
            {predictedCategory && <h3 className="mt-3">Predicted Category: {predictedCategory}</h3>}
        </div>
    );
};

export default JobList;
