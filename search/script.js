// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const largeInput = document.getElementById('large-input');
    const placeholderText = document.getElementById('placeholder-text');
    const searchResults = document.getElementById('search-results');
    const searchTermInput = document.getElementById('search-term');
    const resultsContainer = document.getElementById('results-container');
    const initialInputContainer = document.getElementById('initial-input-container');

    let data = null;
    let fuse = null;

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
    largeInput.focus();

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

        // Fetch the JSON data if not already fetched
        if (!data) {
            try {
                const response = await fetch('database.json');
                data = await response.json();
                initializeFuse(data);
            } catch (error) {
                console.error('Error fetching JSON data:', error);
                return;
            }
        }

        // Perform the search
        let results = fuse.search(query);

        // Check if we need to insert 'Home' as the first result
        const normalizedQuery = query.toLowerCase().trim();
        const subjectPrefixes = [
            // Variations of 'subject'
            'sub', 'subj', 'subje', 'subjec', 'subject', 'subjects',
            // Variations of 'note'
            'note', 'notes',
            // Variations of 'page'
            'pag', 'page', 'pages',
            // Variations of 'document'
            'doc', 'docs', 'document', 'documents',
            // Variations of 'file'
            'file', 'files',
            // 'Notion' related
            'notion',
            // Additional keywords
            'home', 'main', 'start', 'startpage', 'index',
            'dashboard', 'welcome', 'overview', 'contents', 'content',
            'help', 'guide', 'manual', 'tutorial', 'tutorials',
            // Common misspellings and variations
            'hom', 'homm', 'strt', 'strat', 'begin', 'beginn', 'beginning',
            'intro', 'introduction', 'information', 'info',
            // Plurals and singulars
            'content', 'topics', 'topic', 'section', 'sections',
            // Other related terms
            'library', 'archive', 'repository', 'hub', 'center', 'centre',
            'root', 'base', 'source', 'core', 'portal'
        ];
        if (
            normalizedQuery.length > 2 &&
            subjectPrefixes.includes(normalizedQuery) &&
            !normalizedQuery.includes(' ')
        ) {
            // Create the 'Home' entry
            const homeEntry = {
                item: {
                    name: 'Home Page',
                    type: 'Home',
                    url: 'https://prabhas.notion.site/Manipal-University-Jaipur-e55135ad45ef40b1859739d067c20af5', 
                    date: null,
                    ancestors: ''
                },
                score: 0 // Perfect match
            };
            // Insert 'Home' entry at the beginning of the results
            results = [homeEntry, ...results];
        }

        displayResults(results);
    }

    // Function to initialize Fuse.js
    function initializeFuse(data) {
        const flatData = [];

        // Flatten the data structure into a flat array
        function flatten(node, ancestors = []) {
            // Add the current node to the flatData array
            flatData.push({
                id: node.id || generateId(),
                name: node.name,
                type: node.type,
                url: node.url,
                content: node.content || '',
                synonyms: node.synonyms || [],
                date: node.date || null,
                ancestors: ancestors.map(a => a.name).join(' > ')
            });

            // Recurse into children
            if (node.children) {
                node.children.forEach(child => {
                    flatten(child, [...ancestors, node]);
                });
            }
        }

        // Start flattening from the root data
        data.forEach(item => flatten(item));

        const options = {
            includeScore: true, // Include score to calculate match percentage
            keys: [
                'name',
                'synonyms',
                'content'
            ],
            threshold: 0.4 // Adjust for sensitivity
        };

        fuse = new Fuse(flatData, options);
    }

    // Function to display results
    function displayResults(results) {
        // Clear previous results
        resultsContainer.innerHTML = '';

        // Keep track of matched item IDs to prevent adding children
        const matchedIds = new Set();
        let displayedCount = 0;
        const maxResults = 10; // Limit to top 10 results

        for (const result of results) {
            if (displayedCount >= maxResults) {
                break; // Stop if we've reached the maximum number of results to display
            }

            const item = result.item;

            // If the item's ancestor is in matchedIds, skip it (since parent matched and we don't show children)
            if (item.ancestors) {
                const ancestorNames = item.ancestors.split(' > ');
                if (ancestorNames.some(name => matchedIds.has(name))) {
                    continue;
                }
            }

            // Add the item's name to matchedIds
            matchedIds.add(item.name);

            // Create result box
            const resultBox = document.createElement('div');
            resultBox.classList.add('result-box');

            resultBox.tabIndex = 0;

            // Left Side: Type and Date
            const tagElement = document.createElement('div');
            tagElement.classList.add('result-tag');
            let tagText = item.type;
            if (item.date) {
                const formattedDate = formatDate(item.date);
                tagText += ` · ${formattedDate}`;
            }
            tagElement.textContent = tagText;

            // Middle: Name with Link
            const titleElement = document.createElement('div');
            titleElement.classList.add('result-title');
            const linkElement = document.createElement('a');
            linkElement.href = item.url;
            linkElement.textContent = item.name;
            linkElement.target = '_blank'; // Open in new tab

            // Prevent click on link from bubbling up to resultBox
            linkElement.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            titleElement.appendChild(linkElement);

            // Right Side: Match Percentage
            const matchElement = document.createElement('div');
            matchElement.classList.add('result-match');
            const matchPercentage = ((1 - result.score) * 100).toFixed(1); // Calculate match percentage
            matchElement.textContent = `${matchPercentage}% match`;

            // Append elements to result box
            resultBox.appendChild(tagElement);   // Left
            resultBox.appendChild(titleElement); // Middle
            resultBox.appendChild(matchElement); // Right

            // Add click event to open the link when the result box is clicked
            resultBox.addEventListener('click', () => {
                window.open(item.url, '_blank');
            });

            // Add keydown event to handle Return (Enter) and Space keys
            resultBox.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    window.open(item.url, '_blank');
                }
            });

            // Append result box to container
            resultsContainer.appendChild(resultBox);

            displayedCount++; // Increment the count of displayed results
        }
    }

    // Function to format date to 'May 8, 2024'
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date)) {
            return dateStr; // Return original string if invalid date
        }
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    }

    // Function to generate unique IDs (if not provided in data)
    function generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }
});
