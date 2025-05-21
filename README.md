# WikiNode

WikiNode transforms Wikipedia into an interactive graph, making it easier to explore and visualise connections between topics.

## Features

- **Interactive Exploration:** Input a Wikipedia article to visualise related topics as interconnected nodes.
- **Dynamic Expansion:** Click on nodes to delve deeper into associated articles.
- **Responsive Design:** Clean interface supporting both dark and light modes.

## Getting Started

To run WikiNode locally:

1. **Clone the Repository:**

    ```bash
    git clone https://github.com/sukhsare/WikiNode.git
    ```

2. **Navigate to the Project Directory:**

    ```bash
    cd WikiNode
    ```

3. **Open the Application:**

    Launch `index.html` in your preferred web browser.

## Technologies Used

- **JavaScript:** Core functionality and interactivity.
- **HTML & CSS:** Structure and styling.
- **Wikipedia REST API:** Fetches article data and related topics.
- **vis.js:** Renders the interactive graph.

## Testing

The project includes unit and integration tests to verify functionality:

- **Unit Tests:** Verify individual components like API functions, graph calculations, and utility functions
- **Integration Tests:** Ensure components work together correctly
- **Mock Objects:** Simulate external dependencies for reliable testing

Test files are located in the `tests` directory and follow the structure:
- `tests/unit/` - Individual component tests
- `tests/integration/` - Tests for component interactions
- `tests/mocks/` - Mock implementations of external libraries