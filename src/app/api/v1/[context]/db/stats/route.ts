import { NextResponse, type NextRequest } from "next/server";

import { isContextAllowed } from "@/lib/api/server/context";
import { getTicketStats } from "@/lib/api/server/ticketsRepository";
import { statsQuerySchema } from "@/lib/api/server/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ context: string }> | { context: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await Promise.resolve(params);
  const context = resolvedParams.context || "";

  if (!isContextAllowed(context)) {
    return NextResponse.json(
      { detail: `Contexto '${context}' invalido para esta aplicacao.` },
      { status: 404 },
    );
  }

  const queryInput = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsedQuery = statsQuerySchema.safeParse(queryInput);

  if (!parsedQuery.success) {
    return NextResponse.json(
      { detail: parsedQuery.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const stats = await getTicketStats(parsedQuery.data);
    return NextResponse.json({ ...stats, context });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ detail: `Stats error: ${detail}` }, { status: 500 });
  }
}
