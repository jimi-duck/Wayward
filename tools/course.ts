// The Course bench: shows the Course screen alone (see course.html).
// ?stop=3 (column to stand at)  ?seed=3  ?net=2 (the Net holds the first n stops behind)  ?de (German)
import { newJourney } from '../src/sim/journey';
import { loadDe, setLang, localize } from '../src/i18n';
import { CoursePanel } from '../src/ui/course';

const q = new URLSearchParams(location.search);
const j = newJourney(Number(q.get('seed') ?? 3), false, 'road');
const col = Number(q.get('stop') ?? 3);
const line = j.chart.systems.filter((x) => x.col >= 1 && x.col <= col).sort((a, b) => a.col - b.col);
const s = line[line.length - 1];
if (s) {
  j.at = s.id;
  j.trail = [j.chart.home, ...line.map((x) => x.id)];
  // a day and a leg record for each stop flown, so the map shows the days
  line.slice(0, -1).forEach((x, i) => j.legs.push({ system: x.id, name: x.name, day: 1 + i * 1.4, cyriteIn: 0, cyriteOut: 0, time: 0, ended: 'jumped', cards: 0, kills: 0, calloway: false, score: 0 } as never));
  j.day = line.length * 1.4;
  for (const x of line.slice(1, 1 + Number(q.get('net') ?? 0))) j.chart.net[x.id] = 1;
}
if (q.has('de')) { await loadDe(); setLang('de', false); localize(); }
new CoursePanel().show(j, () => {});
