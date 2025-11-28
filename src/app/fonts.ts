import {
  Inter,
  Montserrat,
  Roboto_Slab,
  Merriweather,
  EB_Garamond,
  Crimson_Text,
  Fira_Code,
  JetBrains_Mono,
  Orbitron,
  IM_Fell_English,
  Cinzel,
  Josefin_Sans,
  Cormorant_Garamond,
  Uncial_Antiqua,
  Grenze_Gotisch,
  Special_Elite,
  Righteous,
  Pirata_One,
  Noto_Serif_JP,
  Nunito,
  Poppins,
  Comic_Neue,
} from "next/font/google";

// --- FONT DEFINITIONS ---

// Sans-Serif
export const fontInter = Inter({ subsets: ['latin'], variable: '--font-inter' });
export const fontMontserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });
export const fontJosefin = Josefin_Sans({ subsets: ['latin'], variable: '--font-josefin' });
export const fontRighteous = Righteous({ weight: "400", subsets: ['latin'], variable: '--font-righteous' });
export const fontNunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });
export const fontPoppins = Poppins({ weight: ["400", "600"], subsets: ['latin'], variable: '--font-poppins' });
export const fontComicNeue = Comic_Neue({ weight: ["400", "700"], subsets: ['latin'], variable: '--font-comic-neue' });


// Serif
export const fontGaramond = EB_Garamond({ subsets: ['latin'], variable: '--font-garamond' });
export const fontCrimson = Crimson_Text({ weight: ["400", "600"], subsets: ['latin'], variable: '--font-crimson-text' });
export const fontMerriweather = Merriweather({ weight: ["400", "700"], subsets: ['latin'], variable: '--font-merriweather' });
export const fontRobotoSlab = Roboto_Slab({ subsets: ['latin'], variable: '--font-roboto-slab' });
export const fontCormorant = Cormorant_Garamond({ weight: ["400", "700"], subsets: ['latin'], variable: '--font-cormorant' });

// Display & Thematic
export const fontImFell = IM_Fell_English({ weight: "400", subsets: ['latin'], variable: '--font-im-fell' });
export const fontCinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });
export const fontUncial = Uncial_Antiqua({ weight: "400", subsets: ['latin'], variable: '--font-uncial' });
export const fontGrenze = Grenze_Gotisch({ subsets: ['latin'], variable: '--font-grenze' });
export const fontSpecialElite = Special_Elite({ weight: "400", subsets: ['latin'], variable: '--font-special-elite' });
export const fontPirata = Pirata_One({ weight: "400", subsets: ['latin'], variable: '--font-pirata' });
export const fontNotoSerifJP = Noto_Serif_JP({ weight: ["400", "700"], subsets: ['latin'], variable: '--font-noto-serif-jp'});

// Monospace
export const fontFiraCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });
export const fontJetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

// Sci-Fi
export const fontOrbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' });

// Combine all font class names into a single string for your layout
export const fontVariables = [
    fontInter.variable,
    fontMontserrat.variable,
    fontJosefin.variable,
    fontRighteous.variable,
    fontNunito.variable,
    fontPoppins.variable,
    fontComicNeue.variable,
    fontGaramond.variable,
    fontCrimson.variable,
    fontMerriweather.variable,
    fontRobotoSlab.variable,
    fontCormorant.variable,
    fontImFell.variable,
    fontCinzel.variable,
    fontUncial.variable,
    fontGrenze.variable,
    fontSpecialElite.variable,
    fontPirata.variable,
    fontNotoSerifJP.variable,
    fontFiraCode.variable,
    fontJetbrains.variable,
    fontOrbitron.variable
].join(" ");