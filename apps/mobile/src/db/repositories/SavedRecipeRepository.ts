import { Database, Collection, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import { SavedRecipe } from '../models/SavedRecipe';

export class SavedRecipeRepository extends BaseRepository<SavedRecipe> {
  protected get collection(): Collection<SavedRecipe> {
    return this.db.get<SavedRecipe>('saved_recipes');
  }

  async getByHouseholdId(householdId: string): Promise<SavedRecipe[]> {
    return this.collection.query(Q.where('household_id', Q.eq(householdId))).fetch();
  }

  observeByHouseholdId(householdId: string): Observable<SavedRecipe[]> {
    return this.collection
      .query(Q.where('household_id', Q.eq(householdId)), Q.sortBy('saved_at', Q.desc))
      .observeWithColumns(['saved_at']);
  }

  async getByRecipeId(householdId: string, recipeId: string): Promise<SavedRecipe | undefined> {
    const results = await this.collection
      .query(
        Q.and(Q.where('household_id', Q.eq(householdId)), Q.where('recipe_id', Q.eq(recipeId))),
      )
      .fetch();
    return results[0];
  }

  async deleteByHouseholdId(householdId: string): Promise<void> {
    return this.db.write(async () => {
      const recipes = await this.getByHouseholdId(householdId);
      await Promise.all(recipes.map((r) => r.markAsDeleted()));
    });
  }
}
