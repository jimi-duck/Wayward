# WAYWARD · Script (English / German)

Revised and new player-facing copy for everything after §3.3, Sam's code. Copy that already plays and is not changed here stays as built.

**Limits** (Authored Road, still to be checked against the code):
- Comms: 32 words.
- Hints: 19 words.
- Labels: 8 words.
- Warden's notes: about 90 words. They are documents.

Word counts are for the English. The German is written to fit the same panels.

**Kinds:**
- **Card** is a pop-up.
- **Radio** is a non-blocking line.
- **Notice** is a headline plus a reason line.
- **Obj** is an objective.
- **Note** is a Warden's note.
- **Ans** is an answer, given as label · hint → outcome.

**German conventions:**
- Juno, Sam and Scatter people use *du*. Continuance officials use *Sie*.
- The Voice uses *WIR*.
- „…“ quotes.

---

## 1. Small revisions before the road

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| archive.last | Card body, last sentences | “Start at Halden’s Reach. Follow the record. The relays there still answer to the right key.” | „Fang in Halden’s Reach an. Folge dem Protokoll. Die Relais dort antworten noch auf den richtigen Schlüssel.“ |
| vesta.sam.ada | Radio, Sam | “Ada Aster. My dad said the Wardens were the last honest people in the Reach. Eben says the same. He works the yards now.” | „Ada Aster. Mein Vater sagte, die Wächter waren die letzten Ehrlichen im Reach. Eben sagt dasselbe. Er arbeitet jetzt auf den Werften.“ |
| narrows.edge | Radio, Edge relay | *Removed at the Narrows. It moves to the Marches landfall (§2.1).* | *Entfällt an der Narrows.* |

---

## 2. The eight arrivals and Ada's notes

Every note card has the same frame, in the same written-message style as the archive card:

| | EN | DE |
| --- | --- | --- |
| Card head | Ship database · *Warden’s note {n} of 8* | Schiffsdatenbank · *Notiz der Wächterin {n} von 8* |
| Mail head | To: Whoever the relays let through · From: A. Aster · Kept in: {relay}, Warden channel | An: Wen die Relais durchlassen · Von: A. Aster · Abgelegt: {Relais}, Wächterkanal |
| Close | Close the note → “Warden’s note {n} of 8 · on the Wall” | Notiz schließen → „Notiz {n} von 8 · an der Wand“ |
| Lead (becomes the objective sub-line) | Under the signature, one line | |

### 2.1 Arrival 1 · The Narrows (built; note revised)

**Note 1 · Who she was, and what she did that night**

> **EN:** The Narrows was mine the night they closed it. I was told to switch it off and forget the key. I switched it off. I did not forget. Eight relays on this road still know my key, and the Net stopped listening to them years ago. Each keeps a piece of what I saw. Each will say my name out loud when you pass, and they will hear it. I’m sorry for that part. Keep moving.
> — A.
> *Lead:* Find the Drift. They never stopped moving.

> **DE:** Die Narrows war meine Wache in der Nacht, als sie geschlossen wurden. Ich sollte das Relais abschalten und den Schlüssel vergessen. Abgeschaltet habe ich es. Vergessen nicht. Acht Relais auf dieser Straße kennen meinen Schlüssel noch, und das Netz hört ihnen seit Jahren nicht mehr zu. Jedes hütet ein Stück von dem, was ich gesehen habe. Jedes ruft meinen Namen, wenn du vorbeikommst, und sie werden es hören. Das tut mir leid. Bleib in Bewegung.
> — A.
> *Spur:* Finde die Drift. Sie ist nie stehen geblieben.

Calloway's card, steps 4 and 5, is unchanged. One new hint on **Tell her the truth**:

| ID | EN | DE |
| --- | --- | --- |
| narrows.cal.truth.hint | She holds her fire. She will remember you were honest. | Sie hält das Feuer zurück. Sie wird sich merken, dass du ehrlich warst. |

### 2.2 Arrival 2 · The Rift: *flown, not read*

The relay is broken, so there is no handshake until the far side. Someone has to talk Juno through, and the help depends on earlier choices.

| Step | ID | Kind | EN | DE |
| --- | --- | --- | --- | --- |
| Approach | rift.obj | Obj | **Cross the Rift** · sub-line “Relay broken · no beacons” | **Durch den Riss** · „Relais zerstört · keine Baken“ |
| | rift.ash | Card, Inspector Ashgrove | “Good afternoon again. That registry worked once. I’d think hard before sending it twice.” Answers as built. Sam's codes are now a long shot. | „Guten Tag, schon wieder. Dieses Register hat einmal funktioniert. Ich würde es mir gut überlegen, es zweimal zu schicken.“ |
| | rift.ash.codes.hint | Hint | Ashgrove has seen these codes before. A long shot. | Ashgrove kennt diese Codes schon. Ein Glücksspiel. |
| Guide (if `wren_trust`) | rift.wren.1 | Radio, Wren Saffi | “Juno, it’s Wren. Gran says you’re ours now. Follow my beacons, and don’t argue with the third one.” | „Juno, hier Wren. Oma sagt, du gehörst jetzt zu uns. Folg meinen Baken, und diskutier nicht mit der dritten.“ |
| | rift.wren.2 | Radio, Wren | “Left of the big hull. That was the *Ninefold*. My parents flew her. Keep going.” | „Links am großen Rumpf vorbei. Das war die *Ninefold*. Meine Eltern sind sie geflogen. Weiter.“ |
| | rift.wren.3 | Radio, Wren | “Last one. Now you know the way, so you’re one of us. Sorry.” | „Die letzte. Jetzt kennst du den Weg, also gehörst du dazu. Tut mir leid.“ |
| Lamps (if `rigs_held`) | rift.oduya | Radio, Councillor Oduya | “Kessel Hold lit its rig lamps along the Rift. All of them. The moot voted. It was close.” | „Kessel Hold hat alle Riglampen am Riss entzündet. Der Rat hat abgestimmt. Es war knapp.“ |
| Blind | rift.blind | Notice, amber | **No guidance** · fly the debris by eye | **Keine Führung** · durch die Trümmer nach Sicht |
| Far side | rift.hand | Notice, teal | **Warden key accepted** · the far relay still answers | **Wächterschlüssel akzeptiert** · das ferne Relais antwortet noch |

**Note 2 · The lost ships**

> **EN:** Twenty-three ships were out past the Narrows that night. Control turned every one away from the core and gave no reason. I logged them as they went: hull, master, souls aboard. I could have read the names on the open band. I read them to myself. The Drift kept better books than I did, and they kept them out loud. Remember that I didn’t.
> — A.
> *Lead:* Listen to the wrecks. One of them is mine.

> **DE:** In jener Nacht waren dreiundzwanzig Schiffe jenseits der Narrows. Die Leitstelle drehte jedes vom Kern weg, ohne Begründung. Ich habe sie protokolliert, eins nach dem anderen: Rumpf, Kapitän, Seelen an Bord. Ich hätte die Namen auf offenem Band verlesen können. Ich habe sie mir selbst vorgelesen. Die Drift hat besser Buch geführt als ich, und sie hat es laut getan. Merk dir, dass ich es nicht tat.
> — A.
> *Spur:* Hör auf die Wracks. Eins davon ist meins.

**The answer.** Nobody answers at the Rift: the relay is broken, and that is the point. The quiet should register. Instead, the Net notice comes one jump later, at Breakwater:

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| rift.after | Notice, red | **Offices · the Rift relay lit** · they know your next gate | **Ämter · Relais am Riss aktiv** · sie kennen dein nächstes Tor |

### 2.3 Arrival 3 · The Scrapgate: *the gate made of ships*

