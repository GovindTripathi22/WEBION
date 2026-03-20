document.getElementById('report-form').addEventListener('submit', async function (event) {
    event.preventDefault();
  
    const location = document.getElementById('location').value;
    const image = document.getElementById('image').files[0];
    const responseMessage = document.getElementById('response-message');
  
    if (!location || !image) {
      responseMessage.innerHTML = "<p style='color: red;'>Please fill out all fields.</p>";
      return;
    }
  
    const formData = new FormData();
    formData.append('location', location);
    formData.append('image', image);
  
    try {
      const response = await fetch('http://localhost:5000/report', {
        method: 'POST',
        body: formData
      });
  
      if (response.ok) {
        const result = await response.json();
        responseMessage.innerHTML = `<p style="color: green;">Report submitted successfully!</p>`;
      } else {
        responseMessage.innerHTML = `<p style="color: red;">Error submitting the report. Please try again.</p>`;
      }
    } catch (error) {
      console.error(error);
      responseMessage.innerHTML = `<p style="color: red;">An unexpected error occurred. Please try again later.</p>`;
    }
  });
  