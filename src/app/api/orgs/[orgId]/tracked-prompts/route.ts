import { NextResponse, type NextRequest } from 'next/server';

import {
  normalizeTargetSurfaces,
  TRACKED_PROMPT_TEXT_MAX,
  TRACKED_PROMPTS_MAX_PER_ORG,
  type TrackedPromptDTO
} from '@/lib/ai-visibility/measurement';
import { requireOrgRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function toDto(row: {
  id: string;
  text: string;
  label: string | null;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
  targetSurfacesJson: string;
  createdAt: Date;
  updatedAt: Date;
}): TrackedPromptDTO {
  let surfaces: ReturnType<typeof normalizeTargetSurfaces> = [];
  try {
    const parsed = JSON.parse(row.targetSurfacesJson) as unknown;
    surfaces = normalizeTargetSurfaces(parsed);
  } catch {
    surfaces = [];
  }
  return {
    id: row.id,
    text: row.text,
    label: row.label,
    category: row.category,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    targetSurfaces: surfaces,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  const rows = await prisma.trackedPrompt.findMany({
    where: { organizationId: orgId },
    orderBy: { sortOrder: 'asc' }
  });

  return NextResponse.json({
    organizationId: orgId,
    prompts: rows.map(toDto)
  });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'EDITOR');
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json().catch(() => ({}))) as {
    prompts?: Array<{
      id?: string;
      text?: string;
      label?: string | null;
      category?: string | null;
      isActive?: boolean;
      sortOrder?: number;
      targetSurfaces?: unknown;
    }>;
  };

  if (!Array.isArray(body.prompts)) {
    return NextResponse.json({ error: 'invalid_body', message: 'Expected { prompts: [...] }' }, { status: 400 });
  }
  if (body.prompts.length > TRACKED_PROMPTS_MAX_PER_ORG) {
    return NextResponse.json(
      { error: 'limit_exceeded', max: TRACKED_PROMPTS_MAX_PER_ORG },
      { status: 400 }
    );
  }

  const normalized: {
    id?: string;
    text: string;
    label: string | null;
    category: string | null;
    isActive: boolean;
    sortOrder: number;
    targetSurfacesJson: string;
  }[] = [];

  for (let i = 0; i < body.prompts.length; i++) {
    const p = body.prompts[i];
    const text = typeof p.text === 'string' ? p.text.trim() : '';
    if (text.length < 2) {
      return NextResponse.json({ error: 'invalid_prompt', index: i, message: 'text too short' }, { status: 400 });
    }
    if (text.length > TRACKED_PROMPT_TEXT_MAX) {
      return NextResponse.json({ error: 'invalid_prompt', index: i, message: 'text too long' }, { status: 400 });
    }
    const label = typeof p.label === 'string' && p.label.trim() ? p.label.trim().slice(0, 200) : null;
    const category = typeof p.category === 'string' && p.category.trim() ? p.category.trim().slice(0, 120) : null;
    const isActive = typeof p.isActive === 'boolean' ? p.isActive : true;
    const sortOrder = typeof p.sortOrder === 'number' && Number.isFinite(p.sortOrder) ? Math.floor(p.sortOrder) : i;
    const surfaces = normalizeTargetSurfaces(p.targetSurfaces);
    normalized.push({
      id: typeof p.id === 'string' && p.id.length > 0 ? p.id : undefined,
      text,
      label,
      category,
      isActive,
      sortOrder,
      targetSurfacesJson: JSON.stringify(surfaces)
    });
  }

  const existing = await prisma.trackedPrompt.findMany({
    where: { organizationId: orgId },
    select: { id: true }
  });
  const existingIds = new Set(existing.map((e) => e.id));
  const keepIds = new Set(normalized.map((n) => n.id).filter((x): x is string => Boolean(x)));

  for (const n of normalized) {
    if (n.id && !existingIds.has(n.id)) {
      return NextResponse.json({ error: 'invalid_prompt_id', id: n.id }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
    if (toDelete.length > 0) {
      await tx.trackedPrompt.deleteMany({
        where: { organizationId: orgId, id: { in: toDelete } }
      });
    }
    for (const n of normalized) {
      if (n.id) {
        await tx.trackedPrompt.update({
          where: { id: n.id },
          data: {
            text: n.text,
            label: n.label,
            category: n.category,
            isActive: n.isActive,
            sortOrder: n.sortOrder,
            targetSurfacesJson: n.targetSurfacesJson
          }
        });
      } else {
        await tx.trackedPrompt.create({
          data: {
            organizationId: orgId,
            text: n.text,
            label: n.label,
            category: n.category,
            isActive: n.isActive,
            sortOrder: n.sortOrder,
            targetSurfacesJson: n.targetSurfacesJson
          }
        });
      }
    }
  });

  const rows = await prisma.trackedPrompt.findMany({
    where: { organizationId: orgId },
    orderBy: { sortOrder: 'asc' }
  });

  return NextResponse.json({
    organizationId: orgId,
    prompts: rows.map(toDto)
  });
}
