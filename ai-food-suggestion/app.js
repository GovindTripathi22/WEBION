async function getSuggestions() {
    const ingredient = document.getElementById('ingredientInput').value;

    if (ingredient.length < 3) {
        document.getElementById('suggestions').innerHTML = '';
        return;
    }

    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}`);
    
    if (!response.ok) {
        console.error('Error fetching data from TheMealDB');
        return;
    }

    const data = await response.json();
    const suggestionsElement = document.getElementById('suggestions');
    suggestionsElement.innerHTML = '';

    if (data.meals) {
        data.meals.forEach(meal => {
            const li = document.createElement('li');
            li.innerText = meal.strMeal;
            li.addEventListener('click', () => {
                window.open(`https://www.themealdb.com/meal.php?c=${meal.idMeal}`, '_blank');
            });
            suggestionsElement.appendChild(li);
        });
    } else {
        suggestionsElement.innerHTML = '<li>No suggestions found</li>';
    }
}

document.getElementById('ingredientInput').addEventListener('input', getSuggestions);