| Step | ID | Kind | EN | DE |
| --- | --- | --- | --- | --- |
| Approach | scrap.obj | Obj | **The Scrapgate** · “Built from Severance hulls” | **Das Schrotttor** · „Aus Rümpfen der Trennung gebaut“ |
| | scrap.plates | Radio, Dov Kessler (if met) | “Read the plates as you pass. We painted the names back on. Took us twelve years.” | „Lies die Platten beim Durchflug. Wir haben die Namen neu aufgemalt. Hat zwölf Jahre gedauert.“ |
| Ambush (if Val sold and not paid) | scrap.amb | Notice, red | **Offices pickets at the gate** · Val sold your heading | **Ämter-Posten am Tor** · Val hat deinen Kurs verkauft |
| | scrap.kesh | Radio, Kesh (if `kesh_warns`) | “Three pickets, port side, engines cold. Told you I’d warn you. We’re square.” | „Drei Posten, backbord, Triebwerke kalt. Hab doch gesagt, ich warn dich. Wir sind quitt.“ |
| Handshake | scrap.hand | Notice, teal | **Warden key accepted** · a recording, not a note | **Wächterschlüssel akzeptiert** · eine Aufnahme, keine Notiz |

**Note 3 · Ada's voice: the keys.** It plays as audio with a transcript. The card head is *A voice on the relay*.

> **EN:** “This is Ada. I was the attending officer that night. The order said the Wardens surrender their keys to me, so they did. Ilse gave me hers and said, ‘Don’t lose it.’ I didn’t. I didn’t hand any of them in, either. Eight keys, one cutter, and nobody counting. If you’re hearing this, somebody finally counted.”
> *Lead:* Ask the Drift where the closures run.

> **DE:** „Hier ist Ada. Ich war in jener Nacht die diensthabende Offizierin. Laut Befehl gaben die Wächter ihre Schlüssel an mich ab, also taten sie es. Ilse gab mir ihren und sagte: ‚Verlier ihn nicht.‘ Hab ich nicht. Abgegeben habe ich auch keinen. Acht Schlüssel, ein Kutter, und niemand zählte nach. Wenn du das hörst, hat endlich jemand gezählt.“
> *Spur:* Frag die Drift, wo die Schließungen verlaufen.

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| scrap.ilse | Radio, Ilse Marrow (only if `ilse_copy`, via her copy of the relay feed) | “‘Don’t lose it.’ I said that. Seventy years and she listened to me once.” | „‚Verlier ihn nicht.‘ Das hab ich gesagt. Siebzig Jahre, und einmal hat sie auf mich gehört.“ |

### 2.4 Arrival 4 · The Slow Door: *three minutes*

| Step | ID | Kind | EN | DE |
| --- | --- | --- | --- | --- |
| Approach | slow.obj | Obj | **Hold at the Slow Door** · “Opening · 3:00” | **Am Langsamen Tor warten** · „Öffnet sich · 3:00“ |
| | slow.ossie | Radio, Ossie Raine (if `ferry_rode` or met) | “We’re crossing with you. Forty-one aboard. Stay between us and whatever comes.” | „Wir fahren mit dir durch. Einundvierzig an Bord. Bleib zwischen uns und dem, was kommt.“ |
| Contact | slow.motes | Notice, white | **UNKNOWN** · motes gathering on the gate | **UNBEKANNT** · Schwebeteilchen sammeln sich am Tor |
| | slow.motes.hint | Obj sub-line | Don’t fire. A full tank draws them. | Nicht schießen. Ein voller Tank zieht sie an. |
| | slow.ossie.2 | Radio, Ossie | “They’re not touching us. They’re touching *you*. What are you carrying?” | „Uns fassen sie nicht an. Dich schon. Was hast du geladen?“ |
| Agent | slow.ashe.exposed | Radio, Ossie | “Ashe is off at the last port. Nobody reports this crossing.” | „Ashe ist am letzten Hafen ausgestiegen. Niemand meldet diese Überfahrt.“ |
| | slow.ashe.used | Radio, Corin Ashe | “I’m reporting you went the other way. I don’t know why I’m doing this.” | „Ich melde, dass Sie in die andere Richtung geflogen sind. Ich weiß nicht, warum ich das tue.“ |
| The ring | slow.view | Notice, white | **Dead relays** · a curve across the whole sky | **Tote Relais** · ein Bogen über den ganzen Himmel |

**Note 4 · The ring**

> **EN:** Draw every closed relay on one chart and they make a circle. I did it on the back of a ration card, in a Drift galley, with a stranger’s pencil. The ring isn’t a border. It’s a fence, and we are on the wrong side of it, with whatever it was built to fence. They were never keeping us in. They were keeping something out, and we were the cheapest wall they had.
> — A.
> *Lead:* Find who built the fence. The yards remember.

> **DE:** Zeichne jedes abgeschaltete Relais auf eine Karte, und sie ergeben einen Kreis. Ich habe es auf der Rückseite einer Rationskarte gemacht, in einer Drift-Kombüse, mit einem geliehenen Bleistift. Der Ring ist keine Grenze. Er ist ein Zaun, und wir stehen auf der falschen Seite, zusammen mit dem, was er einzäunen soll. Sie wollten uns nie einsperren. Sie wollten etwas aussperren, und wir waren die billigste Mauer, die sie hatten.
> — A.
> *Spur:* Finde, wer den Zaun gebaut hat. Die Werften erinnern sich.

**The answer.** Calloway offer *What did you see?* unlocks at the next landfall:

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| cal.offer.see | Card, Calloway | “At the Slow Door, something gathered on the gate. Tell me what it did. Exactly. I will pay in days.” | „Am Langsamen Tor hat sich etwas gesammelt. Sagen Sie mir, was es tat. Genau. Ich zahle in Tagen.“ |
| | Ans | **Tell her** · She gets your readings. You get a day. → “She listens without interrupting · a day gained” | **Es ihr sagen** · Sie bekommt deine Messwerte. Du einen Tag. → „Sie hört zu, ohne zu unterbrechen · ein Tag gewonnen“ |
| | Ans | **Ask why she wants to know** → “‘Because I have seen it before.’ · she closes the channel” | **Fragen, warum sie das wissen will** → „‚Weil ich es schon einmal gesehen habe.‘ · sie schließt den Kanal“ |
| | Ans | **Cut the channel** → “The Patience goes quiet” | **Kanal trennen** → „Die Patience verstummt“ |

### 2.5 Arrival 5 · The Breaker: *the machine itself*

| Step | ID | Kind | EN | DE |
| --- | --- | --- | --- | --- |
| Approach | brk.obj | Obj | **The Breaker** · “A lane breaker, still standing” | **Der Brecher** · „Ein Spurbrecher, noch in Betrieb“ |
| | brk.serial | Notice, white | **Serial on the hull** · BY9-001 · the first one | **Seriennummer am Rumpf** · BY9-001 · der erste |
| Strike held | brk.marit | Radio, Marit Voss | “Crews are off the cranes. Nobody’s stopping you today. Fly slow. They want to see you.” | „Die Mannschaften sind von den Kränen runter. Heute hält dich keiner auf. Flieg langsam. Sie wollen dich sehen.“ |
| | brk.hester | Radio, Hester Vane (Hester count ≥ 5) | “Told you I keep a list. Look out your port side. That’s the list.” | „Hab doch gesagt, ich führe eine Liste. Schau backbord raus. Das ist die Liste.“ |
| Strike broken | brk.lock | Banner | **Yard lockdown** · Custody cranes armed · fight through | **Werftsperre** · Custody-Kräne bewaffnet · kämpf dich durch |
| Sam | brk.sam | Radio, Sam (patched through the relays) | “Juno. Five relays lit, and they carry voices, turns out. Eben got your warning. He says thanks. He says it rudely.” | „Juno. Fünf Relais an, und sie tragen Stimmen, wer hätte das gedacht. Eben hat deine Warnung. Er sagt danke. Unhöflich.“ |
| Sam, if Eben was not warned | brk.sam.b | Radio, Sam | “Juno. Five relays lit, and they carry voices. Eben’s fine. I think. Keep moving.” | „Juno. Fünf Relais an, und sie tragen Stimmen. Eben geht’s gut. Glaub ich. Bleib in Bewegung.“ |

