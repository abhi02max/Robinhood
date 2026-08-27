/**
 * /problems — Topic → Pattern → Problems learning explorer.
 *
 * The legacy flat-list page is replaced by ProblemsPage (client
 * component) which fetches the structured curriculum from
 * /api/learning/topics, /api/learning/patterns/:topicId and
 * /api/learning/problems/:patternId.
 */
import ProblemsPage from './ProblemsPage';

export default function Page() {
  return <ProblemsPage />;
}

