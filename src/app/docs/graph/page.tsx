export default function GraphDocs() {
    return (
        <article>
            <h1>The Narrative Graph</h1>
            <p>A visual tool for mapping connections, debugging logic, and rapidly prototyping content.</p>

            <h2>Visualizing Flow</h2>
            <p>The graph has two modes:</p>
            <ul>
                <li><strong>Redirect Mode:</strong> Shows explicit links (e.g., "Go to Castle"). Useful for Visual Novels.</li>
                <li><strong>Quality Logic Mode:</strong> Shows implicit links. If Node A sets <code>$quest = 20</code> and Node B requires <code>$quest == 20</code>, a line is drawn. Useful for RPGs.</li>
            </ul>

            <h2>Rapid Prototyping (The Builder)</h2>
            <p>You can build your story directly inside the graph without opening the full editor.</p>
            
            <div style={{ borderLeft: '4px solid #2ecc71', paddingLeft: '1rem', margin: '2rem 0' }}>
                <h3>How to build a Chain</h3>
                <ol>
                    <li>Right-click the canvas and select <strong>New Storylet Here</strong>.</li>
                    <li>Switch to <strong>Quality Logic</strong> mode and select your driver quality (e.g. <code>$main_quest</code>).</li>
                    <li>Right-click your node and select <strong>Create Next Step (+10)</strong>.</li>
                </ol>
                <p>
                    The engine will automatically:
                    <br/>1. Create a new Storylet.
                    <br/>2. Set its requirement to <code>$main_quest &gt;= Current + 10</code>.
                    <br/>3. Add an option to your current node that sets <code>$main_quest += 10</code>.
                </p>
            </div>
        </article>
    );
}