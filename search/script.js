// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const largeInput = document.getElementById('large-input');
    const placeholderText = document.getElementById('placeholder-text');
    const searchResults = document.getElementById('search-results');
    const searchTermInput = document.getElementById('search-term');
    const resultsContainer = document.getElementById('results-container');
    const initialInputContainer = document.getElementById('initial-input-container');

    // Adjust placeholder text based on the platform
    const userAgent = navigator.userAgent.toLowerCase();
    let enterKeyName = 'Return';
    if (userAgent.includes('win') || userAgent.includes('linux')) {
        enterKeyName = 'Enter';
    } else if (userAgent.includes('android') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
        enterKeyName = 'Go';
    }
    placeholderText.textContent = `Press '${enterKeyName}' to search`;

    // Ensure the large input is empty on page load
    largeInput.value = '';

    // Function to toggle placeholder visibility
    function togglePlaceholder() {
        if (largeInput.value.length > 0) {
            initialInputContainer.classList.add('hide-placeholder');
        } else {
            initialInputContainer.classList.remove('hide-placeholder');
        }
    }

    // Event listener for input in the large input
    largeInput.addEventListener('input', togglePlaceholder);

    // Initial check to set placeholder visibility
    togglePlaceholder();

    // Event listener for key presses in the large input
    largeInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const query = largeInput.value.trim();
            if (query !== '') {
                performSearch(query);
            }
        }
    });

    // Event listener for key presses in the search term input (for subsequent searches)
    searchTermInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const query = searchTermInput.value.trim();
            if (query !== '') {
                performSearch(query);
            }
        }
    });

    // Function to perform the search
    async function performSearch(query) {
        // Hide the initial input container if it's visible
        if (!initialInputContainer.classList.contains('hidden')) {
            initialInputContainer.classList.add('hidden');
            // Show the search results section
            searchResults.classList.remove('hidden');
        }
        // Set the search term input
        searchTermInput.value = query;

        // Fetch the JSON data
        let data;
        try {
            const response = await fetch('database.json');
            data = await response.json();
        } catch (error) {
            console.error('Error fetching JSON data:', error);
            return;
        }

        // Perform the search
        const results = searchInData(query, data);
        displayResults(results);
    }

    // Function to search in data
    function searchInData(query, data) {
        const lowerCaseQuery = query.toLowerCase();
        const results = [];

        data.forEach(item => {
            let matchScore = 0;

            // Check title
            if (item.title.toLowerCase().includes(lowerCaseQuery)) {
                matchScore += 50;
            }

            // Check related names
            item['related names'].forEach(name => {
                if (name.toLowerCase().includes(lowerCaseQuery)) {
                    matchScore += 20;
                }
            });

            // Check tag
            if (item.tag.toLowerCase().includes(lowerCaseQuery)) {
                matchScore += 15;
            }

            // Check subject
            if (item.subject.toLowerCase().includes(lowerCaseQuery)) {
                matchScore += 15;
            }

            if (matchScore > 0) {
                results.push({
                    tag: item.tag,
                    title: item.title,
                    date: item.date, // Include date
                    matchScore: matchScore
                });
            }
        });

        // Sort results by match score in descending order
        results.sort((a, b) => b.matchScore - a.matchScore);

        // Return top 10 results
        return results.slice(0, 10);
    }

    // Custom function to parse 'dd-MM-yyyy' format
    function parseDateDDMMYYYY(dateStr) {
        const parts = dateStr.split('-');
        if (parts.length !== 3) {
            return null;
        }
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Months are zero-based
        const year = parseInt(parts[2], 10);

        const date = new Date(year, month, day);
        // Validate the date components
        if (
            date &&
            date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day
        ) {
            return date;
        } else {
            return null;
        }
    }

    // Function to display results
    function displayResults(results) {
        // Clear previous results
        resultsContainer.innerHTML = '';

        results.forEach(result => {
            // Create result box
            const resultBox = document.createElement('div');
            resultBox.classList.add('result-box');

            // Tag and Date
            const tagElement = document.createElement('div');
            tagElement.classList.add('result-tag');

            if (result.date) {
                const dateStr = result.date.trim(); // Trim whitespace
                const parsedDate = parseDateDDMMYYYY(dateStr);
                if (parsedDate) {
                    const options = { year: 'numeric', month: 'long', day: 'numeric' };
                    const formattedDate = parsedDate.toLocaleDateString(undefined, options);
                    tagElement.textContent = `${result.tag} • ${formattedDate}`;
                } else {
                    // Invalid date
                    console.warn(`Invalid date for item: ${result.title}`, result.date);
                    tagElement.textContent = result.tag;
                }
            } else {
                // Date is missing
                tagElement.textContent = result.tag;
            }

            // Title
            const titleElement = document.createElement('div');
            titleElement.classList.add('result-title');
            titleElement.textContent = result.title;

            // Match Percentage
            const matchElement = document.createElement('div');
            matchElement.classList.add('result-match');
            matchElement.textContent = `${result.matchScore}% match`;

            // Append elements to result box
            resultBox.appendChild(tagElement);
            resultBox.appendChild(titleElement);
            resultBox.appendChild(matchElement);

            // Append result box to container
            resultsContainer.appendChild(resultBox);
        });
    }
});
