'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { membershipCanEdit } from '@/lib/roles';
import { SESSION_USER_ID_COOKIE } from '@/lib/session';
import { computeAndPersistVisibilityScoreV1 } from '@/lib/visibility/scoreV1';

export async function refreshVisibilityScoreAction(formData: FormData) {
  const organizationId = String(formData.get('organizationId') ?? '').trim();
  if (!organizationId) {
    throw new Error('organizationId required');
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_USER_ID_COOKIE)?.value?.trim();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } }
  });
  if (!membership || !membershipCanEdit(membership.role)) {
    throw new Error('Forbidden');
  }

  await computeAndPersistVisibilityScoreV1(organizationId);
  revalidatePath('/dashboard');
}
