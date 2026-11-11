import { PageHeader } from '../../app/AppLayout';
import { Badge, Card, EmptyState } from '../../components/ui/Feedback';
import type { IconName } from '../../components/ui/Icon';

// A page whose screens are not built yet: says what it will do and who builds it, never fake data.
// To build one: make the page in its module folder, then swap this element in app/router.tsx (list: docs/WEB-PAGES.md).
export function ComingSoonPage({ title, text, icon, by }: { title: string; text: string; icon: IconName; by: string }) {
  return (
    <>
      <PageHeader title={title} actions={<Badge tone="amber">Coming soon · {by}</Badge>} />
      <Card>
        <EmptyState icon={icon} title="Coming in the next version" text={text} />
      </Card>
    </>
  );
}
