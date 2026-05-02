import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'profiles',
          columns: [{ name: 'deleted_at', type: 'number', isOptional: true }],
        }),
        addColumns({
          table: 'households',
          columns: [{ name: 'deleted_at', type: 'number', isOptional: true }],
        }),
        addColumns({
          table: 'household_members',
          columns: [
            { name: '_version', type: 'number' },
            { name: '_last_changed_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'containers',
          columns: [{ name: 'deleted_at', type: 'number', isOptional: true }],
        }),
        addColumns({
          table: 'items',
          columns: [{ name: 'deleted_at', type: 'number', isOptional: true }],
        }),
        addColumns({
          table: 'food_rules',
          columns: [
            { name: 'cloud_id', type: 'string', isIndexed: true },
            { name: '_version', type: 'number' },
            { name: '_last_changed_at', type: 'number' },
          ],
        }),
        addColumns({
          table: 'shopping_list_items',
          columns: [{ name: 'deleted_at', type: 'number', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'containers',
          columns: [{ name: 'qr_number', type: 'number', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'meal_plan_entries',
          columns: [
            { name: 'cloud_id', type: 'string', isIndexed: true },
            { name: 'household_id', type: 'string', isIndexed: true },
            { name: 'added_by_user_id', type: 'string' },
            { name: 'recipe_cloud_id', type: 'string', isOptional: true },
            { name: 'recipe_snapshot_json', type: 'string', isOptional: true },
            { name: 'planned_for_at', type: 'number', isIndexed: true },
            { name: 'meal_type', type: 'string' },
            { name: 'servings', type: 'number', isOptional: true },
            { name: 'status', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: '_version', type: 'number' },
            { name: '_last_changed_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
