export type MapNode = {
  id: string;
  type: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  status?: string;
  metric?: string;
};

export function plottableNodes(nodes: MapNode[] | null | undefined): MapNode[] {
  return (nodes || []).filter(
    (node) => Number.isFinite(node.lat) && Number.isFinite(node.lng)
  );
}

export const MAP_NODE_COLORS: Record<string, string> = {
  donor: '#10b981',
  volunteer: '#f59e0b',
  ngo: '#3b82f6',
};

export const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];