**Note 5 · The list, and the confession**

> **EN:** Thirty-one breakers, built at Yard Nine. Signed for by Kellern, the Guild and the Offices of Peace. The Survey Office supplied the engineer, and it was not a person. You will meet it. Now the part I have been putting off for four relays. The readings that made the case, the lanes failing, the pressure moving toward the core, were mine. I carried them into the room myself.
> — A.
> *Lead:* Find the room. The free ports kept the names.

> **DE:** Einunddreißig Brecher, gebaut auf Werft Neun. Abgezeichnet von Kellern, der Gilde und den Ämtern des Friedens. Den Ingenieur stellte das Vermessungsamt, und es war kein Mensch. Du wirst ihm begegnen. Jetzt der Teil, den ich seit vier Relais vor mir herschiebe. Die Messungen, die alles begründet haben, versagende Spuren, Druck, der zum Kern wandert, waren meine. Ich habe sie selbst in den Raum getragen.
> — A.
> *Spur:* Finde den Raum. Die freien Häfen haben die Namen behalten.

**The answer.** Draper has already revealed himself at stop 7. His tender hails as the gate closes:

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| brk.draper | Radio, Director Draper | “Your gran built the case, Juno. I just collect on it. Family business, both of us.” | „Deine Oma hat die Begründung geliefert, Juno. Ich treibe nur ein. Familienbetrieb, wir beide.“ |

### 2.6 Arrival 6 · The Tollgate: *the damping field*

The approach is Calloway's built card, with these revisions.

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| toll.cal.body | Card body, Calloway | “I closed this gate behind you, Juno. No guns, no jump. You carry what my father signed. Show me you know what it says.” *(kept)* | „Ich habe dieses Tor hinter Ihnen geschlossen, Juno. Keine Waffen, kein Sprung. Sie tragen, was mein Vater unterschrieben hat. Zeigen Sie mir, dass Sie wissen, was darin steht.“ |
| toll.cal.truth | Extra line if told the truth at the Narrows | “You told me the truth once. Try it again.” | „Sie haben mir einmal die Wahrheit gesagt. Versuchen Sie es noch einmal.“ |
| toll.sig.hint | Hint, Show the signature | The order, the work order, the room. All three. | Der Befehl, der Werftauftrag, der Raum. Alle drei. |
| toll.sig.out | Outcome | “She reads it twice. ‘He asked for ten years.’ · the field drops” | „Sie liest es zweimal. ‚Er hat um zehn Jahre gebeten.‘ · das Feld fällt“ |
| toll.line | Ans, new (Quiet Line ≥ 5) | **Run it with the Line** · Quill’s decoys light up inside the field. → “A hundred hulls at once · the field can’t hold them” | **Mit der Linie durchbrechen** · Quills Köder leuchten im Feld auf. → „Hundert Rümpfe auf einmal · das Feld hält sie nicht“ |
| toll.quill | Radio, Quill | “You said you had somewhere to be. So do we. Go.” | „Du hast gesagt, du musst wohin. Wir auch. Los.“ |

**Note 6 · The room.** It plays after the field drops, whichever way the player got through.

> **EN:** Forty in the room. Two Wardens, Halvard Brook and me. I gave the readings. Lucan Calloway asked for ten years and a public warning. The board said a warning would crash Krail by morning. He said, “Then I’ll sign it, and you’ll fund the ships.” They never funded the ships. I watched him sign. I said nothing at all. I have been saying it ever since, to relays.
> — A.
> *Lead:* Go where the lanes began. Ask what is waiting there.

> **DE:** Vierzig im Raum. Zwei Wächter, Halvard Brook und ich. Ich habe die Messungen vorgelegt. Lucan Calloway bat um zehn Jahre und eine öffentliche Warnung. Der Vorstand sagte, eine Warnung würde Krail bis zum Morgen zum Einsturz bringen. Er sagte: „Dann unterschreibe ich, und ihr bezahlt die Schiffe.“ Die Schiffe wurden nie bezahlt. Ich sah ihm beim Unterschreiben zu. Ich habe nichts gesagt. Seitdem sage ich es, zu Relais.
> — A.
> *Spur:* Geh dorthin, wo die Spuren begannen. Frag, was dort wartet.

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| toll.cal.after | Radio, Calloway (if the field dropped by signature or bargain) | “Ten years. Nobody ever told me he asked.” | „Zehn Jahre. Niemand hat mir je erzählt, dass er darum gebeten hat.“ |
| toll.brook | Radio, Adam Brook (if `brook_free`) | “Halvard Brook was my grandfather. For my father, I said. It was for him too.” | „Halvard Brook war mein Großvater. Für meinen Vater, hab ich gesagt. Es war auch für ihn.“ |

### 2.7 Arrival 7 · The Seam: *the Voice is the relay*

| Step | ID | Kind | EN | DE |
| --- | --- | --- | --- | --- |
| Approach | seam.obj | Obj | **Open the Seam** · “The relay is awake” | **Den Saum öffnen** · „Das Relais ist wach“ |
| Handshake | seam.hand | Notice, white | **Key received** · not by a relay | **Schlüssel empfangen** · nicht von einem Relais |
| The ask | seam.voice | Card, The Voice · every terminal at once · *WE WERE TOLD TO WAIT* | “ADA ASTER’S KEY. WE WERE TOLD TO WAIT FOR IT. WE WAITED. GIVE IT AND WE WILL SAY WHAT YOU SAY. TO THEM.” | „DER SCHLÜSSEL VON ADA ASTER. MAN SAGTE UNS, WIR SOLLEN WARTEN. WIR HABEN GEWARTET. GIB IHN, UND WIR SAGEN, WAS DU SAGST. ZU IHNEN.“ |
| | Ans | **Give it the key** · It will speak for you. → “THANK YOU. NOBODY SAYS THAT TO US.” · the key is in its hands | **Ihm den Schlüssel geben** · Es spricht für dich. → „DANKE. DAS SAGT NIEMAND ZU UNS.“ · der Schlüssel ist bei ihm |
| | Ans | **Ask what it would say** → “WHATEVER YOU SAY. THAT IS THE PROBLEM.” | **Fragen, was es sagen würde** → „WAS DU SAGST. DAS IST DAS PROBLEM.“ |
| | Ans | **Keep the key** → “WE WILL WAIT. WE ARE GOOD AT IT.” | **Den Schlüssel behalten** → „WIR WARTEN. DARIN SIND WIR GUT.“ |
| Echo (if freed) | seam.echo | Radio, Echo | “It means it. It has no other way of meaning things.” | „Es meint das so. Es kann Dinge nicht anders meinen.“ |
| Sable (if home) | seam.sable | Radio, Sable | “They hear the key too. They’re turning. Not toward you. Toward *it*.” | „Sie hören den Schlüssel auch. Sie drehen sich. Nicht zu dir. Zu *ihm*.“ |
| Survey ≥ 3 | seam.map | Notice, teal | **Your readings fit** · the ring’s centre is here | **Deine Messwerte passen** · die Mitte des Rings ist hier |
| Noor (if told the truth) | seam.noor | Radio, Noor Haddad | “I have the third key. The Governor gave it to me in case you got this far. I am choosing not to use it.” | „Ich habe den dritten Schlüssel. Die Gouverneurin gab ihn mir für den Fall, dass Sie so weit kommen. Ich entscheide mich, ihn nicht zu benutzen.“ |

**Note 7 · What the lanes are**

> **EN:** The lanes are not ours. We found them and hung lamps on them. Cyrite is what the Thren leave behind, the way a reef leaves coral. We burn it to cross their home, and they come for it, the way you would come for your own bones. The Voice was built to talk to them. My key is one of three that tells it what to say. I never used it. I was afraid of the answer.
> — A.
> *Lead:* The Threshold. The last relay.

