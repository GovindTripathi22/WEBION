import React from 'react';
import './App.css'; // Import your custom CSS
import JobList from './components/JobList';

function App() {
    return (
        <div className="container">
            <h1 className="text-center my-4">SkillBridge</h1>
            <JobList />
        </div>
    );
}

export default App;
