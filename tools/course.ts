// The Course bench: shows the Course screen alone (see course.html).
import { newJourney } from '../src/sim/journey';
import { CoursePanel } from '../src/ui/course';

const q = new URLSearchParams(location.search);
const j = newJourney(Number(q.get('seed') ?? 3), false, 'road');
const s = j.chart.systems.find((x) => x.col === Number(q.get('stop') ?? 3));
if (s) j.at = s.id;
new CoursePanel().show(j, () => {});
