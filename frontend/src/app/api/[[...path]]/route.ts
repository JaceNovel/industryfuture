import type { NextRequest } from "next/server";
import { handleApiRequest } from "@/lib/server/router";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

async function resolvePath(context: RouteContext) {
  const params = await Promise.resolve(context.params);
  return params.path ?? [];
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleApiRequest(request, await resolvePath(context));
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleApiRequest(request, await resolvePath(context));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleApiRequest(request, await resolvePath(context));
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleApiRequest(request, await resolvePath(context));
}