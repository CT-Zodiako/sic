-- Production context/menu adapters query active memberships and active menu trees.
CREATE INDEX memberships_user_id_status_starts_at_idx
  ON memberships(user_id, status, starts_at);
CREATE INDEX menu_items_status_parent_id_sort_order_idx
  ON menu_items(status, parent_id, sort_order);
