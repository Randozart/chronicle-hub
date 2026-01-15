// src/lib/prism.ts
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import { scribescriptGrammar } from '@/utils/prism-scribescript';
import { ligatureGrammar } from '@/utils/prism-ligature';
Prism.languages.scribescript = scribescriptGrammar;
Prism.languages.ligature = ligatureGrammar;

export default Prism;