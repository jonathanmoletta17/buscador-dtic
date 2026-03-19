import { apiDelete, apiGet, apiPost, apiPut, buildApiPath, withQuery } from "../client";

export function searchItems(context: string, itemtype: string, params: Record<string, string>) {
  return apiGet<unknown>(withQuery(buildApiPath(context, `search/${itemtype}`), params));
}

export function getItem(context: string, itemtype: string, id: number, expandDropdowns = false) {
  return apiGet<unknown>(
    withQuery(buildApiPath(context, `${itemtype}/${id}`), expandDropdowns ? { expand_dropdowns: true } : undefined),
  );
}

export function getSubItems(context: string, itemtype: string, id: number, subItemtype: string) {
  return apiGet<unknown[]>(buildApiPath(context, `${itemtype}/${id}/${subItemtype}`));
}

export function listItems(context: string, itemtype: string, rangeStart = 0, rangeEnd = 49, expandDropdowns = false) {
  return apiGet<unknown[]>(
    withQuery(buildApiPath(context, itemtype), {
      range_start: rangeStart,
      range_end: rangeEnd,
      expand_dropdowns: expandDropdowns || undefined,
    }),
  );
}

export function createItem(context: string, itemtype: string, input: Record<string, unknown>) {
  return apiPost<unknown, { input: Record<string, unknown> }>(buildApiPath(context, itemtype), { input });
}

export function updateItem(context: string, itemtype: string, id: number, input: Record<string, unknown>) {
  return apiPut<unknown, { input: Record<string, unknown> }>(buildApiPath(context, `${itemtype}/${id}`), { input });
}

export function deleteItem(context: string, itemtype: string, id: number) {
  return apiDelete<unknown>(buildApiPath(context, `${itemtype}/${id}`));
}
