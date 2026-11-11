import { PageHeader } from '../../app/AppLayout';
import { Card, EmptyState } from '../../components/ui/Feedback';
import type { IconName } from '../../components/ui/Icon';

// A module whose screens are not built yet: say what it will do, never show fake data
export function ComingSoonPage({ title, text, icon }: { title: string; text: string; icon: IconName }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={icon} title="Coming in the next version" text={text} />
      </Card>
    </>
  );
}
