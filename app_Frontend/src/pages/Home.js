import mbappe from '../assets/mbappe.jpg';
import haaland from '../assets/halland.jpg';
import alvarez from '../assets/alvarez.jpg';
function Home() {

    const players = [
        {
            name: "Kylian Mbappe",
            club: "Real Madrid",
            value: "€180M",
            image: mbappe
        },
        {
            name: "Erling Haaland",
            club: "Manchester City",
            value: "€170M",
            image: haaland
        },
        {
            name: "Julian Alvarez",
            club: "Atletico Madrid",
            value: "€90M",
            image: alvarez
        }
    ];

    return (
        <div className="home">
            <section className="hero">
                <h1>⚽ Football Transfer Hub</h1>
                <p>Latest transfer rumours, market values and football updates.</p>
            </section>
            <section className="featured">
                <h2>Featured Players</h2>
                <div className="player-grid">
                    {players.map((player, index) => (
                        <div className="player-card" key={index}>
                            <img
                                src={player.image}
                                alt={player.name}
                                className="player-image"
                            />
                            <h3>{player.name}</h3>
                            <p>
                                <strong>Club:</strong> {player.club}
                            </p>
                            <p>
                                <strong>Market Value:</strong> {player.value}
                            </p>
                        </div>
                    ))}
                </div>
            </section><br/><br/>
            <section className="news">
                <h2>Latest Transfer Rumours</h2>
                <div className="news-card">
                    <h2>Latest Transfer Rumours</h2>
                    <p>
                        🔥 Barcelona monitoring Julian Alvarez as a potential attacking reinforcement.
                    </p>
                    <p>
                        🔥 Manchester City remain determined to keep Erling Haaland despite interest from Europe.
                    </p>
                    <p>
                        🔥 Real Madrid preparing long-term plans around Kylian Mbappe after his arrival.
                    </p>
                </div>
            </section>

        </div>
    );
}

export default Home;