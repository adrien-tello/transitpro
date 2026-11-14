import { useState, type FormEvent } from 'react';
import { PageHeader } from '../../app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { FormError, TextField } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { errorMessage, fieldError } from '../../lib/api';
import { useAddBranch, useBranches } from './agencies.api';

// Owner: the agency's offices. Parcels and trips go from one branch to another.
export function BranchesPage() {
  const list = useBranches();
  const add = useAddBranch();
  const toast = useToast();
  const [f, setF] = useState({ name: '', city: '', address: '' });

  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate(f, {
      onSuccess: (b) => {
        toast(`${b.city} · ${b.name} added`);
        setF({ name: '', city: '', address: '' });
      },
    });
  }

  return (
    <>
      <PageHeader title="Branches" subtitle="Your agency's offices. Parcels and trips go from one branch to another." />
      <div className="flex flex-wrap items-start gap-4">
        <Card padded={false} className="min-w-0 flex-[3_1_480px]">
          {list.isPending ? (
            <SkeletonRows rows={4} cols={3} />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : list.data.length === 0 ? (
            <EmptyState icon="building" title="No branch yet" text="Add your first office on the right." />
          ) : (
            <ul className="divide-y divide-line">
              {list.data.map((b) => (
                <li key={b.id} className="flex items-center gap-3.5 px-5 py-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary-dark">
                    <Icon name="building" size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">
                      {b.city} · {b.name}
                    </span>
                    <span className="block truncate text-[13px] text-muted">{b.address}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Add a branch" className="min-w-0 flex-[2_1_300px]">
          <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
            <TextField label="Branch name" placeholder="Mvan" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={fieldError(add.error, 'name')} />
            <TextField label="City" placeholder="Yaoundé" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} error={fieldError(add.error, 'city')} />
            <TextField label="Address" placeholder="Gare routière de Mvan" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} error={fieldError(add.error, 'address')} />
            <FormError message={add.isError && !fieldError(add.error, 'name') ? errorMessage(add.error) : null} />
            <Button type="submit" icon="plus" loading={add.isPending} disabled={f.name.trim().length < 2 || f.city.trim().length < 2 || f.address.trim().length < 3}>
              Add the branch
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
