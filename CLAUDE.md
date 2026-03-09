# ChronicleHub - Interactive Fiction Platform

**ChronicleHub is a modern, open-source platform for creating and playing rich, dynamic interactive fiction** - a spiritual successor to Quality-Based Narrative (QBN) systems like StoryNexus, designed for games similar to *Fallen London* or *Sunless Sea*.

## Tech Stack
- **Framework**: Next.js 16+ (App Router, React Compiler, standalone output)
- **Language**: TypeScript 5+
- **Frontend**: React 19, Tailwind CSS 4, @xyflow/react (React Flow)
- **Backend**: Node.js, Next.js Server Actions & API Routes
- **Database**: MongoDB with native driver (no ORM)
- **Authentication**: NextAuth.js with credentials provider
- **File Storage**: AWS S3 (or compatible)
- **Audio Engine**: Tone.js, @strudel/sampler, @strudel/web
- **Music Theory**: @tonaljs suite (core, key, note, scale, pcset)
- **MIDI**: @tonejs/midi for audio composition
- **Image Processing**: ag-psd for Photoshop file import

## Key Commands
- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run validate:composer` - Validate image composer script

## Directory Structure
```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (admin, worlds, platform, user)
│   │   ├── fonts.ts           # Font configuration
│   │   ├── layout.tsx         # Root layout with ClientProviders
│   │   └── page.tsx           # Dashboard (main page)
│   ├── components/            # React components (100+ files)
│   │   ├── dashboard/         # Dashboard components
│   │   ├── editor/            # Game editor components
│   │   └── game/              # Game player components
│   ├── engine/                # Core narrative engine
│   │   ├── scribescript/      # ScribeScript parser & interpreter
│   │   ├── audio/             # Ligature audio engine
│   │   ├── mechanics/         # Game mechanics (challenges, decks, etc.)
│   │   ├── lazarus/           # Legacy data import system
│   │   ├── models.ts          # Core data models (QualityType, etc.)
│   │   ├── gameEngine.ts      # Main game engine logic
│   │   ├── textProcessor.ts   # Text rendering & processing
│   │   └── worldService.ts    # World management service
│   ├── lib/                   # Utilities & configurations
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── email.ts           # Email service (Resend/Nodemailer)
│   │   └── prism.ts           # Code syntax highlighting
│   ├── providers/             # React context providers
│   ├── styles/                # Global CSS & Tailwind
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Utility functions
│   └── proxy.ts               # Development proxy configuration
├── public/                    # Static assets
├── scripts/                   # Build & validation scripts
├── docs/                      # Documentation
└── validation-output/         # Validation reports
```

## Key Architectural Decisions

### Quality-Based Narrative System
- **Qualities**: Track character stats, story flags, world states (Pyramidal, Counter, Tracker, Item, String, Equipable types)
- **ScribeScript Engine**: Domain-specific language for writers to create adaptive text, dynamic skill checks, branching logic
- **Deck-Based Opportunities**: Story cards drawn by players for emergent narratives
- **Advanced Challenges**: Soft skill checks with probability curves, margins of success, tiered outcomes

### Audio System (Ligature)
- Procedural and adaptive audio engine
- Reacts to game state changes
- Uses Tone.js and Strudel for Web Audio API integration
- Supports MIDI composition and playback

### Data Models
- **World**: Top-level container for games
- **Character**: Player characters with qualities
- **Location**: Game locations with storylets
- **Storylet**: Interactive narrative fragments
- **Deck**: Collections of opportunities
- **Quality**: Game state variables with type-specific behavior

### Authentication & Authorization
- NextAuth.js with credentials (email/password)
- Role-based access control (user, admin, system admin)
- Email whitelist system for registration
- Session management with JWT strategy

### File Storage
- AWS S3 integration for asset storage
- PSD file import support via ag-psd
- Image optimization and caching
- Audio file hosting with CORS headers

## Important File Locations
- **Entry Point**: `src/app/layout.tsx` (root layout)
- **Main Page**: `src/app/page.tsx` (dashboard)
- **API Routes**: `src/app/api/` (organized by feature)
- **Core Engine**: `src/engine/gameEngine.ts`
- **Data Models**: `src/engine/models.ts`
- **Scripting**: `src/engine/scribescript/`
- **Audio Engine**: `src/engine/audio/`
- **Authentication**: `src/lib/auth.ts`
- **Database**: `src/engine/database.ts`
- **Next Config**: `next.config.ts` (standalone output, React Compiler)

## Gotchas & Non-Obvious Patterns

### React Compiler
- Project uses React Compiler (babel-plugin-react-compiler)
- Some components marked with `'use client'` directive
- Compiler optimizations require specific patterns

### Standalone Output
- Next.js configured for `output: "standalone"`
- Production build creates `server.js` in `.next/standalone/`
- Docker deployment uses multi-stage build

### Audio CORS
- CORS headers configured for `/sounds/:path*` routes
- Required for Strudel embed iframe to fetch audio files
- Configured in `next.config.ts` headers

### Large File Uploads
- Server Actions body size limit increased to 50MB
- Required for PSD file imports and asset uploads
- Configured in `next.config.ts` experimental options

### Legacy Import System
- `lazarus/` directory contains legacy data import tools
- Used for migrating from older QBN systems
- Separate access control in `lazarusAccess.ts`

### Environment Variables
- Required: `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Optional: AWS S3 credentials, Resend API key, SMTP settings
- Development uses `.env.local` with example credentials

## Development Notes
- Uses ESM modules exclusively (no CommonJS)
- MongoDB connection via native driver (no Mongoose)
- Tailwind CSS v4 with PostCSS
- TypeScript strict mode enabled
- Docker multi-stage build with Alpine base
- Non-root user in production container for security