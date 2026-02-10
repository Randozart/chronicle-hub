
# ChronicleHub

**ChronicleHub is a modern, open-source platform for creating and playing rich, dynamic interactive fiction.** 
It is a spiritual successor to Quality-Based Narrative (QBN) systems like StoryNexus, designed to power interactive fiction similar to those found in games like *Fallen London* or *Sunless Sea*. Our goal is to provide writers, designers, and developers with a powerful, flexible, and accessible toolset to bring their narrative-driven games to life.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub issues](https://img.shields.io/github/issues/Randozart/chronicle-hub)](https://github.com/Randozart/chronicle-hub/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/Randozart/chronicle-hub)](https://github.com/Randozart/chronicle-hub/pulls)

---

## Core Features

ChronicleHub is built from the ground up to support quality-based storytelling.

*   **ScribeScript Engine:** A scripting language designed for writers. Use it to create adaptive text, dynamic skill checks, and branching logic without leaving the editor.
*   **Quality-Based Narrative:** Track hundreds of character stats, story flags, and world states ("Qualities"). Every piece of content, from story snippets to UI elements, can react to the player's unique state.
*   **Deck-Based Opportunity System:** Create decks of story cards that are drawn by the player, enabling emergent narratives and providing a core gameplay loop.
*   **Advanced Challenge & Probability System:** Go beyond simple pass/fail. Design "soft" skill checks with customizable probability curves, margins of success, and tiered outcomes.
*   **Dynamic Theming and Layouts:** Customize the player experience with configurable layouts, themes, and component styles that can even change dynamically based on in-game events.
*   **Built-in Audio Engine (Ligature):** A procedural and adaptive audio system for composing and integrating music that reacts to the game state.
*   **Rich World-Building Tools:** Define locations, maps, shops, and a fully-integrated action economy to create a living, breathing world for your players to explore.

## Tech Stack

ChronicleHub is built on the following technology stack.

*   **Framework:** [Next.js](https://nextjs.org/) 16+ (with App Router & React Compiler)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Frontend:** [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/) 4
*   **Backend:** [Node.js](https://nodejs.org/), Next.js Server Actions & API Routes
*   **Database:** [MongoDB](https://www.mongodb.com/)
*   **Authentication:** [NextAuth.js](https://next-auth.js.org/)
*   **File Storage:** [AWS S3](https://aws.amazon.com/s3/) (or compatible)

## Getting Started

Follow these instructions to get a local instance of ChronicleHub up and running for development.

### Prerequisites

*   [Node.js](https://nodejs.org/en) (v20.x or later recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
*   [MongoDB](https://www.mongodb.com/try/download/community) instance (local or a cloud service like MongoDB Atlas)
*   [Git](https://git-scm.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Randozart/chronicle-hub.git
    cd chronicle-hub
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    Create a file named `.env.local` in the root of the project and add the following variables.

    ```ini
    # .env.local

    # MongoDB Connection String
    MONGODB_URI="mongodb://user:password@host:port/database"

    # NextAuth.js configuration
    # Generate a secret with: openssl rand -base64 32
    NEXTAUTH_SECRET="your-super-secret-key"
    NEXTAUTH_URL="http://localhost:3000"

    # Add other variables for features like email or file storage as needed
    # RESEND_API_KEY="your-resend-api-key"
    # AWS_S3_BUCKET_NAME="your-s3-bucket-name"
    # AWS_S3_REGION="your-s3-region"
    # AWS_S3_ACCESS_KEY_ID="your-access-key"
    # AWS_S3_SECRET_ACCESS_KEY="your-secret-key"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

The application should now be running at [http://localhost:3000](http://localhost:3000).

## Project Structure

The codebase is organized to separate concerns, making it easier to navigate and contribute.

```
/
├── src/
│   ├── app/                # Next.js App Router: Pages, API routes, and layouts
│   ├── components/         # Reusable React components (UI, forms, etc.)
│   ├── engine/             # The core narrative engine: ScribeScript parser, game logic, data models
│   ├── lib/                # Utility functions, database connections, auth config
│   └── styles/             # Global CSS and Tailwind configuration
├── public/                 # Static assets (images, fonts)
└── ...                     # Configuration files (next.config.ts, package.json, etc.)
```

## Contributing

We welcome contributions of all kinds! Whether you're a developer, a writer, or a designer, there are many ways to help.

To get started, please check the [open issues](https://github.com/Randozart/chronicle-hub/issues). If you have a new feature or a major change in mind, we recommend **opening an issue first** to discuss the idea with the maintainers. This helps ensure your hard work aligns with the project's goals.

## License

Chronicle Hub is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0-or-later)**.

The core implication of the AGPL is that if you modify the source code and make the modified version available to users over a network (e.g., by hosting it as a public website), you must also make your modified source code available to those users under the same license. This ensures that the community benefits from all derivative works.

You can find the full license text in the [LICENSE](LICENSE) file.

Additionally, this project includes data from caniuse-lite, which is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) license.

### Games Made with Chronicle Hub

**The AGPL-3.0 license for the engine DOES NOT apply to the games you create.**

You, the creator, are the copyright holder of your game's story, text, and assets. You are free to license your game however you wish, whether for commercial or non-commercial purposes. ChronicleHub is merely the tool. Data exported from it is subject to the Terms of Service of the platform hosting the tool. In the case of the [main ChronicleHub website](https://chroniclehubgames.com/), the following points have been included in the terms of service to further safeguard this, which can be found on the main page.

> ## 4. User Generated Content (UGC) & Intellectual Property
> 1.  **Your Ownership:** You retain full ownership and copyright of the stories, scripts, worlds, and original assets you create on ChronicleHub.
> 2.  **License Grant:** By creating or uploading content, you grant ChronicleHub a non-exclusive, worldwide, royalty-free, perpetual license to:
>     *   Host, store, and cache your content on our servers.
>     *   Display, perform, and distribute your content to users as intended by the Platform's functionality.
>     *   Format or transcode assets (e.g., resizing images) for technical display purposes.