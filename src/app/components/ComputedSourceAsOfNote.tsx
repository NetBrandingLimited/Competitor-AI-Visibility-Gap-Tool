type Props = {
  computedAtIso: string;
  sourceAsOfIso: string | null;
  className?: string;
};

export default function ComputedSourceAsOfNote({ computedAtIso, sourceAsOfIso, className }: Props) {
  return (
    <p className={className}>
      Computed <code>{new Date(computedAtIso).toLocaleString()}</code>; source data as of{' '}
      <code>{sourceAsOfIso ? new Date(sourceAsOfIso).toLocaleString() : 'n/a'}</code>.
    </p>
  );
}
