import type { MenuNode } from './company-context.api';

export type RenderedMenu = { id: string; label: string; href?: string; expandable: boolean; children: RenderedMenu[] };
export const renderMenu = (nodes: MenuNode[]): RenderedMenu[] => nodes.map(node => ({
  id: node.id, label: node.label, ...(node.navigable && node.route ? { href: node.route } : {}),
  expandable: node.children.length > 0, children: renderMenu(node.children),
}));
export class RecursiveMenuComponent {
  readonly nodes: MenuNode[];
  constructor(nodes: MenuNode[]) { this.nodes = nodes; }
  render() { return renderMenu(this.nodes); }
}
