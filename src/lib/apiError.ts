export function serverErrorResponse(error: unknown, context: string): Response {
  console.error(`[api:${context}]`, error);
  return new Response(
    JSON.stringify({ error: 'Ocurrió un error al procesar la solicitud.', code: 'INTERNAL_ERROR' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } },
  );
}
