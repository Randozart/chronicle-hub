// src/lib/prism.ts
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

// Import our grammar objects (which are pure data)
import { scribescriptGrammar } from '@/utils/prism-scribescript';
import { ligatureGrammar } from '@/utils/prism-ligature';

// Register them
Prism.languages.scribescript = scribescriptGrammar;
Prism.languages.ligature = ligatureGrammar;

export default Prism;