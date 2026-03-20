import { NextResponse, type NextRequest } from "next/server";

import { isContextAllowed } from "@/lib/api/server/context";
import { getTicketFilterOptions } from "@/lib/api/server/ticketsRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ context: string }> | { context: string } };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await Promise.resolve(params);
  const context = resolvedParams.context || "";

  if (!isContextAllowed(context)) {
    return NextResponse.json(
      { detail: `Contexto '${context}' invalido para esta aplicacao.` },
      { status: 404 },
    );
  }

  try {
    const options = await getTicketFilterOptions();
    return NextResponse.json({
      ...options,
      context,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ detail: `Filter options error: ${detail}` }, { status: 500 });
  }
}