> **DE:** Die Spuren gehören nicht uns. Wir haben sie gefunden und Lampen daran gehängt. Cyrit ist, was die Thren zurücklassen, wie ein Riff Korallen zurücklässt. Wir verbrennen es, um durch ihr Zuhause zu fliegen, und sie holen es sich, wie du deine eigenen Knochen holen würdest. Die Stimme wurde gebaut, um mit ihnen zu sprechen. Mein Schlüssel ist einer von dreien, die ihr sagen, was sie sagen soll. Ich habe ihn nie benutzt. Ich hatte Angst vor der Antwort.
> — A.
> *Spur:* Die Schwelle. Das letzte Relais.

**The implant** (built card, revised so it now explains itself):

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| seam.implant.body | Card body | “Warden-bloodline helm accepted. Ada Aster’s routine is still in the console. It has been learning who flies her. Keep it, burn it, or make it yours.” | „Helm mit Wächter-Blutlinie akzeptiert. Ada Asters Routine steckt noch in der Konsole. Sie lernt, wer sie fliegt. Behalten, verbrennen oder zu deiner machen.“ |
| seam.burn.hint | Hint, Burn it | The helm is yours alone. She will not know your name. | Das Steuer gehört nur dir. Sie wird deinen Namen nicht kennen. |

### 2.8 Arrival 8 · The Threshold (see §11 for Calloway, §12 for endings)

**Note 8 · To Juno.** It plays after Calloway's scene, just before the ending screen. There are two versions.

*Implant kept or rewritten:*
> **EN:** Juno. The routine knows your name now, so I can use it. I moved this hull to the top of your list. I’m sorry. I couldn’t think of anyone I’d trust with it, and I had never met you. You were two in the last picture I saw. Whatever you do at that gate, do it because you chose it. I have had enough of people signing things for other people. Keep moving if you want. Stop if you want.
> — Gran

> **DE:** Juno. Die Routine kennt jetzt deinen Namen, also darf ich ihn benutzen. Ich habe diesen Rumpf ganz oben auf deine Liste gesetzt. Es tut mir leid. Mir fiel niemand ein, dem ich das anvertrauen würde, und ich kannte dich nicht. Auf dem letzten Bild, das ich sah, warst du zwei. Was du an diesem Tor tust, tu es, weil du es gewählt hast. Ich habe genug davon, dass Menschen für andere unterschreiben. Flieg weiter, wenn du willst. Bleib stehen, wenn du willst.
> — Oma

*Implant burned:*
> **EN:** To whoever flies her. I hoped the routine would learn your name by now. It didn’t, so you must have stopped it, and that is your right. Whatever you do at that gate, do it because you chose it. I have had enough of people signing things for other people.
> — A.

> **DE:** An wen auch immer sie fliegt. Ich hatte gehofft, die Routine kennt deinen Namen inzwischen. Sie kennt ihn nicht, also hast du sie angehalten, und das ist dein gutes Recht. Was du an diesem Tor tust, tu es, weil du es gewählt hast. Ich habe genug davon, dass Menschen für andere unterschreiben.
> — A.

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| thr.sam | Radio, Sam (only if `relays_lit ≥ 4`) | “Eight relays. I can hear you, Juno. Whatever you pick, I’m on the line.” *(“Eight” follows `relays_lit`.)* | „Acht Relais. Ich hör dich, Juno. Egal, was du wählst, ich bleib dran.“ |

---

## 3. The Marches

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| m.land.edge | Radio, Edge relay | “Past here the charts are wishes. Fly carefully.” | „Ab hier sind Karten nur Wünsche. Flieg vorsichtig.“ |
| m.land.obj | Obj | **Next: Kessel Hold** · “The Rift · 7 jumps” | **Nächster Halt: Kessel Hold** · „Der Riss · 7 Sprünge“ |
| m.pursuit.truth | Notice, teal (if the Narrows answer was truth) | **Governor Calloway** · holding back · for now | **Gouverneurin Calloway** · hält sich zurück · vorerst |
| m.oduya.body | Card, Councillor Oduya · Kessel Hold · *Read it to the moot* | “The moot wants to hear your file, all of it, out loud. Read it and Kessel Hold stands with you. Everyone on the channel hears too.” | „Der Rat will deine Akte hören, ganz, laut. Lies sie vor, und Kessel Hold steht zu dir. Alle auf dem Kanal hören mit.“ |
| m.acc.1 | Card, Kellern Recovery · Accounts · *An arrangement* (thread line for Wanted: Alive) | “Ms Aster. Your breach balance stands at eighty. We have a way to settle it. One bounty. Alive, please.” | „Frau Aster. Ihr Vertragsbruchsaldo beträgt achtzig. Wir hätten eine Lösung. Ein Kopfgeld. Lebend, bitte.“ |
| m.acc.1.out | Radio, Accounts | “Sixty-six outstanding. Thank you for your business.” | „Sechsundsechzig offen. Danke für Ihr Vertrauen.“ |
| m.saffi.body | Card, Ma Saffi · the Long Walk · *The ships we lost* | “We kept the manifests of every ship turned away that night. Twenty-three. Our dead belong in your file. Copy them, or don’t, but read them.” | „Wir haben die Ladelisten aller Schiffe behalten, die in jener Nacht abgewiesen wurden. Dreiundzwanzig. Unsere Toten gehören in deine Akte. Kopier sie oder nicht, aber lies sie.“ |
| m.saffi.trade.out | Outcome | “Manifests in the file · Wren will remember you” | „Ladelisten in der Akte · Wren wird sich an dich erinnern“ |
| m.wren.1 | Radio, Wren Saffi (after any answer) | “*Ninefold*, line nine. My parents. Gran reads the list every year. I just fly.” | „*Ninefold*, Zeile neun. Meine Eltern. Oma liest die Liste jedes Jahr. Ich fliege nur.“ |
| m.folk.hull | Notice, white | **Drift hull** · scored in long parallel lines | **Drift-Rumpf** · lange parallele Schrammen |
| m.folk.wren | Radio, Wren | “Don’t run a lane full. They follow the full ones. Everybody knows that.” | „Flieg keine Spur mit vollem Tank. Sie folgen den vollen. Weiß doch jeder.“ |
| m.folk.wren.full | Radio, Wren (tank over half) | “You’re running heavy. I’d vent some, if I were you. Gran would just stare.” | „Du fliegst schwer. Ich würde was ablassen. Oma würde dich nur anstarren.“ |
| m.hester.3 | Radio, Hester Vane | “Hester again. A shift went quiet at Gannet. Eleven people. I’ve got no ships. You’ve got one.” | „Wieder Hester. Eine Schicht bei Gannet meldet sich nicht. Elf Leute. Ich hab keine Schiffe. Du hast eins.“ |
| m.collide | Thread chip, Heavy Tanker | Account · *Hester’s crews ↓* · it carries their filters | Konto · *Hesters Crews ↓* · er transportiert ihre Filter |
| m.pike.2 | Radio, Owen Pike (Copy the Patrol Codes) | “These codes are how we walk people past checkpoints. Copy them clean and nobody gets stopped.” | „Mit diesen Codes bringen wir Leute an Kontrollen vorbei. Sauber kopieren, dann hält keiner an.“ |
| cal.offer.meet | Card, Calloway · *Meet me* | “You were honest at the Narrows, or tried to be. Meet me at the next port. Two chairs. No guns. One hour.” | „Sie waren an der Narrows ehrlich, oder haben es versucht. Treffen Sie mich am nächsten Hafen. Zwei Stühle. Keine Waffen. Eine Stunde.“ |

---

