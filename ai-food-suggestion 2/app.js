document.getElementById('searchButton').addEventListener('click', getSuggestions);
document.getElementById('ingredientInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        getSuggestions();
    }
});

const leftoverSuggestions = {
    "Onion": [
        "Use onions in a homemade salsa.",
        "Add them to a stir-fry.",
        "Make caramelized onions for sandwiches."
    ],
    "Garlic": [
        "Use garlic in garlic butter for bread.",
        "Roast it and spread it on toast.",
        "Add it to pasta sauces or soups."
    ],
    "Tomato": [
        "Make a fresh tomato salad.",
        "Use tomatoes in a grilled cheese sandwich.",
        "Chop them into scrambled eggs."
    ],
    "Carrot": [
        "Add shredded carrots to a salad.",
        "Make a carrot soup.",
        "Use them in a smoothie."
    ],
    "Potato": [
        "Make mashed potatoes.",
        "Use in a potato salad.",
        "Add them to a breakfast hash."
    ],
    "Chicken": [
        "Use leftover chicken in sandwiches.",
        "Make chicken soup or broth.",
        "Add chicken to salads or tacos."
    ]
};

async function getSuggestions() { //to run with other without blocking
    const input = document.getElementById('ingredientInput').value; // Ye line HTML se ingredient input field ka value le raha hai
    const ingredients = input.split(',').map(ing => ing.trim()).filter(ing => ing);//Ye input string ko , ke basis par split karta hai, phir har ingredient 
    //ke aage aur peeche ke spaces hataata hai aur empty values ko filter karta hai.

    if (ingredients.length < 1) { //checks user inputs
        document.getElementById('suggestions').innerHTML = '<li class="text-warning">Please enter at least one ingredient.</li>';
        return;//Agar ingredient nahi hai, toh ye warning message dikhata hai.
    }

    const suggestionsElement = document.getElementById('suggestions');//Ye suggestions element ko variable mein store kar raha hai jahan recipe suggestions dikhayenge.
    suggestionsElement.innerHTML = '<li>Loading...</li>';//Ye loading message dikhata hai jab tak recipes fetch nahi ho jaati.

    try {
        const mealPromises = ingredients.map(ingredient =>
            fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}`).then(res => res.json())
        );

        const mealResults = await Promise.all(mealPromises);
        let noMealsFound = true;

        suggestionsElement.innerHTML = '';
        mealResults.forEach(mealData => {
            if (mealData.meals) {
                noMealsFound = false;
                mealData.meals.forEach(meal => {
                    const li = document.createElement('li');
                    li.innerText = meal.strMeal;
                    li.addEventListener('click', () => showRecipeDetails(meal.idMeal));
                    suggestionsElement.appendChild(li);
                });
            }
        });

        if (noMealsFound) {
            suggestionsElement.innerHTML = '<li class="text-danger">No meals found for the given ingredients.</li>';
        }
    } catch (error) {
        console.error('Error fetching from TheMealDB:', error);
        suggestionsElement.innerHTML = '<li class="text-danger">Error fetching data. Please try again later.</li>';
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

        const leftoverDetails = '<h6>What to do with leftovers:</h6>';
        let leftoverContent = '<ul>';

        Object.keys(meal)
            .filter(key => key.startsWith('strIngredient') && meal[key])
            .forEach(key => {
                const ingredient = meal[key].trim();
                if (leftoverSuggestions[ingredient]) {
                    leftoverContent += `<li>${ingredient}: ${leftoverSuggestions[ingredient].join(', ')}</li>`;
                }
            });

        leftoverContent += '</ul>';

        document.getElementById('recipeDetails').innerHTML += leftoverDetails + leftoverContent;

        const modal = new bootstrap.Modal(document.getElementById('recipeModal'));
        modal.show();
    } catch (error) {
        console.error('Error fetching recipe details:', error);
    }
}
