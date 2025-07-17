# WikiNode

WikiNode transforms Wikipedia into an interactive graph, making it easier to explore and visualise connections between topics.

<img width="1910" height="981" alt="WikiNode Interface" src="https://github.com/user-attachments/assets/80f5f422-23e3-44fd-8cb9-f02a53e28b14" />

## Features

- **Interactive Exploration:** Input a Wikipedia article to visualise related topics as interconnected nodes
- **Dynamic Expansion:** Click on nodes to delve deeper into associated articles
- **Intelligent Filtering:** Uses Local Clustering Coefficient to surface relevant connections
- **History Management:** Full undo/redo system for seamless navigation
- **Theme Support:** Clean interface supporting both dark and light modes
- **Export Options:** Save graphs in JSON, CSV, and PNG formats
- **Performance Optimised:** Multi-level caching for fast response times

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

## Live Demo

Visit [wikinode.co.uk](http://wikinode.co.uk) to try WikiNode online.

## Technologies Used

- **JavaScript:** Core functionality and interactivity
- **HTML & CSS:** Structure and styling
- **Wikipedia REST API:** Fetches article data and related topics
- **vis.js:** Renders the interactive graph

## Architecture

WikiNode uses a modular architecture with clear separation of concerns:

```
src/
├── app.js              # Application entry point
├── config.js           # Configuration management
└── modules/
    ├── api.js          # Wikipedia API integration with caching
    ├── graph.js        # Graph processing and visualisation
    ├── search.js       # Search functionality
    ├── theme.js        # Theme management
    ├── undoManager.js  # History tracking
    └── utils.js        # Utility functions
```

## Testing

The project includes unit and integration tests to verify functionality:

- **Unit Tests:** Verify individual components like API functions, graph calculations, and utility functions
- **Integration Tests:** Ensure components work together correctly
- **Performance Tests:** Cache efficiency and response time benchmarks
- **Mock Objects:** Simulate external dependencies for reliable testing

Test files are located in the `tests` directory and follow the structure:
- `tests/unit/` - Individual component tests
- `tests/integration/` - Tests for component interactions
- `tests/mocks/` - Mock implementations of external libraries