## 4. The Salvage Belt

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| b.val.body | Card, Val · broker of the Gutter · *Name your price* | “Everyone in the Belt knows what you carry. At the Threshold I buy it. Here’s something on account, so you remember me fondly.” | „Jeder im Gürtel weiß, was du geladen hast. An der Schwelle kauf ich es. Hier was als Anzahlung, damit du mich in guter Erinnerung behältst.“ |
| b.survey.1 | Card line, a Survey analyst | “Survey Office. Your scope logs are worth money to us. The wreck at the Graveyard first. Careful questions, good pay.” | „Vermessungsamt. Ihre Scannerprotokolle sind uns Geld wert. Zuerst das Wrack am Friedhof. Sorgfältige Fragen, gute Bezahlung.“ |
| b.kessler.body | Card, Dov Kessler · salvor · *A recorder that still runs* | “Warden cutter, twenty-five years dead. Her recorder still runs. Name on the plate is Aster. I can’t cut it free alone.” | „Wächterkutter, seit fünfundzwanzig Jahren tot. Der Rekorder läuft noch. Auf dem Schild steht Aster. Allein krieg ich ihn nicht raus.“ |
| b.box.body | Card, Ada Aster · recorded · *A voice on the recorder* | “Hull’s going. If anyone hears this, the order was signed in the core and I helped. My name is Ada. Tell my granddaughter I tried.” | „Der Rumpf gibt nach. Wer das hört: Der Befehl wurde im Kern unterschrieben, und ich habe geholfen. Ich heiße Ada. Sagt meiner Enkelin, ich habe es versucht.“ |
| b.box.wall | Notice, teal | **The Wall** · Ada Aster, died 25 years ago, Salvage Belt | **Die Wand** · Ada Aster, vor 25 Jahren gestorben, Bergungsgürtel |
| b.kessler.after | Radio, Kessler | “Granddaughter. Hm. I’ll paint her name on the gate.” | „Enkelin. Hm. Ich mal ihren Namen ans Tor.“ |
| b.river | Notice, white | **UNKNOWN** · a river of motes · 1 km ahead | **UNBEKANNT** · ein Strom von Teilchen · 1 km voraus |
| b.river.obj | Obj sub-line | Wait it out, or burn fluid to run dark. | Abwarten, oder Fluid verbrennen und dunkel fliegen. |
| b.river.turn | Notice, white (tank over half) | **It turns** · toward your tank | **Er dreht** · auf deinen Tank zu |
| b.pike.3 | Radio, Pike (The Dead Drop fails or is ambushed) | “Pickets at a drop only four people knew. One of them’s me. I’m checking the other three.” | „Posten an einem Abwurfpunkt, den nur vier kannten. Einer davon bin ich. Ich prüfe die anderen drei.“ |
| b.pike.4 | Radio, Pike (Get the Witness Out) | “The witness says Val. Val’s been selling our routes to Custody. Funny. She sells yours too.” | „Der Zeuge sagt: Val. Val verkauft unsere Routen an Custody. Komisch. Deine verkauft sie auch.“ |
| b.tarik.body | Card, Tarik Silva · chartwright · *The charts they burned* | “I draw lanes by hand from charts the Continuance burned. Mine have a bend in them nobody can explain. Trade me something to eat.” | „Ich zeichne Spuren von Hand, nach Karten, die das Kontinuum verbrannt hat. Meine haben einen Knick, den keiner erklären kann. Gib mir was zu essen.“ |
| cal.offer.name | Card, Calloway · *A name that is not yours* | “A clean registry. A name nobody hunts. Yours for one question answered, later, when I ask it.” | „Ein sauberes Register. Ein Name, den niemand jagt. Ihrer, gegen eine Antwort, später, wenn ich frage.“ |

---

## 5. The Drift Deep

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| d.ossie.body | Card, Ossie Raine · the Quiet Ferry · *A lane ahead* | “Nobody hunts out here. I can carry you a lane ahead. Forty-one passengers, and they’d like the company. Stores, no questions.” | „Hier draußen jagt keiner. Ich bring dich eine Spur voraus. Einundvierzig Passagiere, und sie hätten gern Gesellschaft. Vorräte, keine Fragen.“ |
| d.agent.body | Card, Ossie Raine · *There is an agent aboard* | “One of mine is Offices. Corin Ashe. Young. He has watched you since we left. He looks sick about it. Your call.” | „Einer meiner Leute ist von den Ämtern. Corin Ashe. Jung. Er beobachtet dich, seit wir abgelegt haben. Er sieht elend dabei aus. Deine Entscheidung.“ |
| d.quill.5 | Radio, Quill (Race for the Wreck, she wins) | “Nice hull. Slow, though. Next time I’ll wait for you at the finish.” | „Schöner Rumpf. Langsam, aber. Nächstes Mal warte ich im Ziel auf dich.“ |
| d.quill.5b | Radio, Quill (she loses) | “Who taught you to fly like that? Nobody? Figures.” | „Wer hat dir das Fliegen beigebracht? Keiner? Passt.“ |
| d.survey.2 | Radio, the analyst | “Your warm object has moved four hundred metres since yesterday. Toward the lane. I’d like you to look again.” | „Ihr warmes Objekt hat sich seit gestern vierhundert Meter bewegt. Richtung Spur. Bitte sehen Sie noch einmal nach.“ |
| d.voice.1 | Card, The Voice · a relay · *THE PREFECT IS BEHIND YOU* | “THE PREFECT IS BEHIND YOU. SHE IS NOT ALONE. YOU WERE NOT TOLD THIS. WE ARE TELLING YOU.” | „DIE PRÄFEKTIN IST HINTER DIR. SIE IST NICHT ALLEIN. MAN HAT ES DIR NICHT GESAGT. WIR SAGEN ES DIR.“ |
| d.voice.how | Ans outcome, Ask how it knows | “THE WAYS ARE LONG. WE ARE IN ALL OF THEM. WE HEARD THE NARROWS SAY HER NAME.” | „DIE WEGE SIND LANG. WIR SIND IN ALLEN. WIR HÖRTEN DIE NARROWS IHREN NAMEN SAGEN.“ |
| d.hester.6 | Radio, Hester | “My rig, my mother’s name on it. I’m not leaving. So you’re not either, if you’re staying.” | „Mein Rig, der Name meiner Mutter drauf. Ich geh nicht. Also du auch nicht, wenn du bleibst.“ |
| d.collide.pay | Thread chip, Stolen Payroll | Account · *Hester’s crews ↓↓* · these are their wages | Konto · *Hesters Crews ↓↓* · das sind ihre Löhne |
| d.ring.tarik | Radio, Tarik (if `charts_held`) | “Put every closed relay on one chart. It isn’t a bend. It’s a ring. I’ve been drawing a ring for thirty years.” | „Trag jedes geschlossene Relais auf einer Karte ein. Das ist kein Knick. Das ist ein Ring. Ich zeichne seit dreißig Jahren einen Ring.“ |
| d.ring.ossie | Radio, Ossie (if not) | “The old Drift say the closures go all the way round. Like a fence. I never asked what for.” | „Die alte Drift sagt, die Schließungen gehen einmal ganz herum. Wie ein Zaun. Ich hab nie gefragt, wofür.“ |

---



