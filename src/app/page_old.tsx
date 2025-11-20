// // src/app/page.tsx

// import { redirect } from 'next/navigation';
// import { getServerSession } from 'next-auth/next'; 
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'; 
// import { repositories } from "@/engine/repositories";
// import StoryletDisplay from "@/components/StoryletDisplay";
// import { PlayerQualities, StringQualityState, PyramidalQualityState, QualityType } from "@/engine/models";
// import { loadGameData } from "@/engine/dataLoader";
// import { getPlayer, savePlayerQualities } from "@/engine/playerService";
// import { getOrCreateCharacter } from '@/engine/characterService'; 

// const newPlayerQualities: PlayerQualities = { /* ... your new player data ... */ };
// const STORY_ID = 'trader_johns_world';
// // const TEST_USER_ID = 'test_user_01'; 

// export default async function Home() {
//     const session = await getServerSession(authOptions);
//     if (!session || !session.user) {
//         redirect('/login');
//     }
//     const userId = (session.user as any).id;
//     const username = session.user.name || 'Adventurer';

//     const gameData = loadGameData();
//     repositories.initialize(gameData);

    // const character = await getOrCreateCharacter(userId, STORY_ID, username);

    // // The initial storylet is now the one saved on the character.
    // const initialStorylet = repositories.getStorylet(character.currentStoryletId);

    // if (!initialStorylet) {
    //     return <div>Error: Could not load storylet.</div>;
    // }

    // return (
    //     <main className="container">
    //         <StoryletDisplay 
    //             initialStorylet={initialStorylet} 
    //             initialQualities={character.qualities} // <-- Pass character qualities
    //             allQualities={gameData.qualities}
    //         />
    //     </main>
    // );
// }