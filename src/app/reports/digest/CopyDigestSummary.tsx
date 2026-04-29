'use client';

import CopyTextButton from '@/app/components/CopyTextButton';

type Props = {
  markdown: string;
};

export default function CopyDigestSummary({ markdown }: Props) {
  return (
    <p className="mt-12">
      <CopyTextButton
        text={markdown}
        label="Copy summary as Markdown"
        ariaLabel="Copy weekly digest summary as Markdown"
      />
    </p>
  );
}