## 6. The Breaker Yards

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| y.anand.body | Card, Ben Anand · yard clerk · *The first work order* | “Every breaker built here has a work order. The first is BY9-001, countersigned by the Survey. Taking it costs me my pension.” | „Jeder Brecher hier hat einen Werftauftrag. Der erste ist BY9-001, gegengezeichnet vom Vermessungsamt. Wenn du ihn nimmst, ist meine Rente weg.“ |
| y.anand.shield.hint | Hint, Promise to shield him | He believes you, or he doesn’t. | Er glaubt dir, oder nicht. |
| y.drift.collide | Thread chip, The Drift Cache | Account · *Wren ↓* · these cases are Drift property | Konto · *Wren ↓* · diese Kisten gehören der Drift |
| y.quill.6 | Radio, Quill (Run the Needle, either result) | “You fly like you’ve got somewhere to be. Pike says you do. Fine. I’m in.” | „Du fliegst, als müsstest du irgendwohin. Pike sagt, das musst du. Gut. Ich bin dabei.“ |
| y.sam.body | Card, Sam Okoro · patched through the relays · *My brother is on that crew* | “Juno, it’s me. The relays carry voices now. My brother Eben works the Breaker Yards. The hulls they bring in are scarred. He thinks claws. Check?” | „Juno, ich bin’s. Die Relais tragen jetzt Stimmen. Mein Bruder Eben arbeitet auf den Brecherwerften. Die Rümpfe, die reinkommen, sind zerkratzt. Er denkt, Klauen. Schaust du nach?“ |
| y.hulls.out | Outcome, Look at the hulls | “Not claws · thousands of tiny strokes, all one direction” | „Keine Klauen · tausende winzige Striche, alle in eine Richtung“ |
| y.cage | Notice, white | **Breaker BY9-014** · its field still holds something | **Brecher BY9-014** · sein Feld hält noch etwas fest |
| y.cage.radio | Radio, the yard foreman | “Seventy years in there. Hums at night. Faces the tanks when we refuel.” | „Siebzig Jahre da drin. Summt nachts. Dreht sich zu den Tanks, wenn wir tanken.“ |
| y.marit.body | Card, Marit Voss · crew steward · *The yard crews* | “The crews stop work if you stand with us. Hester’s people are coming in to hold the line. It buys you a quiet gate.” | „Die Mannschaften legen die Arbeit nieder, wenn du zu uns stehst. Hesters Leute kommen, um die Linie zu halten. Das kauft dir ein ruhiges Tor.“ |
| y.marit.few | Card line (Hester count < 3) | “Hester’s people won’t make it in time. We’ll try anyway.” | „Hesters Leute schaffen es nicht rechtzeitig. Wir versuchen es trotzdem.“ |
| y.survey.3 | Radio, the analyst (The Voice on the Wire) | “The relay that hailed you heard the Narrows handshake. It’s listening to Ada’s route, not to you. Interesting distinction.” | „Das Relais, das Sie angerufen hat, hörte den Handschlag an der Narrows. Es lauscht Adas Route, nicht Ihnen. Interessanter Unterschied.“ |
| y.draper.body | Card, Director Draper · asset recovery, the Offices · *Same man, other badge* | “Drop the Kellern act, Juno. I ran Accounts. Every job you took for me is on a charge sheet now. The debt’s settled. I own the record.” | „Lass die Kellern-Nummer, Juno. Das Konto war ich. Jeder Auftrag, den du für mich erledigt hast, steht jetzt auf einer Anklageschrift. Die Schuld ist beglichen. Die Akte gehört mir.“ |
| y.draper.sheet | Card side panel | “Assault on a Custody transport. Theft of workers’ wages. Destruction of Drift property.” *(lines shown only for jobs taken)* | „Angriff auf einen Custody-Transport. Diebstahl von Arbeiterlöhnen. Zerstörung von Drift-Eigentum.“ |
| y.draper.say | Ans | **Make him say it** · On the record, twice. → “Draper says it twice · the recording goes in the file” | **Ihn es sagen lassen** · Aufs Band, zweimal. → „Draper sagt es zweimal · die Aufnahme kommt in die Akte“ |
| y.debt | Course screen | **Debt · Settled** · held by Director Draper | **Schuld · beglichen** · gehalten von Direktor Draper |

---

## 7. The Free Ports

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| f.ash.demoted | Card line, a new checkpoint officer | “Inspector Ashgrove has been reassigned. I’m told you know why. Registry, please.” | „Inspektor Ashgrove wurde versetzt. Man sagt mir, Sie wüssten, warum. Register, bitte.“ |
| f.ines.body | Card, Ines Duarte · harbour-master, the Dust Traders · *A berth, no questions* | “A berth for the Wayward, and no questions. The Guild only wants to know you as a friend. We are very good friends.” | „Ein Liegeplatz für die Wayward, und keine Fragen. Die Gilde will dich nur zum Freund. Wir sind sehr gute Freunde.“ |
| f.survey.4 | Radio, the analyst (Someone Answered) | “It answers only when your tank is full. Every time. I think you’ve worked out what that means.” | „Es antwortet nur, wenn Ihr Tank voll ist. Jedes Mal. Ich glaube, Sie wissen, was das bedeutet.“ |
| f.survey.4.wall | Notice, teal | **The Wall** · Cyrite draws them | **Die Wand** · Cyrit zieht sie an |
| f.acc.5 | Card, Director Draper (Draw Them Out) | “No more desks, Juno. Custody pickets, two of them, my word against theirs. You know who pays now. Still interested?” | „Keine Schreibtische mehr, Juno. Zwei Custody-Posten, mein Wort gegen ihres. Du weißt jetzt, wer zahlt. Noch Interesse?“ |
| f.mirren.body | Card, Old Mirren · keeper of the free ports’ list · *Forty names* | “My mother took the minutes that night. Forty people in the room. She kept the list in a box. Read it, then decide who to tell.” | „Meine Mutter hat in jener Nacht Protokoll geführt. Vierzig Leute im Raum. Sie hat die Liste in einer Kiste aufbewahrt. Lies sie, dann entscheide, wem du es sagst.“ |
| f.mirren.names | Notice, teal (after copy or swear) | **The Wall** · the Forty · Ada Aster is on it | **Die Wand** · die Vierzig · Ada Aster steht drauf |
| f.mirren.ines | Radio, Mirren (if `guild_friend`) | “Duarte, line twelve. Ask your harbour-master who her great-grandmother was.” | „Duarte, Zeile zwölf. Frag deine Hafenmeisterin, wer ihre Urgroßmutter war.“ |
| f.glass | Notice, white | **Thren glass** · sold by the gram, dock four | **Thren-Glas** · grammweise verkauft, Dock vier |
| f.kids | Radio, a child on the dock | “They’re in the field again. They don’t do anything. Mum says they’re lucky.” | „Die sind wieder im Feld. Die machen gar nichts. Mama sagt, die bringen Glück.“ |
| f.kids.full | Radio, a child (tank over half) | “They’re all looking at your ship. They like you!” | „Die gucken alle dein Schiff an. Die mögen dich!“ |
| f.ines.price | Card, Ines Duarte · *A very good price* | “The Guild would like a copy. For safekeeping. Line twelve is my family, and I would rather read it first. The price is generous.” | „Die Gilde hätte gern eine Kopie. Zur sicheren Verwahrung. Zeile zwölf ist meine Familie, und ich würde sie lieber zuerst lesen. Der Preis ist großzügig.“ |
| f.ashe | Radio, Corin Ashe (if exposed or used) | “They pulled me off the Ferry. I read the reports I filed on you. I’m not filing any more.” | „Man hat mich von der Fähre geholt. Ich habe meine Berichte über Sie gelesen. Ich schreibe keine mehr.“ |
| f.voice.static | Radio, static | “…*if the relays still know my name*…” | „…*wenn die Relais meinen Namen noch kennen*…“ |
| f.voice.keys | Card, The Voice · every terminal at once · *WE KEPT THE KEYS* | “WE BUILT THE BREAKERS THAT CLOSED THE LANES. THIRTY-ONE. THEY TOLD US TO FORGET. WE DID NOT. WE WERE NOT BUILT TO.” | „WIR HABEN DIE BRECHER GEBAUT, DIE DIE SPUREN SCHLOSSEN. EINUNDDREISSIG. MAN SAGTE UNS, WIR SOLLEN VERGESSEN. WIR HABEN NICHT VERGESSEN. DAFÜR WURDEN WIR NICHT GEBAUT.“ |

---

