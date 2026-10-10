# WAYWARD

**A dystopian space survival game about a government that will do anything to keep its power.**

*Mine. Survive. Stay off the grid.*

Humanity is ruled by the Continuance, a government that turned an emergency into permanent authority. Its citizens are scored, its resources are rationed, and every ship is tracked. The Offices of Peace deal with anyone the regime considers undesirable.

Seventy years ago, the jump lanes connecting the outer systems to the core went dark. The Continuance blamed dwindling Krail supplies, leaving millions stranded as entire sectors lost contact with one another. The remaining routes were shut down, trade collapsed, and the outer systems were left to fend for themselves.

The core survived. The Continuance tightened its grip.

But the blackout was more than a crisis. It became a way to isolate potential opposition, abandon those the government no longer valued, and purge people who might threaten its rule. The truth was buried beneath the official story.

Until now.

You stole a decommissioned Continuance ore hauler called the *Wayward*. Hidden in its systems is a sealed archive containing evidence of what really happened. The government wants its ship and its secret back.

You are not leading a revolution. You are not going to bring down the regime with a single act of defiance. You are one pilot in a battered ship, carrying something powerful people want to keep hidden.

Your first priority is survival. Get your ship ready, gather the resources you need, and get out of the system before the patrols catch you.

Then keep going.

## A galaxy under control

### The Continuance

What began as an emergency government became the authority that rules the core worlds. The Continuance controls vital resources, monitors its citizens, and decides who deserves access to the systems that keep humanity alive.

Its power does not depend on everyone believing its lies. It depends on having the means to enforce them.

### The Offices of Peace

The regime's enforcement apparatus. They deal with those deemed undesirable, from people who challenge the system to those who simply no longer fit within it.

You have already attracted their attention. They will not simply forget about you.

### The blackout

Seventy years ago, the jump lanes went dark, breaking the connections between the core and the outer systems. The Continuance blamed a shortage of Krail, the mineral essential to humanity's jump network.

The crisis became an opportunity. With the outer systems isolated and resources concentrated in the core, the Continuance could abandon entire populations and eliminate potential opposition while consolidating its grip on power.

The archive aboard the *Wayward* contains evidence that challenges the official account. What you do with that knowledge is another problem entirely.

### Life on the frontier

Beyond the core, systems struggle to survive. Trade is unreliable, resources are scarce, and every port has its own interests. Some will help you for the right price. Others may sell you out.

Not every ship is an enemy. But trust is a luxury you cannot always afford.

## Survive in a hostile galaxy

The *Wayward* is an industrial ore hauler, not a purpose-built warship. You will need to make it stronger, keep it supplied, and choose your battles carefully.

**Mine for survival.**

Break asteroids and salvage wrecks to recover Cyrite, the resource that keeps your journey going. Lasers recover the full contents of a rock, while torpedoes recover only half.

**Manage your resources.**

The ship's refinery converts Cyrite into jump fluid until the drive tank is full. Any surplus Cyrite can be spent on upgrades and supplies. Jumping consumes jump fluid, while upgrades cost Cyrite. Both matter, and neither is unlimited.

**Build a better ship.**

Visit work bays to install upgrades, improve your weapons, strengthen your defences, and prepare for increasingly dangerous encounters. Carry supplies for jumps and hull repairs, but remember that excess weight affects handling and fuel consumption.

**Choose your route.**

Plot your next jump after reaching a system. Ports, rich asteroid fields, quiet transits and contested territory offer different rewards and risks. You decide when to explore, when to trade, and when to move on.

**Deal with whoever you meet.**

Communications encounters give you a choice. Run, pay, negotiate or fight. Optional missions offer strike runs, escorts, races, surveys and smuggling jobs that can earn you Cyrite and leave their mark on your chart.

**Stay ahead of the hunt.**

The Continuance Net spreads behind you, and Prefect Calloway follows your trail. The longer you remain in one place, the closer she gets. Your ship can be repaired and upgraded, but every delay gives the authorities more time to catch up.

Work bays and region gates offer safe places to prepare. But once you leave, you are back in the open.

Your journey spans eight regions and approximately 85 stops, taking around seven hours to complete. Progress saves between systems, at ports and at region gates, so you can continue your escape across multiple sessions.

## Two ways to play

### Story Mode: Escape the Continuance

Follow the *Wayward* across the frontier, uncover the truth behind the blackout, and try to stay one step ahead of the government hunting you.

Explore unfamiliar systems, make difficult choices, improve your ship and decide what risks are worth taking. The objective is simple: survive long enough to reach the next system.

You do not need to defeat the Continuance. You just need to get away.

### Arcade Mode: Survive the waves

Forget the journey and focus on survival.

Choose a ship, weapon and defensive system, then face an endless series of increasingly dangerous encounters. Mine for Cyrite, upgrade your equipment, manage your energy and keep your hull intact.

Capital ships begin hailing you at 3:30. How long you last depends on what you build and how well you fly.

When your ship goes down, review your run and see how far you made it.

## Controls

WAYWARD supports keyboard, touch and gamepad controls. The game is designed to be played in landscape orientation.

| Action | Desktop | Touch | Gamepad |
|---|---|---|---|
| Steer | Arrow keys or A / D | Drag on the left half | Left stick or D-pad |
| Thrust | Up arrow or W | Push to open the throttle | Right trigger or D-pad up |
| Fire lasers | 1, Space or J | Hold on the right half | A |
| Fire torpedo | 2, F or K | Torpedo button | X |
| Barrel roll | Shift | Second finger on the left half | B or RB |
| Brake and reverse | Down arrow or S | Downward flick or Turn button | L3 or D-pad down |
| Open bay in Arcade | B | Upgrades badge | Back |
| Open bay in Story | Dock at a work bay | Dock at a work bay | Dock at a work bay |
| Answer communications | 1 to 6, arrows and Enter | Tap | Stick and A |
| Change camera distance | Z, - or = | Pause screen | |
| Pause | Esc or P | Pause button | Start |

Flight takes place on a flat plane. Your gunnery computer adjusts laser elevation to hit targets above or below you.

## Play WAYWARD

WAYWARD runs in desktop and mobile browsers.

To run it locally, install Node.js and npm, then run:

```sh
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To play on a phone connected to the same Wi-Fi network, run:

```sh
npm run dev:phone
```

Open the network address printed by Vite. Android enters fullscreen at launch. On iPhone, adding the game to the Home Screen provides the cleanest experience.

Choose Easy, Normal or Hard when starting Arcade Mode or a new Story journey.

Game sound is currently disabled.

## Further reading

- [Game vision and world](docs/VISION.md)
- [Economy and resources](docs/ECONOMY.md)
- [Missions](docs/MISSIONS.md)
- [Navigation and systems](docs/NAVIGATION.md)
- [HUD and interface](docs/HUD.md)
- [Development: debug flags, checks, pilots and deploy](docs/DEVELOPMENT.md)

For development and contribution guidelines, see [CLAUDE.md](CLAUDE.md).
