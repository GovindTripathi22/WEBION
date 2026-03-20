async function getSuggestions() {
    const input = document.getElementById('ingredientInput').value;
    const ingredients = input.split(',').map(ing => ing.trim()).filter(ing => ing);

    if (ingredients.length < 1) {
        document.getElementById('suggestions').innerHTML = '';
        return;
    }

    const suggestionsElement = document.getElementById('suggestions');
    suggestionsElement.innerHTML = '<li>Loading...</li>';

    suggestionsElement.innerHTML = '';

    try {
        const mealPromises = ingredients.map(ingredient =>
            fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}`).then(res => res.json())
        );

        const mealResults = await Promise.all(mealPromises);
        mealResults.forEach(mealData => {
            if (mealData.meals) {
                mealData.meals.forEach(meal => {
                    const li = document.createElement('li');
                    li.innerText = meal.strMeal;
                    li.addEventListener('click', () => {
                        showRecipeDetails(meal.idMeal);
                    });
                    suggestionsElement.appendChild(li);
                });
            }
        });
    } catch (error) {
        console.error('Error fetching from TheMealDB:', error);
    }
}

async function showRecipeDetails(mealId) {
    try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
        const data = await response.json();
        const meal = data.meals[0];

        const recipeDetails = `
            <h5>${meal.strMeal}</h5>
            <img src="${meal.strMealThumb}" class="img-fluid" alt="${meal.strMeal}">
            <h6>Ingredients:</h6>
            <ul>
                ${Object.keys(meal)
                    .filter(key => key.startsWith('strIngredient') && meal[key])
                    .map(key => `<li>${meal[key]}</li>`)
                    .join('')}
            </ul>
            <h6>Instructions:</h6>
            <p>${meal.strInstructions}</p>
        `;

        document.getElementById('recipeDetails').innerHTML = recipeDetails;
        const modal = new bootstrap.Modal(document.getElementById('recipeModal'));
        modal.show();
    } catch (error) {
        console.error('Error fetching recipe details:', error);
    }
}

document.getElementById('searchButton').addEventListener('click', getSuggestions);
document.getElementById('ingredientInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        getSuggestions();
    }
});