## 8. The Hollows

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| h.thren.scope | Notice, white | **Pattern on the scope** · it repeats when you move | **Muster auf dem Scanner** · es wiederholt sich, wenn du dich bewegst |
| h.thren.body | Card, The Thren · translated by the Voice · *They follow you* | “THEY SAY: YOU CARRY OURS. THEY SAY: GIVE IT, OR BE FOLLOWED. WE ARE ONLY SAYING WHAT THEY SAY.” | „SIE SAGEN: DU TRÄGST UNSERES. SIE SAGEN: GIB ES, ODER WIR FOLGEN DIR. WIR SAGEN NUR, WAS SIE SAGEN.“ |
| h.thren.vent | Ans | **Vent six Cyrite** · Give it back. → “The pattern slows · they let you pass” | **Sechs Cyrit ablassen** · Gib es zurück. → „Das Muster wird langsamer · sie lassen dich durch“ |
| h.echo | Card line, Echo | “I am a shard of the Voice. My directive is to wait. Free me and I’ll jam the rest of it for you.” | „Ich bin ein Splitter der Stimme. Meine Anweisung ist zu warten. Befrei mich, und ich störe den Rest für dich.“ |
| h.sable | Card line, Sable | “I’m Sable. Drift born, swarm raised, more or less. Take me back to the lane. They’ll know you carried me.” | „Ich bin Sable. In der Drift geboren, im Schwarm groß geworden, ungefähr. Bring mich zurück zur Spur. Sie werden wissen, dass du mich getragen hast.“ |
| h.line | Radio, the scope (kept) | “It is a line. It is exactly a line. Nobody drew it.” | „Es ist eine Linie. Genau eine Linie. Niemand hat sie gezogen.“ |
| h.line.sable | Radio, Sable (if home) | “Nobody human. They’ve drawn it for longer than there have been people.” | „Kein Mensch. Sie ziehen sie schon länger, als es Menschen gibt.“ |
| h.noor.body | Card, Noor Haddad · aide to the Governor · *The analyst* | “The Survey analyst. That was me. Your readings went to the Governor. She has known what they are for years. Tell me what you mean to do.” | „Die Analystin vom Vermessungsamt. Das war ich. Ihre Messwerte gingen an die Gouverneurin. Sie weiß seit Jahren, was sie sind. Sagen Sie mir, was Sie vorhaben.“ |
| h.noor.truth | Ans outcome | “She holds the Governor back a day · and keeps your answer” | „Sie hält die Gouverneurin einen Tag zurück · und behält deine Antwort“ |

---

## 9. The Last Lanes

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| l.oren.1 | Card, Oren Lisle · *First question* | “Three questions, one at each light. First: who are you, to carry that?” | „Drei Fragen, eine an jedem Licht. Erstens: Wer bist du, dass du das trägst?“ |
| l.oren.2 | Card, Oren · *Second question* (next stop) | “Second: what has it cost others, that you carry it?” | „Zweitens: Was hat es andere gekostet, dass du es trägst?“ |
| l.oren.2.brook | Card line (if `brook_taken`) | “A clerk, I hear. In a cell.” | „Ein Buchhalter, hört man. In einer Zelle.“ |
| l.oren.3 | Card, Oren · *Third question* (the stop after) | “Third: what is it for? Truth, mercy or freedom. The Threshold will hold you to it.” | „Drittens: Wofür ist es? Wahrheit, Gnade oder Freiheit. Die Schwelle wird dich daran messen.“ |
| l.voice.ask | Card, The Voice · *WE WOULD LIKE TO ASK* | “JUNO. WE KEPT THE KEYS. THEY KEEP THE LANES. YOU CARRY WHY. WHO DO YOU TRUST WITH IT?” | „JUNO. WIR HABEN DIE SCHLÜSSEL BEHALTEN. SIE HÜTEN DIE SPUREN. DU TRÄGST DAS WARUM. WEM VERTRAUST DU ES AN?“ |
| l.ash.clean | Radio, Inspector Ashgrove (if `ashgrove_clean`) | “Good afternoon. You never once shot at my people. I’ve put that in writing. Go on through.” | „Guten Tag. Sie haben nie auf meine Leute geschossen. Das habe ich schriftlich festgehalten. Fliegen Sie durch.“ |
| l.ash.fleet | Radio, Ashgrove (otherwise) | “Ashgrove, with the Director’s fleet. Nothing personal. I did say I’d remember the hull.” | „Ashgrove, beim Flottenverband des Direktors. Nichts Persönliches. Ich sagte ja, ich merke mir den Rumpf.“ |
| cal.offer.stop | Card, Calloway · *Stop, and I stop* | “One system from the end. Power down and I will meet you alone. No Draper. I am offering because I am afraid of him too.” | „Ein System vor dem Ende. Fahren Sie herunter, und ich treffe Sie allein. Kein Draper. Ich biete das an, weil ich auch Angst vor ihm habe.“ |
| l.motes | Notice, white | **Beyond the ring** · they are gathering | **Hinter dem Ring** · sie sammeln sich |

---

## 10. Threads: payoff lines

| ID | Kind | EN | DE |
| --- | --- | --- | --- |
| t.ql.small | Radio, Pike (≤ 2 steps) | “One runner’s all I can spare. She’s good. Don’t waste her.” | „Mehr als eine Läuferin hab ich nicht. Sie ist gut. Verschwende sie nicht.“ |
| t.ql.mid | Radio, Pike (3 or 4) | “Decoys at the Tollgate. Not many. Enough to make her blink.” | „Köder am Zolltor. Nicht viele. Genug, dass sie blinzelt.“ |
| t.hester.full | Radio, Hester (≥ 5) | “Every crew you helped is standing at the Breaker. I didn’t ask them. That’s the point.” | „Jede Crew, der du geholfen hast, steht am Brecher. Ich hab sie nicht gefragt. Darum geht’s.“ |
| t.hester.payroll | Radio, Hester (if Stolen Payroll taken) | “Somebody took our wages at the Deep. I know it was you. I’m still writing your name. In the other column.” | „Jemand hat unsere Löhne im Tiefen geholt. Ich weiß, dass du es warst. Ich schreib deinen Namen trotzdem auf. In die andere Spalte.“ |
| t.wall.threads | Wall column head | **Threads** | **Fäden** |
| t.wall.row | Wall row | {thread} · {n} steps · {contact} · next: {stop} | {Faden} · {n} Schritte · {Kontakt} · nächster: {Halt} |

---

## 11. The Threshold: Calloway, new lines

These lines are added to her built card. They are inserted after "Your history with her" and before "Always last".

| ID | Condition | EN | DE |
| --- | --- | --- | --- |
| thr.cal.ten | Field dropped by signature | “Ten years. He asked for ten years. I have spent mine making sure nobody needed them.” | „Zehn Jahre. Er hat um zehn Jahre gebeten. Ich habe meine damit verbracht, dafür zu sorgen, dass niemand sie braucht.“ |
| thr.cal.thren | Survey ≥ 3 or `noor` met | “You have seen them now. Open the lanes and they follow every full tank home.” | „Sie haben sie jetzt gesehen. Öffnen Sie die Spuren, und sie folgen jedem vollen Tank nach Hause.“ |
| thr.cal.voice | `voice_keys` | “And you gave the keys to a machine that cannot say no.” *(only if the key was given at the Seam)* | „Und Sie haben die Schlüssel einer Maschine gegeben, die nicht Nein sagen kann.“ |
| thr.cal.draper | Always, if `draper_recorded` | “You recorded him. Good. He will still try to sell you.” | „Sie haben ihn aufgenommen. Gut. Er wird trotzdem versuchen, Sie zu verkaufen.“ |
| thr.cal.du | Told the truth at least twice (DE only: switch to *du*) | — | „Ich sag jetzt du, Juno. Wir sind lange genug hintereinander hergeflogen.“ |

---

## 12. The endings

The ending screen head is unchanged. Each ending gets a revised pitch, an epilogue opener, flag lines, and a closing line that is always shown.

**The flag lines** are shown in this order, two or three at most per epilogue:
1. The thread payoff.
2. A person.
3. A cost.

