### Project Analysis: Mathmatico

**Mathmatico** is a React-based puzzle game powered by Vite. It combines factory automation mechanics (like Factorio or Shapez.io) with arithmetic challenges.

#### **Summary of Findings**
*   **Core Concept:** Players build a "factory" on a grid to synthesize specific target numbers.
*   **Mechanics:**
    *   **Sources:** `EXTRACTOR` buildings spawn numbers (1-9, or higher in Hard mode).
    *   **Transport:** Items move along tiles based on `Direction`.
    *   **Processing:** Math buildings (`ADDER`, `SUBTRACTOR`, `MULTIPLIER`, `DIVIDER`) take two input numbers and produce a result.
    *   **Goal:** Deliver the correct number to the `HUB` building to complete the level.
*   **Tech Stack:**
    *   **Frontend:** React (TypeScript), Vite.
    *   **Styling:** Likely CSS Modules or standard CSS (inferred from structure).
    *   **State Management:** React `useState` and `useEffect` in `App.tsx`.

#### **Key File Structure**
*   **`App.tsx`**: The main entry point containing the game loop, state management (grid, score, level), and event handling.
*   **`utils/gameLogic.ts`**: The simulation engine. It handles:
    *   `initializeGrid`: Generates the board, places the Hub, and spawns random number Extractors.
    *   `processTick`: The "heartbeat" function that moves items, executes math operations, and checks for win conditions.
*   **`types.ts`**: Defines the domain model (`BuildingType`, `Tile`, `GameState`, `Item`).
*   **`components/`**:
    *   `GridCell.tsx`: Renders individual tiles, buildings, and moving items.
    *   `Controls.tsx`: UI for selecting buildings to place.

This is a functional prototype of a logic/math game ready for further feature development or UI polishing.