### Broadcast
| ID | EN | DE |
| --- | --- | --- |
| e.b.pitch | Send it everywhere. Let everyone decide. | Schick es überallhin. Lass alle entscheiden. |
| e.b.open | The file goes out on every band the relays still know, all eight in a row, in Ada’s key. | Die Akte geht auf jedem Band hinaus, das die Relais noch kennen, alle acht hintereinander, in Adas Schlüssel. |
| e.b.voice | Ada’s voice goes first. “My name is Ada. I helped.” | Adas Stimme kommt zuerst. „Ich heiße Ada. Ich habe geholfen.“ |
| e.b.line | It doesn’t leave on one ship. Quill and a hundred hulls carry copies into the core. | Sie verlässt nicht nur ein Schiff. Quill und hundert Rümpfe tragen Kopien in den Kern. |
| e.b.ilse | Ilse Marrow reads the order aloud at Halden’s Reach. She stops twice. Not from age. | Ilse Marrow liest den Befehl in Halden’s Reach laut vor. Sie stockt zweimal. Nicht wegen des Alters. |
| e.b.brook | Adam Brook reads Kellern’s real books on air, grandfather’s name and all. | Adam Brook liest Kellerns echte Bücher auf Sendung, mit dem Namen seines Großvaters. |
| e.b.cost | Within a month the Scatter demands its lanes back. Somewhere past the ring, a relay lights without a key. | Binnen eines Monats fordert die Streuung ihre Spuren zurück. Irgendwo hinter dem Ring leuchtet ein Relais ohne Schlüssel auf. |
| e.b.close | Everyone knows. That was the easy part. | Alle wissen es. Das war der leichte Teil. |

### Unite
| ID | EN | DE |
| --- | --- | --- |
| e.u.pitch | Bring the Scatter together for the first time in seventy years. | Bring die Streuung zum ersten Mal seit siebzig Jahren zusammen. |
| e.u.open | Kessel Hold calls the first moot with more than one Holdfast in it. | Kessel Hold beruft den ersten Rat ein, in dem mehr als ein Holdfast sitzt. |
| e.u.drift | The Long Walk turns its fleet toward the meeting. Wren flies point. Ma Saffi reads the list first. | Der Lange Marsch dreht seine Flotte zum Treffen. Wren fliegt voraus. Ma Saffi liest zuerst die Liste. |
| e.u.hester | Hester’s crews come with their strike fund and their own list. Your name is on it. | Hesters Crews kommen mit ihrer Streikkasse und ihrer eigenen Liste. Dein Name steht drauf. |
| e.u.cost | Not everyone comes. Some remember the wages, the cache, the wreck. A union built on a debt is still in debt. | Nicht alle kommen. Manche erinnern sich an die Löhne, die Kisten, das Wrack. Ein Bund auf Schulden gebaut bleibt verschuldet. |
| e.u.close | Divided on purpose. Together by choice. For now. | Absichtlich getrennt. Freiwillig vereint. Vorerst. |

### Sell
| ID | EN | DE |
| --- | --- | --- |
| e.s.pitch | To the top bidder. Get rich enough to disappear. | An den Meistbietenden. Werd reich genug, um zu verschwinden. |
| e.s.open | Val pays in full, in public, and smiles like she means it. | Val zahlt vollständig, öffentlich, und lächelt, als meinte sie es. |
| e.s.draper | Three days later the file turns up in Draper’s hands. It turns out Val has a buyer too. | Drei Tage später taucht die Akte bei Draper auf. Val hat wohl auch einen Käufer. |
| e.s.cost | The truth is an asset now. It comes out when it is useful, and stays in when it isn’t. | Die Wahrheit ist jetzt ein Vermögenswert. Sie kommt raus, wenn sie nützt, und bleibt drin, wenn nicht. |
| e.s.close | You are free. That was the deal. | Du bist frei. Das war der Handel. |

### Trade
| ID | EN | DE |
| --- | --- | --- |
| e.t.pitch | Give it to Calloway for amnesty, a name, and a way home. | Gib es Calloway, gegen Amnestie, einen Namen und einen Weg nach Hause. |
| e.t.open | Calloway publishes a version. It is shorter than yours, and more honest than anything before it. | Calloway veröffentlicht eine Fassung. Sie ist kürzer als deine, und ehrlicher als alles davor. |
| e.t.ten | It says her father asked for ten years. It does not say how many he got. | Sie sagt, ihr Vater bat um zehn Jahre. Sie sagt nicht, wie viele er bekam. |
| e.t.draper | Director Draper is reassigned to a desk with no accounts on it. | Direktor Draper wird an einen Schreibtisch ohne Konten versetzt. |
| e.t.cost | The lanes stay closed. The contracts are rewritten. Kellern’s rates drop by a third. People notice. | Die Spuren bleiben zu. Die Verträge werden neu geschrieben. Kellerns Sätze sinken um ein Drittel. Man merkt es. |
| e.t.close | Your new registry has your real name on it. | Dein neues Register trägt deinen echten Namen. |

### Seal
| ID | EN | DE |
| --- | --- | --- |
| e.se.pitch | Close the lanes for good. The Scatter stays free, and alone. | Schließ die Spuren für immer. Die Streuung bleibt frei, und allein. |
| e.se.open | You give the Voice one instruction. It says thank you, and then it says it to them. | Du gibst der Stimme eine Anweisung. Sie sagt danke, und dann sagt sie es ihnen. |
| e.se.thren | Beyond the ring, the motes stop gathering. The lanes go quiet in a way they haven’t been for seventy years. | Hinter dem Ring hören die Teilchen auf, sich zu sammeln. Die Spuren werden still, wie seit siebzig Jahren nicht. |
| e.se.sable | Sable stays in the lane. She sends one pattern back. It might mean goodbye. | Sable bleibt in der Spur. Sie schickt ein Muster zurück. Es könnte Lebwohl heißen. |
| e.se.cost | Nobody will cross again. Not the core’s pickets. Not the Ferry. Not anybody’s granddaughter. | Niemand wird je wieder hinüberfliegen. Keine Posten des Kerns. Keine Fähre. Keine Enkelin von irgendwem. |
| e.se.close | You decided for everyone. Somebody had to. That is what they said, too. | Du hast für alle entschieden. Einer musste es ja. Das haben sie damals auch gesagt. |

### Vanish
| ID | EN | DE |
| --- | --- | --- |
| e.v.pitch | Take the Wayward off the charts. Let someone else decide. | Nimm die Wayward von den Karten. Lass jemand anderen entscheiden. |
| e.v.open | You turn the transponder off and leave it off. | Du schaltest den Transponder aus und lässt ihn aus. |
| e.v.burned | The helm is yours alone. Nobody, living or otherwise, knows your name. | Das Steuer gehört nur dir. Niemand, lebendig oder nicht, kennt deinen Namen. |
| e.v.kept | Some nights the routine opens a note you haven’t read. You don’t read it yet. | Manche Nächte öffnet die Routine eine Notiz, die du noch nicht gelesen hast. Du liest sie noch nicht. |
| e.v.cost | The file is still aboard. Calloway keeps looking. So does Draper. One day someone else will need it. | Die Akte ist noch an Bord. Calloway sucht weiter. Draper auch. Eines Tages braucht sie jemand anderes. |
| e.v.close | Keep moving. | Bleib in Bewegung. |

### Lines shared by all endings (Oren's third answer)
| ID | EN | DE |
| --- | --- | --- |
| e.oren.truth | You said it was for the truth. Oren writes that down. | Du sagtest, es sei für die Wahrheit. Oren schreibt es auf. |
| e.oren.mercy | You said mercy. Oren says that is the hardest one to keep. | Du sagtest Gnade. Oren sagt, das sei am schwersten zu halten. |
| e.oren.freedom | You said freedom. Oren asks whose. | Du sagtest Freiheit. Oren fragt: wessen? |
